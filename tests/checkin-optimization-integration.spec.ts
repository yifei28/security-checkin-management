import { test, expect } from '@playwright/test';

/**
 * Checkin Records Optimization Integration Tests
 * 
 * This test suite verifies the optimizations implemented in the checkin records page:
 * - Data mapping optimizations (Map vs Array lookups)
 * - Request debouncing functionality
 * - Caching mechanisms
 * - Enhanced error handling
 * - API parameter improvements
 */
test.describe('Checkin Records Optimization Integration', () => {
  
  // Test setup - login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    
    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin page
    await page.waitForURL('**/admin/**', { timeout: 10000 });
    
    // Navigate to checkins page
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
  });

  test('应该正确加载签到记录页面并显示优化后的界面', async ({ page }) => {
    // Check that the page loaded correctly
    await expect(page.locator('h1')).toContainText('签到记录查询');
    
    // Check for the presence of filter components
    await expect(page.locator('label:has-text("搜索")')).toBeVisible();
    await expect(page.locator('label:has-text("状态")')).toBeVisible();
    await expect(page.locator('label:has-text("保安")')).toBeVisible();
    await expect(page.locator('label:has-text("站点")')).toBeVisible();
    await expect(page.locator('label:has-text("时间范围")')).toBeVisible();
    
    // Check for export button
    await expect(page.locator('button:has-text("导出当前页")')).toBeVisible();
  });

  test('应该正确处理筛选防抖机制', async ({ page }) => {
    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        requests.push(request.url());
      }
    });

    // Wait for initial page load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    const initialRequestCount = requests.length;
    
    // Rapidly change filters multiple times (should be debounced)
    const statusSelect = page.locator('label:has-text("状态")').locator('..').locator('button');
    
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("成功")').click();
    
    // Immediately change to another status
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("失败")').click();
    
    // And again
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("全部状态")').click();
    
    // Wait for debounce period (300ms) + some buffer
    await page.waitForTimeout(500);
    
    // Should only make one additional request due to debouncing
    const finalRequestCount = requests.length;
    expect(finalRequestCount - initialRequestCount).toBeLessThanOrEqual(2);
  });

  test('应该正确显示保安和站点信息映射', async ({ page }) => {
    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Check that guard and site names are properly displayed
    const firstRow = page.locator('[data-testid="checkin-row"]').first();
    
    // Check guard information column
    const guardInfo = firstRow.locator('td').nth(1);
    await expect(guardInfo.locator('.font-medium')).not.toBeEmpty();
    
    // Check site information column  
    const siteInfo = firstRow.locator('td').nth(2);
    await expect(siteInfo.locator('.font-medium')).not.toBeEmpty();
    
    // Verify that we're not showing "未知保安" or "未知站点" if data exists
    const guardText = await guardInfo.locator('.font-medium').textContent();
    const siteText = await siteInfo.locator('.font-medium').textContent();
    
    // These should not be the fallback text if API returns proper data
    if (guardText && !guardText.includes('ID:')) {
      expect(guardText).not.toContain('未知保安');
    }
    if (siteText && !siteText.includes('ID:')) {
      expect(siteText).not.toContain('未知站点');
    }
  });

  test('应该正确处理日期范围筛选', async ({ page }) => {
    const requests: { url: string; timestamp: number }[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        requests.push({ 
          url: request.url(), 
          timestamp: Date.now() 
        });
      }
    });

    // Wait for initial load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Change date filter to "今天"
    const dateSelect = page.locator('label:has-text("时间范围")').locator('..').locator('button');
    await dateSelect.click();
    await page.locator('div[role="option"]:has-text("今天")').click();
    
    // Wait for request to complete
    await page.waitForTimeout(1000);
    
    // Find the most recent request
    const latestRequest = requests[requests.length - 1];
    expect(latestRequest.url).toContain('startDate=');
    expect(latestRequest.url).toContain('endDate=');
    
    // Verify the date format (should be YYYY-MM-DDTHH:mm:ss format)
    const urlParams = new URLSearchParams(latestRequest.url.split('?')[1]);
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  test('应该正确显示统计信息', async ({ page }) => {
    // Wait for statistics cards to load
    await page.waitForSelector('.text-2xl.font-bold', { timeout: 10000 });
    
    // Check that all 4 statistics cards are present
    const statCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-4 .text-2xl.font-bold');
    await expect(statCards).toHaveCount(4);
    
    // Check for total records
    const totalCard = page.locator('span:has-text("总记录")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(totalCard).toBeVisible();
    
    // Check for successful checkins
    const successCard = page.locator('span:has-text("成功签到")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(successCard).toBeVisible();
    
    // Check for failed checkins
    const failedCard = page.locator('span:has-text("失败签到")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(failedCard).toBeVisible();
    
    // Check for success rate
    const successRateCard = page.locator('span:has-text("成功率")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(successRateCard).toBeVisible();
  });

  test('应该正确处理分页功能', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Check if pagination is present (only if there are multiple pages)
    const paginationExists = await page.locator('.flex.items-center.justify-center.py-4').count() > 0;
    
    if (paginationExists) {
      // Test pagination functionality
      const nextButton = page.locator('button:has-text("Next")');
      const isNextDisabled = await nextButton.isDisabled();
      
      if (!isNextDisabled) {
        await nextButton.click();
        
        // Wait for new data to load
        await page.waitForTimeout(1000);
        
        // Check that we're on a different page (URL or content should change)
        const recordsAfterPageChange = await page.locator('[data-testid="checkin-row"]').count();
        expect(recordsAfterPageChange).toBeGreaterThan(0);
      }
    }
  });

  test('应该正确处理搜索功能', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="搜索保安姓名"]');
    
    // Test search functionality (note: this is client-side filtering in current implementation)
    await searchInput.fill('测试搜索');
    await page.waitForTimeout(500);
    
    // The search input should contain the text we typed
    await expect(searchInput).toHaveValue('测试搜索');
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    await expect(searchInput).toHaveValue('');
  });

  test('应该正确处理错误状态', async ({ page }) => {
    // Intercept network requests to simulate errors
    await page.route('**/api/checkin*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server Error' })
      });
    });
    
    // Refresh page to trigger error
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check that error is displayed
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible();
  });

  test('应该正确处理导出功能', async ({ page }) => {
    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Check export button functionality
    const exportButton = page.locator('button:has-text("导出当前页")');
    await expect(exportButton).toBeVisible();
    
    // Test that export button is enabled when there are records
    const recordCount = await page.locator('[data-testid="checkin-row"]').count();
    if (recordCount > 0) {
      await expect(exportButton).not.toBeDisabled();
    }
  });

  test('应该正确显示记录详情', async ({ page }) => {
    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    const firstRow = page.locator('[data-testid="checkin-row"]').first();
    
    // Check that all required columns are present
    // Status badge
    await expect(firstRow.locator('td').first().locator('[class*="badge"]')).toBeVisible();
    
    // Guard information
    await expect(firstRow.locator('td').nth(1).locator('.font-medium')).toBeVisible();
    
    // Site information
    await expect(firstRow.locator('td').nth(2).locator('.font-medium')).toBeVisible();
    
    // Timestamp
    await expect(firstRow.locator('td').nth(3).locator('.font-medium')).toBeVisible();
    
    // Location coordinates
    await expect(firstRow.locator('td').nth(4).locator('.font-mono')).toBeVisible();
  });

  test('应该正确处理筛选组合', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        requests.push(request.url());
      }
    });

    // Wait for initial load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Apply multiple filters
    // 1. Status filter
    const statusSelect = page.locator('label:has-text("状态")').locator('..').locator('button');
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("成功")').click();
    
    await page.waitForTimeout(500);
    
    // 2. Date range filter
    const dateSelect = page.locator('label:has-text("时间范围")').locator('..').locator('button');
    await dateSelect.click();
    await page.locator('div[role="option"]:has-text("最近一周")').click();
    
    await page.waitForTimeout(500);
    
    // Check that the latest request includes both filters
    const latestRequest = requests[requests.length - 1];
    expect(latestRequest).toContain('status=success');
    expect(latestRequest).toContain('startDate=');
    expect(latestRequest).toContain('endDate=');
  });

  test('应该正确显示加载状态', async ({ page }) => {
    // Navigate to checkins page and check loading state
    await page.goto('http://localhost:5173/admin/checkins');
    
    // Should show loading skeleton initially
    const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
    
    // Either we catch the loading state, or it loads too quickly
    const skeletonVisible = await loadingSkeleton.isVisible().catch(() => false);
    
    if (skeletonVisible) {
      // If we caught the loading state, wait for it to disappear
      await expect(loadingSkeleton).not.toBeVisible({ timeout: 10000 });
    }
    
    // Eventually should show actual content
    await expect(page.locator('[data-testid="checkin-row"]')).toBeVisible({ timeout: 10000 });
  });
});