import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = 'http://localhost:5180'
const screenshotDir = path.resolve('docs/quick-guide/screenshots')
const highlightOutputFile = path.resolve('docs/quick-guide/screenshot-highlights.json')

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

const screens = [
  {
    file: '01-overview.png',
    path: '/overview',
    waits: ['text=Tổng quan hệ thống', 'text=Tạo Phiếu Nhập'],
    highlights: [
      { selector: 'button:has-text("Tạo Phiếu Nhập")', note: 'Tạo phiếu nhanh' },
      { selector: 'text=Tổng Giá Trị Tồn Kho', note: 'Khu vực KPI' },
    ],
  },
  {
    file: '02-warehouse-nvl.png',
    path: '/warehouse',
    waits: ['text=Danh sách Tồn kho (FEFO)', 'text=Sắp hết hạn'],
    highlights: [
      { selector: 'button:has-text("Xuất Excel")', note: 'Xuất báo cáo' },
      { selector: '.filter-section', note: 'Bộ lọc vận hành' },
    ],
  },
  {
    file: '03-warehouse-tp.png',
    path: '/fg-warehouse',
    waits: ['text=Tồn kho Thành phẩm (FEFO)', 'text=CẬN HẠN (<60D)'],
    highlights: [
      { selector: 'button:has-text("Xuất Excel")', note: 'Xuất báo cáo' },
      { selector: '.filter-section', note: 'Bộ lọc theo ngày' },
    ],
  },
  {
    file: '04-purchase-shortage.png',
    path: '/purchase',
    waits: ['text=Yêu cầu mua hàng và Thiếu hụt', 'text=Danh sách nguyên vật liệu'],
    prepare: async (page) => {
      await page.click('button:has-text("Yêu cầu mua hàng & Thiếu hụt")')
      await page.waitForTimeout(500)
    },
    highlights: [
      { selector: 'h2:has-text("Yêu cầu mua hàng và Thiếu hụt")', note: 'Màn hình thống kê thiếu hụt' },
      { selector: 'h3:has-text("Danh sách nguyên vật liệu")', note: 'Bảng thống kê nguyên liệu thiếu hụt' },
      { selector: 'h3:has-text("Soạn nhanh yêu cầu mua hàng (PO)")', note: 'Khu vực tạo nhanh PO' },
    ],
  },
  {
    file: '04-purchase-po-list.png',
    path: '/purchase',
    waits: ['text=Danh sách Phiếu PO', 'text=Tạo phiếu PO mới'],
    prepare: async (page) => {
      await page.click('button:has-text("Danh sách Phiếu PO")')
      await page.waitForTimeout(500)
    },
    highlights: [
      { selector: 'h2:has-text("Danh sách Phiếu PO")', note: 'Bảng kê phiếu PO' },
      { selector: 'button:has-text("Tạo phiếu PO mới")', note: 'Tạo phiếu mới' },
      { selector: 'table', note: 'Danh sách và trạng thái phiếu' },
    ],
  },
  {
    file: '04-purchase-order.png',
    path: '/purchase',
    waits: [
      'h2:has-text("Soạn thảo Đơn mua hàng")',
      'h3:has-text("Thông tin chung")',
      'h3:has-text("Danh mục nguyên liệu")',
    ],
    prepare: async (page) => {
      await page.click('button:has-text("Danh sách Phiếu PO")')
      await page.waitForTimeout(500)
      const editBtn = page.locator('button[aria-label*="Sửa PO"]').first()
      if (await editBtn.count()) {
        await editBtn.click({ force: true })
      } else {
        await page.click('button:has-text("Tạo phiếu PO mới")')
      }
      await page.waitForSelector('h2:has-text("Soạn thảo Đơn mua hàng")', { timeout: 15000 })
      await page.waitForTimeout(500)
    },
    highlights: [
      { selector: 'h3:has-text("Thông tin chung")', note: 'Nhập thông tin chung' },
      { selector: 'h3:has-text("Danh mục nguyên liệu")', note: 'Nhập dòng nguyên liệu' },
      { selector: 'button:has-text("Lưu bản nháp")', note: 'Lưu phiếu sau khi nhập' },
    ],
  },
  {
    file: '05-inbound-list.png',
    path: '/inbound',
    waits: ['text=Danh sách Phiếu Nhập kho', 'text=Tạo phiếu mới'],
    highlights: [
      { selector: 'button:has-text("Tạo phiếu mới")', note: 'Tạo phiếu nhập mới' },
      { selector: '.filter-block', note: 'Bộ lọc danh sách' },
    ],
  },
  {
    file: '06-inbound-step1.png',
    path: '/inbound/new',
    waits: ['text=Nhập Kho (Material Import)', 'text=Tiếp tục Bước 2'],
    highlights: [
      { selector: 'text=Nhập Kho (Material Import)', note: 'Thông tin bước 1' },
      { selector: 'button:has-text("Tiếp tục Bước 2")', note: 'Đi tiếp bước 2' },
    ],
  },
  {
    file: '07-outbound-list.png',
    path: '/outbound',
    waits: ['text=Tạo lệnh mới', 'text=Quản lý và tra cứu các lệnh xuất kho đã tạo'],
    highlights: [
      { selector: 'button:has-text("Tạo lệnh mới")', note: 'Tạo lệnh mới' },
      { selector: '.inbound-filter-grid', note: 'Bộ lọc xuất kho' },
    ],
  },
  {
    file: '08-production-list.png',
    path: '/production',
    waits: ['text=Tạo lệnh mới', 'text=Sản phẩm đầu ra'],
    highlights: [
      { selector: 'button:has-text("Tạo lệnh mới")', note: 'Tạo lệnh sản xuất' },
      { selector: '.inbound-filter-grid', note: 'Bộ lọc sản xuất' },
    ],
  },
  {
    file: '09-production-step1.png',
    path: '/production/new',
    waits: ['text=Phiếu sản xuất', 'text=Tạo phiếu & Tiếp tục'],
    highlights: [
      { selector: 'text=Thông tin chung Phiếu', note: 'Thông tin phiếu' },
      { selector: 'button:has-text("Tạo phiếu & Tiếp tục")', note: 'Tạo và đi tiếp' },
    ],
  },
  {
    file: '10-production-bom.png',
    path: '/production-bom/new',
    waits: ['text=Tạo phiếu định mức sản xuất', 'text=Lưu bản nháp'],
    highlights: [
      { selector: 'text=Tạo phiếu định mức sản xuất', note: 'Thông tin định mức' },
      { selector: 'button:has-text("Lưu bản nháp")', note: 'Lưu định mức' },
    ],
  },
  {
    file: '11-tp-outbound.png',
    path: '/tp-outbound',
    waits: ['text=Tạo lệnh mới', 'text=Khách hàng'],
    highlights: [
      { selector: 'button:has-text("Tạo lệnh mới")', note: 'Tạo lệnh mới' },
      { selector: '.inbound-filter-grid', note: 'Bộ lọc xuất kho TP' },
    ],
  },
  {
    file: '12-catalog.png',
    path: '/catalog',
    waits: ['text=Quản lý Danh mục (Catalogs)', 'text=Import Excel'],
    highlights: [
      { selector: 'button:has-text("Import Excel")', note: 'Nhập dữ liệu' },
      { selector: 'text=Quản lý Danh mục (Catalogs)', note: 'Khu vực danh mục' },
    ],
  },
  {
    file: '13-opening-stock.png',
    path: '/opening-stock',
    waits: ['text=Khai báo tồn kho đầu kỳ', 'text=Tạo mã NVL mới'],
    highlights: [
      { selector: 'button:has-text("Tạo mã NVL mới")', note: 'Tạo mã nhanh' },
      { selector: 'table', note: 'Bảng tồn đầu kỳ' },
    ],
  },
  {
    file: '14-stock-transfer.png',
    path: '/stock-transfer/new',
    waits: ['text=Chuyển kho nội bộ', 'text=Xác nhận chuyển hàng'],
    highlights: [
      { selector: 'text=Chuyển kho nội bộ', note: 'Thông tin phiếu chuyển' },
      { selector: 'button:has-text("Xác nhận chuyển hàng")', note: 'Xác nhận phiếu' },
    ],
  },
  {
    file: '15-users.png',
    path: '/admin/users',
    waits: ['text=Quản lý người dùng', 'text=Tạo tài khoản'],
    highlights: [
      { selector: 'button:has-text("Tạo tài khoản")', note: 'Tạo tài khoản' },
      { selector: 'table', note: 'Danh sách người dùng' },
    ],
  },
  {
    file: '16-role-permissions.png',
    path: '/admin/role-permissions',
    waits: ['text=Phân quyền theo vai trò', 'text=Chức năng / Hành động'],
    highlights: [
      { selector: 'text=Phân quyền theo vai trò', note: 'Tiêu đề phân quyền' },
      { selector: 'table', note: 'Ma trận quyền' },
    ],
  },
  {
    file: '17-profile.png',
    path: '/profile',
    waits: ['text=Thông tin cá nhân', 'text=Đổi mật khẩu'],
    highlights: [
      { selector: 'text=Thông tin cá nhân', note: 'Cập nhật hồ sơ' },
      { selector: 'text=Đổi mật khẩu', note: 'Đổi mật khẩu' },
    ],
  },
]

