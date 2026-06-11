#!/usr/bin/env node
import fs from 'fs';

const bbFile = JSON.parse(fs.readFileSync('bounding-boxes.json', 'utf8'));

// Convert bounding boxes to screenshot-highlights format
const highlights = {
  '07-tp-outbound-step1.png': [
    {
      x: Math.round(bbFile[0].box.x),
      y: Math.round(bbFile[0].box.y),
      w: Math.round(bbFile[0].box.width),
      h: Math.round(bbFile[0].box.height),
      n: 1,
      note: 'THÔNG TIN KHÁCH HÀNG: Nhập mã khách hàng, tên khách hàng, hình thức thanh toán'
    },
    {
      x: Math.round(bbFile[1].box.x),
      y: Math.round(bbFile[1].box.y),
      w: Math.round(bbFile[1].box.width),
      h: Math.round(bbFile[1].box.height),
      n: 2,
      note: 'THÔNG TIN XUẤT KHO & VẬN CHUYỂN: Chọn ngày xuất, nhập người giao, phương thức vận chuyển'
    },
    {
      x: 720,
      y: 240,
      w: 530,
      h: 140,
      n: 3,
      note: 'SỐ VẬN ĐƠN & GHI CHÚ: Nhập số vận đơn, ghi chú cho phiếu xuất'
    },
    {
      x: Math.round(bbFile[2].box.x),
      y: Math.round(bbFile[2].box.y),
      w: Math.round(bbFile[2].box.width),
      h: 180,
      n: 4,
      note: 'BẢNG CHI TIẾT HÀNG HÓA: Chọn sản phẩm, nhập số lô, số lượng, đơn giá'
    },
    {
      x: 1100,
      y: 450,
      w: 200,
      h: 120,
      n: 5,
      note: 'TỔNG CỘNG: Tổng SL, tổng tiền hàng, tổng thanh toán'
    },
    {
      x: Math.round(bbFile[3].box.x),
      y: Math.round(bbFile[3].box.y),
      w: Math.round(bbFile[3].box.width),
      h: Math.round(bbFile[3].box.height),
      n: 6,
      note: 'LƯU NHÁP: Lưu phiếu ở trạng thái nháp để sửa sau'
    },
    {
      x: Math.round(bbFile[4].box.x),
      y: Math.round(bbFile[4].box.y),
      w: Math.round(bbFile[4].box.width),
      h: Math.round(bbFile[4].box.height),
      n: 7,
      note: 'XÁC NHẬN XUẤT KHO: Hoàn tất phiếu xuất kho'
    }
  ]
};

// Merge with existing data
const existing = JSON.parse(fs.readFileSync('docs/quick-guide/screenshot-highlights.json', 'utf8'));
Object.assign(existing, highlights);

fs.writeFileSync('docs/quick-guide/screenshot-highlights.json', JSON.stringify(existing, null, 2));
console.log('✓ Updated highlights.json with browser-detected coordinates');
console.log('Generated coordinates:');
highlights['07-tp-outbound-step1.png'].forEach((h) => {
  console.log(`Box ${h.n}: x=${h.x}, y=${h.y}, w=${h.w}, h=${h.h}`);
});
