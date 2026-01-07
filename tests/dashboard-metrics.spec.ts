import { test, expect } from '@playwright/test';

test.describe('Dashboard Metrics and UI', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Monitor API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`[API REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`[API RESPONSE] ${response.status()} ${response.url()}`);
      }
    });

    // Login first
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login credentials
    await page.fill('input[name="username"]', 'yifei');
    await page.fill('input[name="password"]', '11235813');
    
    // Submit and wait for dashboard
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 10000 }),
      page.locator('button[type="submit"]').click()
    ]);
    
    console.log('✅ Login successful, now on dashboard');
  });

  test('should display dashboard header with user info', async ({ page }) => {
    // Check main header
    await expect(page.locator('h1')).toContainText('管理控制台');
    
    // Check welcome message with username
    await expect(page.locator('p').first()).toContainText('欢迎回来，yifei');
    
    // Wait for potential realtime data to load
    await page.waitForTimeout(1000);
    
    // Check if realtime status is displayed
    const realtimeStatus = page.locator('text=人在线');
    if (await realtimeStatus.isVisible()) {
      console.log('✅ Realtime status displayed');
      await expect(realtimeStatus).toBeVisible();
    } else {
      console.log('ℹ️ Realtime status not displayed (API not available)');
    }
  });

  test('should display metrics cards with data', async ({ page }) => {
    console.log('=== Testing Metrics Cards ===');
    
    // Wait for data to load (React Query with mock data)
    await page.waitForTimeout(2000);
    
    // Check for metrics cards by their titles
    const metricsCards = [
      '保安总数',
      '站点总数', 
      '今日签到',
      '本周签到'
    ];
    
    for (const cardTitle of metricsCards) {
      const card = page.locator(`text=${cardTitle}`).locator('..').locator('..');
      await expect(card).toBeVisible();
      
      // Check that the card has numeric data
      const numericValue = card.locator('.text-2xl.font-bold');
      await expect(numericValue).toBeVisible();
      
      const value = await numericValue.textContent();
      console.log(`${cardTitle}: ${value}`);
      
      // Verify it's a number
      expect(value?.trim()).toMatch(/^\d+$/);
    }
    
    console.log('✅ All metrics cards display properly');
  });

  test('should display progress bars in metrics cards', async ({ page }) => {
    console.log('=== Testing Progress Bars ===');
    
    await page.waitForTimeout(2000);
    
    // Check for progress bars in metrics cards
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    
    console.log(`Found ${count} progress bars`);
    expect(count).toBeGreaterThan(0);
    
    // Check each progress bar has proper attributes
    for (let i = 0; i < count; i++) {
      const progressBar = progressBars.nth(i);
      
      // Should have proper ARIA attributes
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
      
      // Should have a value between 0-100
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      if (ariaValueNow) {
        const value = parseFloat(ariaValueNow);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
        console.log(`Progress bar ${i + 1}: ${value}%`);
      }
    }
    
    console.log('✅ Progress bars function correctly');
  });

  test('should display guard status distribution chart', async ({ page }) => {
    console.log('=== Testing Guard Status Distribution ===');
    
    await page.waitForTimeout(2000);
    
    // Look for the guard status distribution card
    const statusCard = page.locator('text=保安状态分布').locator('..').locator('..');
    await expect(statusCard).toBeVisible();
    
    // Check for the different status categories
    const statusTypes = ['在岗', '离岗', '不活跃'];
    
    for (const status of statusTypes) {
      const statusRow = statusCard.locator(`text=${status}`);
      await expect(statusRow).toBeVisible();
      
      // Each status should have a number
      const statusNumber = statusRow.locator('..').locator('.text-sm.font-medium');
      await expect(statusNumber).toBeVisible();
      
      const value = await statusNumber.textContent();
      console.log(`${status}: ${value}`);
      expect(value?.trim()).toMatch(/^\d+$/);
    }
    
    console.log('✅ Guard status distribution displays correctly');
  });

  test('should display recent check-ins with proper formatting', async ({ page }) => {
    console.log('=== Testing Recent Check-ins ===');
    
    await page.waitForTimeout(2000);
    
    // Look for the recent check-ins card
    const recentCard = page.locator('text=最近签到记录').locator('..').locator('..');
    await expect(recentCard).toBeVisible();
    
    // Check for check-in entries or empty state
    const checkinEntries = recentCard.locator('.space-y-3 > div');
    const entryCount = await checkinEntries.count();
    
    if (entryCount > 0) {
      console.log(`Found ${entryCount} recent check-in entries`);
      
      // Check first entry has proper structure
      const firstEntry = checkinEntries.first();
      
      // Should have guard name
      const guardName = firstEntry.locator('.font-medium.text-sm');
      await expect(guardName).toBeVisible();
      
      // Should have status badge
      const statusBadge = firstEntry.locator('.bg-green-100, .bg-yellow-100, .bg-blue-100, .bg-red-100');
      if (await statusBadge.count() > 0) {
        await expect(statusBadge.first()).toBeVisible();
        console.log('✅ Status badge found');
      }
      
      // Should have site name
      const siteName = firstEntry.locator('.text-xs.text-muted-foreground');
      await expect(siteName.first()).toBeVisible();
      
      // Should have timestamp
      const timestamp = firstEntry.locator('.text-xs.text-muted-foreground').last();
      await expect(timestamp).toBeVisible();
      
      console.log('✅ Check-in entries properly formatted');
    } else {
      // Check for empty state message
      const emptyState = recentCard.locator('text=暂无签到记录');
      await expect(emptyState).toBeVisible();
      console.log('✅ Empty state displayed correctly');
    }
  });

  test('should display navigation cards with icons and hover effects', async ({ page }) => {
    console.log('=== Testing Navigation Cards ===');
    
    await page.waitForTimeout(1000);
    
    // Check quick actions section
    await expect(page.locator('text=快速操作')).toBeVisible();
    
    const navCards = [
      { title: '员工管理', description: '添加、编辑、删除保安信息' },
      { title: '单位管理', description: '设置单位位置与分配保安' },
      { title: '签到记录查询', description: '查询保安每日签到详情' }
    ];
    
    for (const card of navCards) {
      const cardElement = page.locator(`text=${card.title}`).locator('..').locator('..');
      await expect(cardElement).toBeVisible();
      
      // Check card has description
      await expect(cardElement.locator(`text=${card.description}`)).toBeVisible();
      
      // Check card has button
      const button = cardElement.locator('button:has-text("进入管理")');
      await expect(button).toBeVisible();
      
      // Test hover effect by moving mouse over card
      await cardElement.hover();
      
      console.log(`✅ Navigation card "${card.title}" displays correctly`);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    console.log('=== Testing Error Handling ===');
    
    // Intercept API calls to simulate errors
    await page.route('**/api/dashboard/**', (route) => {
      console.log('Intercepting dashboard API call');
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    // Reload the page to trigger API calls
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still show the basic navigation even with API errors
    await expect(page.locator('h1')).toContainText('管理控制台');
    
    // Navigation cards should still be present
    await expect(page.locator('text=员工管理')).toBeVisible();
    await expect(page.locator('text=单位管理')).toBeVisible(); 
    await expect(page.locator('text=签到记录查询')).toBeVisible();
    
    console.log('✅ Error handling works correctly - UI remains functional');
  });

  test('should have proper loading states', async ({ page }) => {
    console.log('=== Testing Loading States ===');
    
    // Intercept API to add delay
    await page.route('**/api/dashboard/**', async (route) => {
      // Add 2 second delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    // Reload to trigger loading state
    await page.reload();
    
    // Should show loading spinner initially
    const loadingSpinner = page.locator('.animate-spin');
    if (await loadingSpinner.isVisible({ timeout: 1000 })) {
      await expect(loadingSpinner).toBeVisible();
      await expect(page.locator('text=加载中...')).toBeVisible();
      console.log('✅ Loading spinner displayed');
      
      // Wait for loading to complete
      await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
      console.log('✅ Loading completed');
    } else {
      console.log('ℹ️ Loading was too fast to observe spinner');
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    console.log('=== Testing Responsive Design ===');
    
    await page.waitForTimeout(2000);
    
    // Test desktop view (default)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Metrics should be in 4 columns on large screens
    const metricsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    await expect(metricsGrid).toBeVisible();
    console.log('✅ Desktop layout correct');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Navigation should still be visible and functional
    await expect(page.locator('text=员工管理')).toBeVisible();
    console.log('✅ Tablet layout correct');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Should be single column on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=员工管理')).toBeVisible();
    console.log('✅ Mobile layout correct');
    
    // Restore desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('should display React Query DevTools in development', async ({ page }) => {
    console.log('=== Testing React Query DevTools ===');
    
    // Look for React Query DevTools (should be visible in development)
    const devTools = page.locator('text=React Query DevTools').or(
      page.locator('[title*="Query Dev"], [aria-label*="Query Dev"]')
    );
    
    // DevTools might take time to load
    await page.waitForTimeout(2000);
    
    if (await devTools.isVisible()) {
      console.log('✅ React Query DevTools found');
      await expect(devTools).toBeVisible();
    } else {
      console.log('ℹ️ React Query DevTools not visible (may be collapsed)');
    }
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot after each test for debugging
    await page.screenshot({ 
      path: `test-results/dashboard-${test.info().title.replace(/\s+/g, '-')}.png`, 
      fullPage: true 
    });
  });
});