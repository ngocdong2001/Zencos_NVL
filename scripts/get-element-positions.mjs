#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    // Navigate to login
    await page.goto('http://localhost:5180/login', { waitUntil: 'networkidle' });
    
    // Login
    await page.fill('input[placeholder*="user@"]', 'admin@zencos.vn');
    await page.fill('input[type="password"]', 'Admin@12345');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Navigate to tp-outbound new
    await page.goto('http://localhost:5180/tp-outbound/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Get bounding boxes for all elements
    const regions = [];
    
    // 1. Customer info section (heading + content area)
    const customerBox = await page.locator('text=THÔNG TIN KHÁCH HÀNG').first().evaluate(el => {
      const container = el.closest('article');
      return container?.getBoundingClientRect();
    });
    if (customerBox) {
      regions.push({
        n: 1,
        box: customerBox,
        note: 'THÔNG TIN KHÁCH HÀNG: Nhập mã khách hàng, tên khách hàng, hình thức thanh toán'
      });
    }
    
    // 2. Shipping info section
    const shippingBox = await page.locator('text=THÔNG TIN XUẤT KHO').first().evaluate(el => {
      const container = el.closest('article');
      return container?.getBoundingClientRect();
    });
    if (shippingBox) {
      regions.push({
        n: 2,
        box: shippingBox,
        note: 'THÔNG TIN XUẤT KHO & VẬN CHUYỂN: Chọn ngày xuất, nhập người giao, phương thức vận chuyển'
      });
    }
    
    // 3. Waybill and notes
    const waybillBox = await page.locator('text=Số vận đơn').first().evaluate(el => {
      // Get the parent row/container
      const container = el.closest('div[class*="generic"]')?.parentElement;
      return container?.getBoundingClientRect();
    });
    if (waybillBox) {
      regions.push({
        n: 3,
        box: waybillBox,
        note: 'SỐ VẬN ĐƠN & GHI CHÚ: Nhập số vận đơn, ghi chú cho phiếu xuất'
      });
    }
    
    // 4. Product table
    const tableSection = await page.locator('text=BẢNG CHI TIẾT HÀNG HÓA').first().evaluate(el => {
      // Find the parent container
      const container = el.closest('div[class*="generic"]') || el.parentElement.parentElement;
      return container?.getBoundingClientRect();
    });
    if (tableSection) {
      regions.push({
        n: 4,
        box: tableSection,
        note: 'BẢNG CHI TIẾT HÀNG HÓA: Chọn sản phẩm, nhập số lô, số lượng, đơn giá'
      });
    }
    
    // 5. Total section
    const totalBox = await page.locator('text=Tổng số lượng').first().evaluate(el => {
      const container = el.closest('div[class*="generic"]')?.parentElement;
      return container?.getBoundingClientRect();
    });
    if (totalBox) {
      regions.push({
        n: 5,
        box: totalBox,
        note: 'TỔNG CỘNG: Tổng SL, tổng tiền hàng, tổng thanh toán'
      });
    }
    
    // 6. Save button
    const saveBtn = await page.locator('button', { has: page.locator('text=Lưu nháp') }).first().boundingBox();
    if (saveBtn) {
      regions.push({
        n: 6,
        box: saveBtn,
        note: 'LƯU NHÁP: Lưu phiếu ở trạng thái nháp để sửa sau'
      });
    }
    
    // 7. Confirm button
    const confirmBtn = await page.locator('button', { has: page.locator('text=Xác nhận') }).last().boundingBox();
    if (confirmBtn) {
      regions.push({
        n: 7,
        box: confirmBtn,
        note: 'XÁC NHẬN XUẤT KHO: Hoàn tất phiếu xuất kho'
      });
    }
    
    // Print all found regions
    console.log('Found regions:');
    regions.forEach(r => {
      console.log(`Box ${r.n}:`, r.box);
    });
    
    // Save to file for reference
    fs.writeFileSync('bounding-boxes.json', JSON.stringify(regions, null, 2));
    console.log('\nBounding boxes saved to bounding-boxes.json');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
