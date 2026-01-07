import { test, expect } from '@playwright/test';

test.describe('Dashboard Basic Functionality', () => {
  test('should login and display enhanced dashboard', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    console.log('=== Testing Enhanced Dashboard ===');

    // Navigate to login
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Login with correct credentials
    await page.fill('input[name="username"]', 'yifei');
    await page.fill('input[name="password"]', '11235813');

    // Submit and wait for dashboard
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 10000 }),
      page.locator('button[type="submit"]').click()
    ]);

    console.log('✅ Login successful, now testing dashboard');

    // Wait for dashboard to load
    await page.waitForTimeout(3000);

    // Check main dashboard header
    await expect(page.locator('h1')).toContainText('管理控制台');
    
    // Check welcome message
    await expect(page.locator('p').first()).toContainText('欢迎回来，yifei');
    console.log('✅ Dashboard header displays correctly');

    // Check for metrics cards (should show loading or data)
    const metricsCards = [
      '保安总数',
      '站点总数', 
      '今日签到',
      '本周签到'
    ];

    console.log('Checking for metrics cards...');
    for (const cardTitle of metricsCards) {
      await expect(page.locator(`text=${cardTitle}`)).toBeVisible();
      console.log(`✅ Found metric card: ${cardTitle}`);
    }

    // Check navigation cards are still present
    await expect(page.locator('text=员工管理')).toBeVisible();
    await expect(page.locator('text=单位管理')).toBeVisible();
    await expect(page.locator('text=签到记录查询')).toBeVisible();
    console.log('✅ Navigation cards present');

    // Check for React Query indicators (loading or data)
    await page.waitForTimeout(2000);
    
    // Look for any numeric values in metrics cards
    const numericValues = page.locator('.text-2xl.font-bold');
    const count = await numericValues.count();
    console.log(`Found ${count} metric values`);
    
    if (count > 0) {
      const firstValue = await numericValues.first().textContent();
      console.log(`First metric value: ${firstValue}`);
      expect(firstValue?.trim()).toMatch(/^\d+$/);
      console.log('✅ Metrics are displaying numeric data');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/enhanced-dashboard.png', 
      fullPage: true 
    });

    console.log('✅ Enhanced dashboard test completed successfully');
  });
});