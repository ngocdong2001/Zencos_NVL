/**
 * AI Agentic Chat Route
 * ─────────────────────
 * POST /api/ai/chat
 *
 * Sử dụng Ollama (OpenAI-compatible API) để xử lý ngôn ngữ tự nhiên
 * và thực thi các "tool" trực tiếp trên database qua Prisma.
 *
 * ── Cách thêm tool mới ────────────────────────────────────────────────
 * 1. Khai báo tool definition vào mảng `TOOLS` (mô tả cho LLM biết khi nào gọi).
 * 2. Thêm case vào hàm `executeTool` (logic thực thi thực sự).
 * 3. Cập nhật system prompt nếu cần hướng dẫn thêm cho LLM.
 *
 * Tool naming convention: <action>_<resource>
 *   VD: add_product, list_products, create_customer, add_sale_payment ...
 * ─────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express'
import OpenAI from 'openai'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama', // Ollama không cần key thật, nhưng SDK bắt buộc có giá trị
})

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b'

type ActionTaken = {
  tool: string
  args: unknown
  result: unknown
}

type ProductCandidate = {
  id: string
  code: string
  name: string
  sellPrice: unknown
  costPrice: unknown
  score: number
}

type FallbackToolCall = {
  tool: string
  args: Record<string, unknown>
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function normalizeForIntent(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

function normalizeSearchText(text: string): string {
  return normalizeForIntent(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toWordTokens(text: string): string[] {
  return normalizeSearchText(text)
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 0)
}

function buildBigrams(text: string): string[] {
  const compact = normalizeSearchText(text).replace(/\s+/g, ' ')
  if (compact.length < 2) return compact ? [compact] : []
  const grams: string[] = []
  for (let index = 0; index < compact.length - 1; index += 1) {
    grams.push(compact.slice(index, index + 2))
  }
  return grams
}

function bigramSimilarity(left: string, right: string): number {
  const leftGrams = buildBigrams(left)
  const rightGrams = buildBigrams(right)
  if (leftGrams.length === 0 || rightGrams.length === 0) return 0

  const rightPool = [...rightGrams]
  let matches = 0
  for (const gram of leftGrams) {
    const matchIndex = rightPool.indexOf(gram)
    if (matchIndex >= 0) {
      matches += 1
      rightPool.splice(matchIndex, 1)
    }
  }

  return (2 * matches) / (leftGrams.length + rightGrams.length)
}

function scoreCandidate(query: string, productName: string, productCode: string): number {
  const normalizedQuery = normalizeSearchText(query)
  const normalizedName = normalizeSearchText(productName)
  const normalizedCode = normalizeSearchText(productCode)
  if (!normalizedQuery) return 0

  if (normalizedCode === normalizedQuery) return 1
  if (normalizedName === normalizedQuery) return 0.99
  if (normalizedCode.includes(normalizedQuery)) return 0.96
  if (normalizedName.includes(normalizedQuery)) return 0.92

  const queryTokens = toWordTokens(query)
  const nameTokens = new Set(toWordTokens(productName))
  const tokenMatches = queryTokens.filter(token => nameTokens.has(token)).length
  const tokenScore = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0
  const fuzzyScore = Math.max(
    bigramSimilarity(normalizedQuery, normalizedName),
    bigramSimilarity(normalizedQuery, normalizedCode),
  )

  return Math.max(tokenScore * 0.75, fuzzyScore * 0.9)
}

async function findProductCandidates(query: string, limit = 5): Promise<ProductCandidate[]> {
  const tokens = toWordTokens(query)
  const prefilter = tokens.slice(0, 3)
  console.log('🔍 findProductCandidates - query:', query, 'tokens:', tokens)

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(prefilter.length > 0
        ? {
            OR: prefilter.flatMap(token => [
              { name: { contains: token } },
              { code: { contains: token } },
            ]),
          }
        : {}),
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      sellPrice: true,
      costPrice: true,
    },
  })
  console.log('   Found', products.length, 'products in prefilter')

  const scored = products
    .map(product => ({
      ...product,
      score: scoreCandidate(query, product.name, product.code),
    }))
    .filter(product => {
      console.log(`     ${product.code}: "${product.name}" score=${product.score.toFixed(3)}`)
      return product.score >= 0.35
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
  
  console.log(`   Returning ${scored.length} candidates with score >= 0.35`)
  return scored
}

async function resolveProductReference(input: { id?: string; code?: string; name?: string }) {
  if (input.id || input.code) {
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        ...(input.id ? { id: input.id } : {}),
        ...(input.code ? { code: input.code } : {}),
      },
      include: { variants: { where: { deletedAt: null } } },
    })

    if (product) {
      return { product, candidates: [] as ProductCandidate[] }
    }
  }

  if (!input.name) {
    return { product: null, candidates: [] as ProductCandidate[] }
  }

  const candidates = await findProductCandidates(input.name, 5)
  
  // ALWAYS return candidates for user to explicitly choose from (never auto-select)
  // This ensures user confirmsthe operation before it executes
  if (candidates.length > 0) {
    return { product: null, candidates }
  }

  // No candidates found at all
  return { product: null, candidates: [] as ProductCandidate[] }
}

function extractCodeReference(message: string): string | undefined {
  const rawMatch = message.match(/\bma\s+([A-Za-z0-9_-]+)/i)
  if (rawMatch?.[1]) return rawMatch[1].trim()

  const normalized = normalizeSearchText(message)
  const normalizedMatch = normalized.match(/\bma\s+([a-z0-9_-]+)/i)
  return normalizedMatch?.[1]?.trim()
}

function inferFallbackToolCall(message: string): FallbackToolCall | null {
  const normalized = normalizeSearchText(message)
  const code = extractCodeReference(message)

  // NOTE: update_product field detection is handled by classifyUpdateIntent() (AI-based).
  // This function handles only delete and info lookups.

  const deleteMatch = normalized.match(/xoa\s+(?:san pham|mat hang)?\s*(.+)/)
  if (deleteMatch) {
    return {
      tool: 'delete_product',
      args: {
        ...(code ? { code } : {}),
        ...(!code ? { name: deleteMatch[1].trim() } : {}),
      },
    }
  }

  const infoMatch = normalized.match(/(?:xem thong tin|thong tin|xem|tim)\s+(?:san pham|mat hang)?\s*(.+)/)
  if (infoMatch) {
    return {
      tool: 'get_product',
      args: {
        ...(code ? { code } : {}),
        ...(!code ? { name: infoMatch[1].trim() } : {}),
      },
    }
  }

  return null
}

// ── AI-based update field classifier ────────────────────────────────
// Reads available fields directly from the update_product TOOLS definition
// so new fields added to TOOLS are automatically discoverable.
function getUpdateProductFields(): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTools = TOOLS as any[]
  const updateTool = allTools.find(t => t.type === 'function' && t.function?.name === 'update_product')
  const props = (updateTool?.function?.parameters?.properties ?? {}) as Record<string, { description?: string }>
  const skipFields = new Set(['id', 'code', 'targetName'])
  return Object.fromEntries(
    Object.entries(props)
      .filter(([key]) => !skipFields.has(key))
      .map(([key, prop]) => [key, prop.description ?? key]),
  )
}

// Call LLM with schema field descriptions to decide which field the user wants to update.
async function classifyUpdateIntent(message: string): Promise<FallbackToolCall | null> {
  const normalized = normalizeSearchText(message)
  if (!/(?:doi|cap nhat|sua)\s+.+\s+thanh\s+\d+/.test(normalized)) return null

  const fields = getUpdateProductFields()
  const fieldList = Object.entries(fields)
    .map(([key, desc]) => `${key}: ${desc}`)
    .join('\n')
  const code = extractCodeReference(message)

  try {
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'user',
          content:
            `Người dùng nói: "${message}"\n\n` +
            `Các trường sản phẩm có thể cập nhật:\n${fieldList}\n\n` +
            `Người dùng muốn cập nhật trường nào? Tên sản phẩm là gì? Giá trị mới là bao nhiêu?\n` +
            `Trả lời bằng JSON (không giải thích): {"field": "<tên trường>", "productName": "<tên sp>", "value": <số>}`,
        },
      ],
      temperature: 0,
    })

    const content = response.choices[0].message.content ?? ''
    console.log('🤖 classifyUpdateIntent raw response:', content)

    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as { field?: string; productName?: string; value?: unknown }
    console.log('🤖 classifyUpdateIntent parsed:', parsed)

    if (!parsed.field || !fields[parsed.field] || parsed.value === undefined) return null

    return {
      tool: 'update_product',
      args: {
        ...(code ? { code } : {}),
        ...(!code && parsed.productName ? { targetName: String(parsed.productName) } : {}),
        [parsed.field]: Number(parsed.value),
      },
    }
  } catch (err) {
    console.warn('⚠️  classifyUpdateIntent failed, falling back to regex:', err)
    return null
  }
}

// Unified resolver: AI for update field detection, regex for delete/get
async function resolveToolCall(message: string): Promise<FallbackToolCall | null> {
  const normalized = normalizeSearchText(message)
  const isUpdateWithValue = /(?:doi|cap nhat|sua)\s+.+\s+thanh\s+\d+/.test(normalized)
  if (isUpdateWithValue) {
    const aiResult = await classifyUpdateIntent(message)
    if (aiResult) return aiResult
  }
  return inferFallbackToolCall(message)
}

function looksLikeMutationRequest(message: string): boolean {
  const normalized = normalizeForIntent(message)
  return /(sua|cap\s*nhat|doi\s*gia|xoa|them|tao\s*moi|chinh\s*sua)/i.test(normalized)
}

// Tìm xem user đang chọn sản phẩm nào từ danh sách gợi ý
function extractProductSelection(message: string, candidates: ProductCandidate[]): ProductCandidate | null {
  if (candidates.length === 0) return null
  
  const normalized = normalizeSearchText(message)
  
  // Match "thứ 1", "1", "chọn 1", "cái thứ nhất", etc.
  const indexMatch = normalized.match(/(?:thu|so|chon|so thu|thu|cai thu)\s*(\d+)|^(\d+)$/)
  if (indexMatch) {
    const idx = Number(indexMatch[1] || indexMatch[2]) - 1
    if (idx >= 0 && idx < candidates.length) return candidates[idx]
  }
  
  // Match product name từ gợi ý
  for (const candidate of candidates) {
    const candidateName = normalizeSearchText(candidate.name)
    const candidateCode = normalizeSearchText(candidate.code)
    if (candidateName.includes(normalized) || candidateCode.includes(normalized)) {
      return candidate
    }
  }
  
  return null
}

// Lấy tất cả candidates từ history (từ messages gần nhất có tool results)
function extractPendingCandidates(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): { candidates: ProductCandidate[]; originalIntent: string } | null {
  // Tìm từ cuối history về trước
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const result = JSON.parse(msg.content) as Record<string, unknown>
        const candidates = result.candidates as unknown
        if (Array.isArray(candidates) && candidates.length > 0) {
          const cands = candidates as ProductCandidate[]
          // Tìm user message tương ứng (thường là message trước đó hoặc vài messages trước)
          let originalIntent = ''
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            if (messages[j]?.role === 'user' && typeof messages[j]?.content === 'string') {
              originalIntent = messages[j].content as string
              break
            }
          }
          return { candidates: cands, originalIntent }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return null
}

function summarizeActions(actions: ActionTaken[]): string | undefined {
  if (actions.length === 0) return undefined

  const last = actions[actions.length - 1]
  const result = asRecord(last.result)
  if (!result) return undefined

  if (typeof result.error === 'string' && result.error.trim()) {
    if (Array.isArray(result.candidates) && result.candidates.length > 0) {
      const suggestions = result.candidates
        .slice(0, 5)
        .map((candidate, idx) => {
          const item = asRecord(candidate)
          return `${idx + 1}. ${String(item?.name ?? '')} (${String(item?.code ?? '')}) - Giá: ${String(item?.sellPrice ?? 0)}`
        })
        .join('\n')
      return `Tìm thấy nhiều sản phẩm gần đúng. Bạn muốn chọn:\n${suggestions}\n\nChỉ cần nói "chọn 1", "chọn 2", v.v... hoặc nhắc lại tên sản phẩm bạn muốn.`
    }
    return `Khong thuc hien duoc yeu cau: ${result.error}`
  }

  if (last.tool === 'update_product' && result.success === true) {
    const product = asRecord(result.product)
    if (!product) return 'Da cap nhat san pham thanh cong.'
    return `✓ Da cap nhat san pham ${String(product.name ?? '')} (${String(product.code ?? '')}). Gia nhap: ${String(product.costPrice ?? '')}, gia ban: ${String(product.sellPrice ?? '')}.`
  }

  if (last.tool === 'add_product' && result.success === true) {
    const product = asRecord(result.product)
    if (!product) return 'Da them san pham thanh cong.'
    return `✓ Da them san pham ${String(product.name ?? '')} (${String(product.code ?? '')}) thanh cong.`
  }

  if (last.tool === 'delete_product' && result.success === true) {
    const deleted = asRecord(result.deleted)
    if (!deleted) return 'Da xoa san pham thanh cong.'
    return `✓ Da xoa san pham ${String(deleted.name ?? '')} (${String(deleted.code ?? '')}).`
  }

  if (last.tool === 'get_product' && result.success === true) {
    const product = asRecord(result.product)
    if (!product) return 'Da tim thay san pham.'
    return `✓ Tim thay san pham ${String(product.name ?? '')} (${String(product.code ?? '')}), gia ban: ${String(product.sellPrice ?? '')}.`
  }

  if (last.tool === 'get_product' && Array.isArray(result.candidates) && result.candidates.length > 0) {
    const suggestions = result.candidates
      .slice(0, 5)
      .map((candidate, idx) => {
        const item = asRecord(candidate)
        return `${idx + 1}. ${String(item?.name ?? '')} (${String(item?.code ?? '')}) - Giá: ${String(item?.sellPrice ?? 0)}`
      })
      .join('\n')
    return `Tìm thấy nhiều sản phẩm gần đúng. Bạn muốn chọn:\n${suggestions}\n\nChỉ cần nói "chọn 1", "chọn 2", v.v... hoặc nhắc lại tên sản phẩm bạn muốn.`
  }

  if (last.tool === 'list_products') {
    const products = Array.isArray(result.products) ? result.products : []
    return `Da tim thay ${products.length} san pham phu hop.`
  }

  if (result.success === true) return '✓ Da thuc hien thao tac thanh cong.'
  return undefined
}

// ── Hệ thống prompt ───────────────────────────────────────────────────
// Cập nhật đây khi mở rộng thêm tool để LLM biết phạm vi chức năng.
const SYSTEM_PROMPT = `Bạn là trợ lý AI cho hệ thống quản lý kinh doanh AI Biz.
Bạn có thể thực hiện các thao tác hàng hóa:
- Thêm sản phẩm (add_product)
- Tra cứu danh sách (list_products)
- Lấy thông tin một sản phẩm (get_product)
- Sửa thông tin sản phẩm và đơn giá (update_product)
- Xóa sản phẩm (delete_product)

Quy tắc QUAN TRỌNG:
- Khi user đề cập tên sản phẩm, LUÔN gọi get_product/update_product/delete_product để hệ thống tìm chính xác.
- Nếu hệ thống trả về nhiều gợi ý (candidates), hãy liệt kê rõ ràng và yêu cầu user xác nhận: "Bạn muốn chọn sản phẩm nào?"
- Khi user chọn:
  * "Cái thứ 1" / "Thứ nhất" → Chọn sản phẩm đầu tiên
  * "Cái thứ 2" / "Sản phẩm thứ hai" → Chọn sản phẩm thứ hai  
  * Hoặc nếu user nhắc lại tên sản phẩm, tìm trong danh sách gợi ý
- TUYỆT ĐỐI không báo thành công nếu chưa nhận được xác nhận từ hệ thống (success: true).
- Sau khi tool chạy thành công, tóm tắt kết quả rõ ràng (mã hàng, tên hàng, giá mới nếu có).
- Trả lời tiếng Việt, ngắn gọn, chuyên nghiệp.`

// ── Tool definitions (khai báo cho LLM) ──────────────────────────────
// Mỗi tool là một function definition theo chuẩn OpenAI/Ollama.
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  // ── PRODUCT TOOLS ────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'add_product',
      description: 'Thêm một mặt hàng mới vào danh mục hàng hóa',
      parameters: {
        type: 'object',
        properties: {
          code:      { type: 'string', description: 'Mã hàng hóa, phải là duy nhất trong hệ thống' },
          name:      { type: 'string', description: 'Tên hàng hóa' },
          costPrice: { type: 'number', description: 'Giá nhập (cost price). Mặc định 0 nếu không cung cấp' },
          sellPrice: { type: 'number', description: 'Giá bán (selling price). Mặc định 0 nếu không cung cấp' },
          alertQty:  { type: 'number', description: 'Ngưỡng cảnh báo tồn kho thấp. Mặc định 0' },
        },
        required: ['code', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_products',
      description: 'Tìm kiếm và liệt kê các mặt hàng hiện có trong danh mục, chấp nhận tên gần đúng hoặc mã gần đúng',
      parameters: {
        type: 'object',
        properties: {
          q:     { type: 'string', description: 'Từ khóa tìm kiếm theo tên hàng (tùy chọn)' },
          limit: { type: 'number', description: 'Số lượng kết quả tối đa trả về. Mặc định 5' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Lấy thông tin chi tiết của một sản phẩm theo id, code hoặc tên gần đúng; nếu mơ hồ thì trả về các gợi ý gần nhất',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID sản phẩm (ưu tiên nếu có)' },
          code: { type: 'string', description: 'Mã sản phẩm (ưu tiên nếu có)' },
          name: { type: 'string', description: 'Tên sản phẩm gần đúng khi chưa rõ mã, có thể không dấu hoặc sai nhẹ' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Cập nhật thông tin sản phẩm như tên, giá nhập, giá bán, cảnh báo tồn, trạng thái',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID sản phẩm' },
          code: { type: 'string', description: 'Mã sản phẩm' },
          targetName: { type: 'string', description: 'Tên sản phẩm hiện tại hoặc tên gần đúng để xác định đúng mặt hàng cần sửa' },
          name: { type: 'string', description: 'Tên mới của sản phẩm' },
          costPrice: { type: 'number', description: 'Giá nhập mới' },
          sellPrice: { type: 'number', description: 'Giá bán mới' },
          alertQty: { type: 'number', description: 'Ngưỡng cảnh báo tồn mới' },
          isActive: { type: 'boolean', description: 'Trạng thái hoạt động của sản phẩm' },
          description: { type: 'string', description: 'Mô tả sản phẩm' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_product',
      description: 'Xóa mềm sản phẩm khỏi danh mục theo id hoặc code',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID sản phẩm' },
          code: { type: 'string', description: 'Mã sản phẩm' },
          name: { type: 'string', description: 'Tên sản phẩm hiện tại hoặc tên gần đúng để xác định mặt hàng cần xóa' },
        },
      },
    },
  },

  // ── THÊM TOOL MỚI Ở ĐÂY ─────────────────────────────────────────
  // Ví dụ mở rộng (bỏ comment để kích hoạt):
  //
  // {
  //   type: 'function',
  //   function: {
  //     name: 'add_customer',
  //     description: 'Thêm khách hàng mới vào hệ thống',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         code:  { type: 'string', description: 'Mã khách hàng (duy nhất)' },
  //         name:  { type: 'string', description: 'Tên khách hàng' },
  //         phone: { type: 'string', description: 'Số điện thoại (tùy chọn)' },
  //         email: { type: 'string', description: 'Email (tùy chọn)' },
  //       },
  //       required: ['code', 'name'],
  //     },
  //   },
  // },
]

// ── Tool executor (logic thực thi) ────────────────────────────────────
// Nhận tên tool + args từ LLM, trả về kết quả dạng JSON cho LLM tiêu hóa.
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  auth: { permissions: string[] },
): Promise<unknown> {
  const canReadProducts = auth.permissions.includes('products.read')
  const canWriteProducts = auth.permissions.includes('products.write')

  // ── PRODUCT ──────────────────────────────────────────────────────
  if (name === 'add_product') {
    if (!canWriteProducts) return { error: 'Bạn không có quyền thêm sản phẩm.' }

    const { code, name: pName, costPrice = 0, sellPrice = 0, alertQty = 0 } = args as {
      code: string
      name: string
      costPrice?: number
      sellPrice?: number
      alertQty?: number
    }
    if (!code || !pName) return { error: 'Thiếu mã hoặc tên sản phẩm.' }

    const existing = await prisma.product.findFirst({ where: { code, deletedAt: null } })
    if (existing) return { error: `Mã hàng "${code}" đã tồn tại trong hệ thống.` }

    const cost = toFiniteNumber(costPrice) ?? 0
    const sell = toFiniteNumber(sellPrice) ?? 0
    const alert = toFiniteNumber(alertQty) ?? 0

    const product = await prisma.product.create({
      data: { code, name: pName, costPrice: cost, sellPrice: sell, alertQty: alert, isActive: true },
    })
    return { success: true, product }
  }

  if (name === 'list_products') {
    if (!canReadProducts) return { error: 'Bạn không có quyền xem sản phẩm.' }

    const { q, limit = 5 } = args as { q?: string; limit?: number }
    const size = Math.max(1, Math.min(Number(limit) || 5, 50))
    if (!q) {
      const data = await prisma.product.findMany({
        where: { deletedAt: null },
        take: size,
        orderBy: { createdAt: 'desc' },
      })
      return { products: data }
    }

    const candidates = await findProductCandidates(q, size)
    const data = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
              ],
            }
          : {}),
      },
      take: size,
      orderBy: { createdAt: 'desc' },
    })
    const merged = [...candidates, ...data.map(product => ({ ...product, score: scoreCandidate(q, product.name, product.code) }))]
      .reduce<Array<Record<string, unknown>>>((accumulator, product) => {
        if (accumulator.some(item => item.id === product.id)) return accumulator
        accumulator.push(product as Record<string, unknown>)
        return accumulator
      }, [])
      .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
      .slice(0, size)

    return { products: merged }
  }

  if (name === 'get_product') {
    if (!canReadProducts) return { error: 'Bạn không có quyền xem sản phẩm.' }

    const { id, code, name: qName } = args as { id?: string; code?: string; name?: string }
    if (!id && !code && !qName) {
      return { error: 'Cần ít nhất id, code hoặc name để tìm sản phẩm.' }
    }

    const { product, candidates } = await resolveProductReference({ id, code, name: qName })

    if (!product) {
      return {
        error: candidates.length > 0 ? 'Tim thay nhieu ket qua gan dung, can chon lai san pham.' : 'Không tìm thấy sản phẩm phù hợp.',
        candidates,
      }
    }
    return { success: true, product }
  }

  if (name === 'update_product') {
    if (!canWriteProducts) return { error: 'Bạn không có quyền sửa sản phẩm.' }

    const {
      id,
      code,
      targetName,
      name: newName,
      costPrice,
      sellPrice,
      alertQty,
      isActive,
      description,
    } = args as {
      id?: string
      code?: string
      targetName?: string
      name?: string
      costPrice?: number
      sellPrice?: number
      alertQty?: number
      isActive?: boolean
      description?: string
    }

    console.log('📝 update_product called with:', { id, code, targetName, newName, costPrice, sellPrice, alertQty, isActive, description })

    if (!id && !code && !targetName) return { error: 'Cần id, code hoặc tên gần đúng để cập nhật sản phẩm.' }

    const { product: existing, candidates } = await resolveProductReference({ id, code, name: targetName })
    console.log('🔍 Found existing product:', existing ? { id: existing.id, name: existing.name, code: existing.code } : null)
    
    if (!existing) {
      return {
        error: candidates.length > 0 ? 'Chua xac dinh duoc dung san pham can cap nhat.' : 'Không tìm thấy sản phẩm để cập nhật.',
        candidates,
      }
    }

    const data: Record<string, unknown> = {}
    if (typeof newName === 'string' && newName.trim()) data.name = newName.trim()
    if (costPrice !== undefined) {
      const parsed = toFiniteNumber(costPrice)
      if (parsed === undefined || parsed < 0) return { error: 'Giá nhập không hợp lệ.' }
      data.costPrice = parsed
    }
    if (sellPrice !== undefined) {
      const parsed = toFiniteNumber(sellPrice)
      if (parsed === undefined || parsed < 0) return { error: 'Giá bán không hợp lệ.' }
      data.sellPrice = parsed
    }
    if (alertQty !== undefined) {
      const parsed = toFiniteNumber(alertQty)
      if (parsed === undefined || parsed < 0) return { error: 'Alert qty không hợp lệ.' }
      data.alertQty = parsed
    }
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (description !== undefined) data.description = description

    console.log('📊 Data to update:', data)

    if (Object.keys(data).length === 0) {
      return { error: 'Không có trường nào hợp lệ để cập nhật.' }
    }

    const product = await prisma.product.update({ where: { id: existing.id }, data })
    console.log('✅ Product updated successfully:', { id: product.id, name: product.name, sellPrice: product.sellPrice })
    return { success: true, product }
  }

  if (name === 'delete_product') {
    if (!canWriteProducts) return { error: 'Bạn không có quyền xóa sản phẩm.' }

    const { id, code, name: targetName } = args as { id?: string; code?: string; name?: string }
    console.log('🗑️  delete_product called with:', { id, code, targetName })
    
    if (!id && !code && !targetName) return { error: 'Cần id, code hoặc tên gần đúng để xóa sản phẩm.' }

    const { product: existing, candidates } = await resolveProductReference({ id, code, name: targetName })
    console.log('🔍 Found existing product for deletion:', existing ? { id: existing.id, name: existing.name, code: existing.code } : null)
    
    if (!existing) {
      return {
        error: candidates.length > 0 ? 'Chua xac dinh duoc dung san pham can xoa.' : 'Không tìm thấy sản phẩm để xóa.',
        candidates,
      }
    }

    await prisma.product.update({ where: { id: existing.id }, data: { deletedAt: new Date() } })
    console.log('✅ Product deleted successfully:', { id: existing.id, name: existing.name })
    return { success: true, deleted: { id: existing.id, code: existing.code, name: existing.name } }
  }

  // ── THÊM CASE MỚI Ở ĐÂY ─────────────────────────────────────────
  // if (name === 'add_customer') {
  //   const { code, name: cName, phone, email } = args as { ... }
  //   ...
  //   return { success: true, customer }
  // }

  return { error: `Tool "${name}" chưa được implement.` }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { message, history = [], pendingCandidates = null } = req.body as {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
    pendingCandidates?: ProductCandidate[] | null
  }

  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  const actionsTaken: ActionTaken[] = []
  const auth = { permissions: req.auth?.permissions ?? [] }
  const preflightToolCall = await resolveToolCall(message)

  // ── STEP 1: Check if user is confirming a product selection ──
  if (pendingCandidates && pendingCandidates.length > 0) {
    console.log('🔍 STEP 1: Checking product confirmation... Message:', message)
    const selected = extractProductSelection(message, pendingCandidates)
    console.log('🎯 Selected product:', selected ? { id: selected.id, name: selected.name, code: selected.code } : null)
    
    if (selected) {
      // User xác nhận sản phẩm từ danh sách gợi ý
      // Tìm original intent từ history (message trước đó của user)
      let originalIntent = ''
      if (history.length >= 2) {
        // history[-2] là message trước của user (bỏ qua assistant response)
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].role === 'user') {
            originalIntent = history[i].content
            break
          }
        }
      }
      console.log('📝 Original intent:', originalIntent)
      
      const originalToolCall = originalIntent ? await resolveToolCall(originalIntent) : null
      console.log('🛠️  Original tool call:', originalToolCall)
      
      if (originalToolCall) {
        // Re-run tool với product ID/code đã xác nhận
        // Build clean args without fuzzy matching fields
        const cleanArgs: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(originalToolCall.args)) {
          // Skip fuzzy matching fields, keep actual data fields
          if (key !== 'targetName' && key !== 'name') {
            cleanArgs[key] = value
          }
        }
        
        // Add confirmed product reference
        cleanArgs.id = selected.id
        cleanArgs.code = selected.code
        
        console.log('🔄 Updated args to execute:', JSON.stringify(cleanArgs))
        
        const result = await executeTool(originalToolCall.tool, cleanArgs, auth)
        console.log('✅ Tool result:', JSON.stringify(result))
        actionsTaken.push({ tool: originalToolCall.tool, args: cleanArgs, result })
        
        const toolSummary = summarizeActions(actionsTaken)
        res.json({
          reply: toolSummary ?? `✓ Da thuc hien thao tac cho san pham ${selected.name}`,
          actions: actionsTaken,
        })
        return
      }
    }
  }

  // ── STEP 2: Check for obvious patterns from message ──
  if (preflightToolCall && ['get_product', 'update_product', 'delete_product'].includes(preflightToolCall.tool)) {
    const result = await executeTool(preflightToolCall.tool, preflightToolCall.args, auth)
    actionsTaken.push({ tool: preflightToolCall.tool, args: preflightToolCall.args, result })
    res.json({
      reply: summarizeActions(actionsTaken) ?? 'Da thuc hien thao tac thanh cong.',
      actions: actionsTaken,
    })
    return
  }

  // ── STEP 3: Agentic loop ──
  // Xây dựng messages array với system prompt + history (10 turns gần nhất) + user message mới
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  // Vòng lặp agentic: LLM → gọi tool → trả kết quả về LLM → LLM trả lời cuối
  // Tối đa 5 rounds để tránh vòng lặp vô hạn
  for (let round = 0; round < 5; round++) {
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    })

    const msg = response.choices[0].message
    messages.push(msg)

    // Không có tool call → LLM đã trả lời xong
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const fallbackToolCall = await resolveToolCall(message)
      const hasWriteAction = actionsTaken.some(action => ['add_product', 'update_product', 'delete_product'].includes(action.tool))

      if (fallbackToolCall && (!hasWriteAction || fallbackToolCall.tool === 'get_product')) {
        const shouldExecuteFallback =
          actionsTaken.length === 0
          || (looksLikeMutationRequest(message) && !hasWriteAction && fallbackToolCall.tool !== 'get_product')

        if (shouldExecuteFallback) {
          const result = await executeTool(fallbackToolCall.tool, fallbackToolCall.args, auth)
          actionsTaken.push({ tool: fallbackToolCall.tool, args: fallbackToolCall.args, result })
        }
      }

      const toolSummary = summarizeActions(actionsTaken)
      const modelText = typeof msg.content === 'string' ? msg.content : ''
      const hasToolCallLikeText = /"(add_product|update_product|delete_product|get_product|list_products)"/.test(modelText)
      const requireStrictConfirmation = looksLikeMutationRequest(message) || hasToolCallLikeText
      const fallbackMutationWarning = requireStrictConfirmation
        ? 'Chua co thay doi du lieu duoc xac nhan tu he thong. Vui long cung cap ma san pham de toi thuc hien chinh xac.'
        : null

      res.json({
        reply: toolSummary ?? fallbackMutationWarning ?? modelText,
        actions: actionsTaken,
      })
      return
    }

    // Có tool call → execute và feed kết quả lại vào context
    for (const call of msg.tool_calls) {
      if (call.type !== 'function') continue
      const fn = (call as { id: string; function: { name: string; arguments: string } }).function
      const args = JSON.parse(fn.arguments) as Record<string, unknown>
      const result = await executeTool(fn.name, args, auth)
      actionsTaken.push({ tool: fn.name, args, result })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  res.status(500).json({ error: 'AI agent loop limit reached' })
})

export default router
