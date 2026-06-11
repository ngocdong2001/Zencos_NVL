#!/usr/bin/env node
import { chromium } from 'playwright';

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
    
    // Screenshot full page
    await page.screenshot({ path: 'docs/quick-guide/screenshots/07-tp-outbound-step1.png', fullPage: true });
    console.log('✓ Screenshot saved: 07-tp-outbound-step1.png');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