function clampBox(box, viewport) {
  const x = Math.max(0, Math.floor(box.x))
  const y = Math.max(0, Math.floor(box.y))
  const w = Math.max(40, Math.floor(Math.min(box.width, viewport.width - x)))
  const h = Math.max(30, Math.floor(Math.min(box.height, viewport.height - y)))
  return { x, y, w, h }
}

async function getHighlightRegions(page, items) {
  const viewport = page.viewportSize() ?? { width: 1920, height: 1080 }
  const regions = []
  let index = 1
  for (const item of (items ?? [])) {
    const locator = page.locator(item.selector).first()
    const visible = await locator.isVisible().catch(() => false)
    if (!visible) continue
    const box = await locator.boundingBox().catch(() => null)
    if (!box) continue
    const padded = {
      x: box.x - 8,
      y: box.y - 8,
      width: box.width + 16,
      height: box.height + 16,
    }
    const clamped = clampBox(padded, viewport)
    regions.push({ ...clamped, n: index, note: item.note })
    index += 1
  }
  return regions
}

async function waitAny(page, waits, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (const item of waits) {
      const loc = page.locator(item).first()
      if (await loc.isVisible().catch(() => false)) return
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`Timeout waiting for: ${waits.join(' OR ')}`)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})

const page = await context.newPage()
const highlightMap = {}

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#login-email', { timeout: 20000 })
  await page.screenshot({ path: path.join(screenshotDir, '00-login.png'), fullPage: false })
  highlightMap['00-login.png'] = await getHighlightRegions(page, [
    { selector: '#login-email', note: 'Nhập tài khoản' },
    { selector: '#login-password', note: 'Nhập mật khẩu' },
    { selector: 'button:has-text("Đăng nhập")', note: 'Đăng nhập' },
  ])

  await page.fill('#login-email', 'admin@zencos.vn')
  await page.fill('#login-password', 'Admin@12345')
  await Promise.all([
    page.waitForURL('**/overview', { timeout: 20000 }),
    page.click('button:has-text("Đăng nhập")'),
  ])

  const failures = []

  for (const screen of screens) {
    try {
      await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'networkidle' })
      if (screen.prepare) {
        await screen.prepare(page)
      }
      await waitAny(page, screen.waits)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(500)
      highlightMap[screen.file] = await getHighlightRegions(page, screen.highlights)
      await page.screenshot({ path: path.join(screenshotDir, screen.file), fullPage: false })
      console.log(`OK ${screen.file}`)
    } catch (error) {
      failures.push({ file: screen.file, reason: String(error) })
      console.error(`FAIL ${screen.file}`)
    }
  }

  if (failures.length > 0) {
    console.log('Failures:')
    for (const f of failures) {
      console.log(`- ${f.file}: ${f.reason}`)
    }
    process.exitCode = 1
  }

  fs.writeFileSync(highlightOutputFile, JSON.stringify(highlightMap, null, 2), 'utf8')
  console.log(`Saved highlight map: ${highlightOutputFile}`)
} finally {
  await context.close()
  await browser.close()
}
