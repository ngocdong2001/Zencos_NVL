import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  TextRun,
} from 'docx'

const rootDir = process.cwd()
const guideDir = path.join(rootDir, 'docs', 'quick-guide')
const screenshotSubDir = process.env.GUIDE_SCREENSHOT_DIR || 'screenshots-annotated'
const shotDir = path.join(guideDir, screenshotSubDir)
const highlightFile = path.join(guideDir, 'screenshot-highlights.json')
const outFile = path.join(guideDir, 'Quick-Guide-ZencosMS.docx')

const highlightMap = fs.existsSync(highlightFile)
  ? JSON.parse(fs.readFileSync(highlightFile, 'utf8'))
  : {}

const steps = [
  {
    title: 'Bước 1. Đăng nhập hệ thống',
    image: '00-login.png',
    bullets: [
      'Truy cập: http://localhost:5180/login.',
      'Nhập tài khoản: admin@zencos.vn.',
      'Nhập mật khẩu: Admin@12345.',
      'Nhấn Đăng nhập để vào màn hình Tổng quan.',
    ],
  },
  {
    title: 'Bước 2. Tổng quan vận hành',
    image: '01-overview.png',
    bullets: [
      'Xem KPI chính: giá trị tồn, cận hạn, đơn chờ nhập/xuất.',
      'Dùng ô tìm kiếm trên thanh đầu trang để lọc nhanh dữ liệu.',
      'Mở nhanh chi tiết phiếu từ bảng giao dịch gần đây.',
    ],
  },
  {
    title: 'Bước 3. Quản lý kho NVL',
    image: '02-warehouse-nvl.png',
    bullets: [
      'Theo dõi tồn kho nguyên liệu theo FEFO.',
      'Lọc theo kho, theo ngày và theo trạng thái cận hạn/tồn thấp.',
      'Xuất Excel để đối soát dữ liệu tồn kho.',
    ],
  },
  {
    title: 'Bước 4. Quản lý kho Thành phẩm',
    image: '03-warehouse-tp.png',
    bullets: [
      'Theo dõi tồn thành phẩm và bán thành phẩm.',
      'Kiểm tra lô cận hạn và tình hình xuất nhập theo kỳ.',
      'Xuất báo cáo Excel từ màn hình kho TP.',
    ],
  },
  {
    title: 'Bước 5. Yêu cầu mua hàng (PO)',
    image: '04-purchase-order.png',
    images: [
      { file: '04-purchase-shortage.png', caption: 'Màn hình chính thống kê nguyên vật liệu thiếu hụt' },
      { file: '04-purchase-po-list.png', caption: 'Màn hình bảng kê phiếu PO' },
      { file: '04-purchase-order.png', caption: 'Màn hình chi tiết nhập liệu phiếu PO' },
    ],
    bullets: [
      'Tạo PO ở trạng thái Bản nháp, bổ sung dòng nguyên liệu cần mua.',
      'Lưu nháp trước khi gửi, sau khi gửi phiếu sẽ bị khóa chỉnh sửa.',
      'Nếu cần sửa phiếu đã gửi, thu hồi về nháp rồi cập nhật và gửi lại.',
    ],
  },
  {
    title: 'Bước 6. Danh sách phiếu nhập kho NVL',
    images: [
      { file: '05-inbound-list.png', caption: 'Màn hình danh sách phiếu nhập kho' },
      { file: '06-inbound-step1.png', caption: 'Bước 1: Chọn NCC & NVL' },
      { file: '06-inbound-step2.png', caption: 'Bước 2: Chi tiết Lô hàng' },
      { file: '06-inbound-step3.png', caption: 'Bước 3: Số lượng & Chứng từ' },
      { file: '06-inbound-step4.png', caption: 'Bước 4: Xác nhận dữ liệu' },
    ],
    bullets: [
      'Tạo phiếu nhập mới, chọn NCC và nguyên liệu, liên kết PO nếu có.',
      'Khai báo chi tiết lô hàng: LOT, đơn giá, số lượng, hóa đơn, MFG/EXP.',
      'Đính kèm COA và MSDS cho mỗi lô hàng mới, xác nhận số lượng.',
      'Xác nhận toàn bộ thông tin phiếu và hoàn tất để cập nhật tồn kho.',
    ],
  },
  {
    title: 'Bước 7. Danh sách lệnh xuất kho NVL',
    image: '07-outbound-list.png',
    bullets: [
      'Tạo lệnh xuất mới, theo dõi trạng thái Chờ xử lý/Hoàn thành/Đã hủy.',
      'Hoàn thành lệnh khi xuất thực tế xong.',
      'Tạo phiếu điều chỉnh khi cần đảo lệnh đã hoàn thành.',
    ],
  },
  {
    title: 'Bước 9. Danh sách phiếu sản xuất',
    image: '08-production-list.png',
    bullets: [
      'Theo dõi trạng thái Bản nháp/Đang sản xuất/Hoàn thành.',
      'Mở tiếp phiếu đang làm để thực hiện đúng công đoạn tiếp theo.',
      'Mở lưu đồ NVL để truy vết luồng vật tư theo phiếu.',
    ],
  },
  {
    title: 'Bước 10. Sản xuất - Bước 1 (Xuất NVL)',
    image: '09-production-step1.png',
    bullets: [
      'Chọn sản phẩm đầu ra, kho xuất NVL và ngày xử lý.',
      'Nhập số lượng xuất theo lô, lưu nháp trước khi chuyển bước.',
      'Nhấn Tiếp theo để sang bước Nhập BTP.',
    ],
  },
  {
    title: 'Bước 11. Định mức sản xuất (BOM)',
    image: '10-production-bom.png',
    bullets: [
      'Tạo/sửa phiếu định mức, khai báo tỷ lệ hao hụt và hiệu lực.',
      'Lưu bản nháp, gửi duyệt và phê duyệt theo quy trình.',
      'Ngưng hiệu lực định mức cũ khi thay đổi công thức.',
    ],
  },
  {
    title: 'Bước 12. Danh sách xuất kho TP',
    image: '11-tp-outbound.png',
    bullets: [
      'Quản lý lệnh xuất thành phẩm theo khách hàng và ngày xuất.',
      'Cập nhật trạng thái hoàn thành/hủy như quy trình NVL.',
      'Hỗ trợ tạo phiếu điều chỉnh để đảo nghiệp vụ khi cần.',
    ],
  },
  {
    title: 'Bước 13. Lập phiếu xuất kho TP',
    images: [
      { file: '07-tp-outbound-step1.png', caption: 'Biểu mẫu phiếu xuất kho thành phẩm hoàn chỉnh' },
    ],
    bullets: [
      'Tạo phiếu xuất mới, chọn khách hàng và nhập hình thức thanh toán.',
      'Khai báo ngày xuất, người giao hàng, phương thức vận chuyển và số vận đơn.',
      'Chọn sản phẩm, nhập số lô, số lượng và đơn giá. Hệ thống tự động tính thành tiền.',
      'Xác nhận toàn bộ phiếu khi dữ liệu đã chính xác, hệ thống sẽ cập nhật tồn kho TP tương ứng.',
    ],
  },
  {
    title: 'Bước 15. Danh mục (Catalogs)',
    image: '12-catalog.png',
    bullets: [
      'Quản lý mã NVL, danh mục cơ bản và sản phẩm đầu ra.',
      'Import/Export file danh mục để cập nhật hàng loạt.',
      'Đảm bảo không trùng mã và dữ liệu bắt buộc đầy đủ trước khi lưu.',
    ],
  },
  {
    title: 'Bước 16. Khai báo tồn kho đầu kỳ',
    image: '13-opening-stock.png',
    bullets: [
      'Nhập thông tin lô, số lượng, đơn giá, nhà cung cấp và ngày liên quan.',
      'Nhập số lượng theo quy tắc parse và format thống nhất trong hệ thống.',
      'Import file nếu cần khởi tạo nhiều dòng dữ liệu.',
    ],
  },
  {
    title: 'Bước 17. Chuyển kho nội bộ',
    image: '14-stock-transfer.png',
    bullets: [
      'Tạo phiếu chuyển, bổ sung hàng hóa và số lượng cần luân chuyển.',
      'Lưu nháp và xác nhận phiếu khi đã kiểm tra tồn kho nguồn.',
      'Theo dõi trạng thái đến khi kho đích đã nhận.',
    ],
  },
  {
    title: 'Bước 18. Quản lý người dùng',
    image: '15-users.png',
    bullets: [
      'Tạo tài khoản mới, cấp vai trò và trạng thái hoạt động.',
      'Đặt lại mật khẩu khi người dùng quên mật khẩu.',
      'Khóa hoặc xóa mềm tài khoản theo quy định vận hành.',
    ],
  },
  {
    title: 'Bước 19. Ma trận phân quyền vai trò',
    image: '16-role-permissions.png',
    bullets: [
      'Tra cứu nhanh vai trò nào có quyền xem/ghi/xóa theo từng phân hệ.',
      'Dùng để đối chiếu khi gặp lỗi không có quyền truy cập.',
    ],
  },
  {
    title: 'Bước 20. Tài khoản của tôi',
    image: '17-profile.png',
    bullets: [
      'Cập nhật họ tên/email cho tài khoản đang đăng nhập.',
      'Đổi mật khẩu định kỳ để đảm bảo an toàn.',
    ],
  },
]

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing screenshot: ${filePath}`)
  }
}

async function imageParagraph(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath)
  const meta = await sharp(imageBuffer).metadata()
  const srcW = meta.width ?? 1920
  const srcH = meta.height ?? 1080

  const maxWidth = 1080
  const maxHeight = 620
  const ratio = Math.min(maxWidth / srcW, maxHeight / srcH)
  const targetW = Math.max(320, Math.round(srcW * ratio))
  const targetH = Math.max(180, Math.round(srcH * ratio))

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data: imageBuffer,
        transformation: { width: targetW, height: targetH },
      }),
    ],
  })
}

function imageCaptionParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, italics: true })],
  })
}

function detailNote(note) {
  const details = {
    'Nhập tài khoản': 'Nhập email đăng nhập của người dùng được cấp quyền. Nên dùng đúng tài khoản theo vai trò vận hành để đảm bảo hiển thị đúng phân hệ và quyền thao tác.',
    'Nhập mật khẩu': 'Nhập mật khẩu tương ứng với tài khoản. Nếu nhập sai nhiều lần, cần kiểm tra lại bộ gõ hoặc liên hệ quản trị để tránh khóa tạm thời.',
    'Đăng nhập': 'Nhấn để xác thực thông tin và truy cập hệ thống. Sau khi đăng nhập thành công, kiểm tra tên người dùng ở góc trên phải để chắc chắn đang đúng tài khoản làm việc.',
    'Tạo phiếu nhanh': 'Điểm khởi tạo tác vụ nhanh từ màn tổng quan, giúp giảm số bước thao tác khi cần tạo nghiệp vụ thường dùng ngay trong ca làm việc.',
    'Khu vực KPI': 'Theo dõi các chỉ số vận hành trọng yếu theo thời gian thực (tồn kho, cảnh báo, giao dịch). Dùng để phát hiện sớm rủi ro và ưu tiên xử lý trong ngày.',
    'Xuất báo cáo': 'Xuất dữ liệu hiện tại ra file để đối soát nội bộ hoặc gửi các bộ phận liên quan. Nên kiểm tra bộ lọc trước khi xuất để tránh thiếu hoặc thừa dữ liệu.',
    'Bộ lọc vận hành': 'Thiết lập điều kiện lọc theo kho, trạng thái hoặc thời gian để thu hẹp tập dữ liệu cần kiểm tra, giúp thao tác nhanh và chính xác hơn.',
    'Bộ lọc theo ngày': 'Giới hạn dữ liệu theo khoảng ngày để so sánh biến động tồn kho và truy vết các giao dịch phát sinh trong một giai đoạn cụ thể.',
    'Màn hình thống kê thiếu hụt': 'Tổng hợp nhanh số lượng NVL đang thiếu theo mức độ ưu tiên, hỗ trợ bộ phận kho và mua hàng xác định danh mục cần xử lý trước.',
    'Bảng thống kê nguyên liệu thiếu hụt': 'Hiển thị chi tiết mã NVL, tồn hiện tại, định mức tối thiểu và trạng thái thiếu hụt. Dựa vào đây để chọn đúng nguyên liệu cần lập yêu cầu mua.',
    'Khu vực tạo nhanh PO': 'Soạn nhanh yêu cầu mua hàng trực tiếp từ màn thiếu hụt bằng cách chọn nhà cung cấp, ngày cần hàng và loại yêu cầu, sau đó lưu hoặc vào chi tiết phiếu.',
    'Bảng kê phiếu PO': 'Danh sách toàn bộ phiếu PO đã tạo kèm thông tin nhà cung cấp, ngày tạo, trạng thái và thao tác. Dùng để theo dõi tiến độ xử lý và kiểm tra lịch sử.',
    'Tạo phiếu mới': 'Khởi tạo một phiếu PO độc lập khi cần mua phát sinh ngoài danh sách gợi ý thiếu hụt hoặc cần nhập liệu theo yêu cầu đặc biệt.',
    'Danh sách và trạng thái phiếu': 'Theo dõi vòng đời phiếu PO (Bản nháp, Đã gửi, Đã nhận...). Trạng thái quyết định việc phiếu còn được chỉnh sửa hay chỉ xem tra cứu.',
    'Nhập thông tin chung': 'Khai báo đầy đủ thông tin đầu phiếu gồm nhà cung cấp, kho nhận, ngày dự kiến nhận và điều khoản liên quan. Đây là dữ liệu nền để xử lý nhập kho về sau.',
    'Nhập dòng nguyên liệu': 'Thêm từng dòng nguyên liệu cần mua, nhập số lượng, đơn vị và đơn giá. Cần kiểm tra mã hàng và đơn vị tính để tránh sai lệch khi nhận hàng.',
    'Lưu phiếu sau khi nhập': 'Lưu bản nháp để kiểm tra trước khi gửi chính thức cho thu mua. Khuyến nghị lưu nháp sau mỗi lần cập nhật lớn để tránh mất dữ liệu do gián đoạn phiên làm việc.',
    'Tạo phiếu nhập mới': 'Khởi tạo phiếu nhập kho NVL mới để tiếp nhận hàng từ nhà cung cấp hoặc nhập bổ sung theo điều chỉnh nghiệp vụ.',
    'Bộ lọc danh sách': 'Lọc danh sách phiếu nhập theo trạng thái, khoảng ngày hoặc nhà cung cấp để tìm đúng chứng từ cần xử lý nhanh chóng.',
    'Thông tin bước 1': 'Khu vực khai báo thông tin nền của phiếu nhập như chứng từ tham chiếu, kho nhận, nhà cung cấp và ngày chứng từ.',
    'Đi tiếp bước 2': 'Chuyển sang bước khai báo chi tiết lô và số lượng nhập. Chỉ nên chuyển bước khi thông tin bước 1 đã đầy đủ và hợp lệ.',
    'Tạo lệnh mới': 'Khởi tạo lệnh nghiệp vụ mới (xuất kho, sản xuất hoặc xuất TP) theo phân hệ hiện tại để bắt đầu quy trình xử lý.',
    'Bộ lọc xuất kho': 'Lọc danh sách lệnh xuất theo trạng thái và thời gian nhằm kiểm soát các lệnh chờ xử lý, đã hoàn thành hoặc cần điều chỉnh.',
    'Tạo lệnh sản xuất': 'Khởi tạo phiếu sản xuất mới, làm điểm bắt đầu cho chuỗi xuất NVL, nhập BTP/TP và theo dõi tiến độ thực hiện.',
    'Bộ lọc sản xuất': 'Sàng lọc phiếu sản xuất theo trạng thái và thời gian để điều phối công việc theo ca và ưu tiên đơn hàng.',
    'Thông tin phiếu': 'Khai báo dữ liệu chính của phiếu sản xuất như sản phẩm đầu ra, định mức áp dụng và các tham số vận hành liên quan.',
    'Tạo và đi tiếp': 'Lưu dữ liệu bước hiện tại và chuyển sang bước kế tiếp trong quy trình sản xuất. Nên rà soát số liệu trước khi chuyển bước.',
    'Thông tin định mức': 'Khu vực thiết lập công thức BOM, thành phần nguyên liệu và tỷ lệ hao hụt làm chuẩn cho các lệnh sản xuất sử dụng định mức này.',
    'Lưu định mức': 'Lưu định mức ở trạng thái phù hợp (nháp hoặc gửi duyệt) để phục vụ kiểm soát thay đổi công thức và truy vết lịch sử phiên bản.',
    'Bộ lọc xuất kho TP': 'Lọc các lệnh xuất thành phẩm theo khách hàng, trạng thái và thời gian để bám sát tiến độ giao hàng.',
    'Nhập dữ liệu': 'Thực hiện import dữ liệu danh mục hàng loạt từ file mẫu, giảm thao tác nhập tay và đồng bộ dữ liệu chuẩn hóa.',
    'Khu vực danh mục': 'Vùng quản trị danh mục gốc của hệ thống (NVL, thành phẩm, đơn vị, nhóm...) ảnh hưởng trực tiếp đến dữ liệu nghiệp vụ.',
    'Tạo mã nhanh': 'Thêm mới mã NVL nhanh tại màn tồn đầu kỳ, phục vụ nhập liệu khi phát sinh mã chưa có trong danh mục.',
    'Bảng tồn đầu kỳ': 'Khai báo số lượng và giá trị tồn đầu kỳ theo từng mã/lô để làm số liệu nền trước khi chạy nghiệp vụ nhập xuất thực tế.',
    'Thông tin phiếu chuyển': 'Khai báo kho nguồn, kho đích và thông tin điều chuyển nội bộ để theo dõi luồng hàng giữa các kho.',
    'Xác nhận phiếu': 'Xác nhận thao tác chuyển kho sau khi kiểm tra tồn nguồn và danh sách hàng chuyển, đảm bảo tính chính xác trước khi ghi nhận.',
    'Tạo tài khoản': 'Khởi tạo người dùng mới, gán vai trò phù hợp và thiết lập trạng thái hoạt động để kiểm soát quyền truy cập hệ thống.',
    'Danh sách người dùng': 'Theo dõi trạng thái tài khoản, vai trò và thao tác quản trị như đặt lại mật khẩu, khóa/mở tài khoản.',
    'Tiêu đề phân quyền': 'Xác định rõ màn hình ma trận quyền theo vai trò để kiểm tra phạm vi truy cập và chỉnh sửa của từng nhóm người dùng.',
    'Ma trận quyền': 'Bảng chi tiết quyền xem/thêm/sửa/xóa theo từng chức năng, dùng để cấu hình và rà soát phân quyền chuẩn.',
    'Cập nhật hồ sơ': 'Chỉnh sửa thông tin cá nhân của tài khoản đăng nhập để đảm bảo dữ liệu liên hệ luôn chính xác.',
    'Đổi mật khẩu': 'Thực hiện thay đổi mật khẩu định kỳ hoặc khi nghi ngờ rò rỉ thông tin để tăng cường an toàn tài khoản.',
  }
  return details[note] ?? `${note}: Đây là vùng thao tác quan trọng của bước hiện tại. Thực hiện đúng trình tự nhập liệu, kiểm tra lại dữ liệu trước khi lưu/xác nhận để tránh sai lệch nghiệp vụ.`
}

function highlightLegendParagraphs(imageFile) {
  const regions = Array.isArray(highlightMap[imageFile]) ? highlightMap[imageFile] : []
  if (regions.length === 0) return []

  const sorted = [...regions].sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
  return [
    new Paragraph({
      spacing: { before: 20, after: 40 },
      children: [new TextRun({ text: 'Chú thích chi tiết vùng khoanh đỏ:', bold: true })],
    }),
    ...sorted.map((region) =>
      new Paragraph({
        text: `(${region.n}) ${detailNote(region.note ?? 'Vùng thao tác')}`,
      }),
    ),
  ]
}

const children = [
  new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    children: [new TextRun('Quick Guide - ZencosMS')],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`)],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Tài liệu hướng dẫn nhanh cho người dùng vận hành hệ thống.')],
  }),
]

for (const step of steps) {
  const imageEntries = step.images?.length
    ? step.images
    : [{ file: step.image, caption: null }]

  const imageParas = []
  for (const entry of imageEntries) {
    const imagePath = path.join(shotDir, entry.file)
    ensureFile(imagePath)
    const imagePara = await imageParagraph(imagePath)
    imageParas.push(imagePara)
    if (entry.caption) {
      imageParas.push(imageCaptionParagraph(entry.caption))
    }
    imageParas.push(...highlightLegendParagraphs(entry.file))
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 260, after: 120 },
      children: [new TextRun(step.title)],
    }),
    ...step.bullets.map((line) => new Paragraph({ text: `- ${line}` })),
    ...imageParas,
  )
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
try {
  fs.writeFileSync(outFile, buffer)
  console.log(`Created: ${outFile}`)
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EBUSY') {
    const fallback = path.join(guideDir, `Quick-Guide-ZencosMS-${Date.now()}.docx`)
    fs.writeFileSync(fallback, buffer)
    console.log(`Created fallback (file locked): ${fallback}`)
  } else {
    throw error
  }
}