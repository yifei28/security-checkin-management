import { test, expect } from '@playwright/test';

/**
 * Frontend-Only Checkin Optimization Tests
 * 
 * This test suite focuses on testing the frontend optimizations without requiring backend authentication:
 * - UI component rendering
 * - Filter interface functionality
 * - Client-side interactions
 * - Component state management
 */
test.describe('Checkin Frontend Optimization Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock the API responses to avoid authentication issues
    await page.route('**/api/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: '1',
              username: 'testuser',
              role: 'admin',
              createdAt: '2024-01-01T00:00:00',
              isActive: true
            },
            expiresIn: 3600,
            tokenType: 'Bearer'
          }
        })
      });
    });

    await page.route('**/api/guards', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'guard_1',
              name: '张三',
              phoneNumber: '13800138001',
              photoUrl: 'https://example.com/photo1.jpg',
              assignedSiteIds: ['site_1']
            },
            {
              id: 'guard_2', 
              name: '李四',
              phoneNumber: '13800138002',
              photoUrl: 'https://example.com/photo2.jpg',
              assignedSiteIds: ['site_2']
            }
          ]
        })
      });
    });

    await page.route('**/api/sites', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'site_1',
              name: '北京总部',
              latitude: 39.9088,
              longitude: 116.3974,
              assignedGuardIds: ['guard_1']
            },
            {
              id: 'site_2',
              name: '上海分公司', 
              latitude: 31.2304,
              longitude: 121.4737,
              assignedGuardIds: ['guard_2']
            }
          ]
        })
      });
    });

    await page.route('**/api/checkin**', (route) => {
      const url = new URL(route.request().url());
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      
      // Generate mock data based on parameters
      const mockRecords = [
        {
          id: 'checkin_1',
          guardId: 'guard_1',
          siteId: 'site_1',
          timestamp: '2025-08-10T09:30:00',
          location: { lat: 39.9088, lng: 116.3974 },
          faceImageUrl: 'https://example.com/face1.jpg',
          status: 'success',
          reason: null
        },
        {
          id: 'checkin_2',
          guardId: 'guard_2', 
          siteId: 'site_2',
          timestamp: '2025-08-10T09:15:00',
          location: { lat: 31.2304, lng: 121.4737 },
          faceImageUrl: 'https://example.com/face2.jpg',
          status: 'failed',
          reason: '人脸识别失败'
        },
        {
          id: 'checkin_3',
          guardId: 'guard_1',
          siteId: 'site_1', 
          timestamp: '2025-08-10T08:45:00',
          location: { lat: 39.9088, lng: 116.3974 },
          faceImageUrl: 'https://example.com/face3.jpg',
          status: 'success',
          reason: null
        }
      ];

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockRecords,
          pagination: {
            total: 3,
            page: page,
            pageSize: pageSize,
            totalPages: 1
          },
          statistics: {
            totalRecords: 3,
            successCount: 2,
            failedCount: 1,
            pendingCount: 0,
            successRate: 67
          }
        })
      });
    });
  });

  test('应该成功加载并显示优化后的签到记录页面', async ({ page }) => {
    // Navigate to login and complete authentication
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to checkins page
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Verify the page loaded correctly
    await expect(page.locator('h1')).toContainText('签到记录查询');
    
    // Check for filter components
    await expect(page.locator('label:has-text("搜索")')).toBeVisible();
    await expect(page.locator('label:has-text("状态")')).toBeVisible();
    await expect(page.locator('label:has-text("保安")')).toBeVisible();
    await expect(page.locator('label:has-text("站点")')).toBeVisible();
    await expect(page.locator('label:has-text("时间范围")')).toBeVisible();
    
    // Verify export button
    await expect(page.locator('button:has-text("导出当前页")')).toBeVisible();
  });

  test('应该正确显示优化后的数据映射', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Check that we have records displayed
    const recordRows = page.locator('[data-testid="checkin-row"]');
    await expect(recordRows).toHaveCount(3);
    
    // Verify first record shows correct mapped data
    const firstRow = recordRows.first();
    
    // Check guard name mapping (should show "张三", not "未知保安")
    const guardCell = firstRow.locator('td').nth(1);
    await expect(guardCell.locator('.font-medium')).toContainText('张三');
    
    // Check site name mapping (should show "北京总部", not "未知站点")
    const siteCell = firstRow.locator('td').nth(2);
    await expect(siteCell.locator('.font-medium')).toContainText('北京总部');
    
    // Check status badge
    const statusCell = firstRow.locator('td').first();
    await expect(statusCell.locator('[class*="badge"]')).toBeVisible();
  });

  test('应该正确显示统计信息优化', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Wait for statistics to load
    await page.waitForSelector('.text-2xl.font-bold', { timeout: 10000 });
    
    // Check total records shows 3 (from mock data)
    const totalCard = page.locator('span:has-text("总记录")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(totalCard).toContainText('3');
    
    // Check successful checkins shows 2
    const successCard = page.locator('span:has-text("成功签到")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(successCard).toContainText('2');
    
    // Check failed checkins shows 1
    const failedCard = page.locator('span:has-text("失败签到")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(failedCard).toContainText('1');
    
    // Check success rate shows 67%
    const successRateCard = page.locator('span:has-text("成功率")').locator('..').locator('..').locator('.text-2xl.font-bold');
    await expect(successRateCard).toContainText('67%');
  });

  test('应该正确处理筛选器交互', async ({ page }) => {
    const requestUrls: string[] = [];
    
    // Monitor requests to check debouncing
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        requestUrls.push(request.url());
        console.log(`[DEBUG] API request: ${request.url()}`);
      }
    });

    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    const initialRequestCount = requestUrls.length;
    
    // Test status filter
    const statusSelect = page.locator('label:has-text("状态")').locator('..').locator('button');
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("成功")').click();
    
    // Wait for debounce
    await page.waitForTimeout(500);
    
    // Test date range filter  
    const dateSelect = page.locator('label:has-text("时间范围")').locator('..').locator('button');
    await dateSelect.click();
    await page.locator('div[role="option"]:has-text("最近一周")').click();
    
    await page.waitForTimeout(500);
    
    // Should have made additional requests for filter changes
    expect(requestUrls.length).toBeGreaterThan(initialRequestCount);
    
    // Check that latest request includes filter parameters
    const latestRequest = requestUrls[requestUrls.length - 1];
    expect(latestRequest).toContain('status=success');
    expect(latestRequest).toContain('startDate=');
    expect(latestRequest).toContain('endDate=');
  });

  test('应该正确处理搜索功能', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="搜索保安姓名"]');
    
    // Test search input functionality
    await searchInput.fill('张三');
    await expect(searchInput).toHaveValue('张三');
    
    // Clear search
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('应该正确显示距离计算优化', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    // Check that distance calculations are displayed
    const firstRow = page.locator('[data-testid="checkin-row"]').first();
    const siteCell = firstRow.locator('td').nth(2);
    
    // Should show distance information since mock locations match site coordinates
    const distanceInfo = siteCell.locator('text=/距离/');
    await expect(distanceInfo).toBeVisible();
  });

  test('应该正确处理导出功能', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    const exportButton = page.locator('button:has-text("导出当前页")');
    
    // Should be enabled since we have records
    await expect(exportButton).not.toBeDisabled();
    
    // Should show record count in button text
    await expect(exportButton).toContainText('(3)');
  });

  test('应该正确显示加载状态和错误处理', async ({ page }) => {
    // Test loading state
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    
    // Check for loading skeleton (might load too quickly to catch)
    const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
    const hasLoadingState = await loadingSkeleton.isVisible().catch(() => false);
    
    if (hasLoadingState) {
      console.log('[DEBUG] Caught loading state');
      await expect(loadingSkeleton).not.toBeVisible({ timeout: 10000 });
    }
    
    // Should eventually show content
    await expect(page.locator('[data-testid="checkin-row"]')).toBeVisible({ timeout: 10000 });
  });

  test('应该正确处理清空筛选功能', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Set some filters
    const statusSelect = page.locator('label:has-text("状态")').locator('..').locator('button');
    await statusSelect.click();
    await page.locator('div[role="option"]:has-text("成功")').click();
    
    const searchInput = page.locator('input[placeholder*="搜索保安姓名"]');
    await searchInput.fill('测试');
    
    // Should show clear filters button
    const clearButton = page.locator('button:has-text("清空筛选")');
    await expect(clearButton).toBeVisible();
    
    // Click clear button
    await clearButton.click();
    
    // Filters should be reset
    await expect(searchInput).toHaveValue('');
    // Status filter should be back to "全部状态" - we can check this by ensuring clear button is hidden
    await expect(clearButton).not.toBeVisible();
  });

  test('应该正确处理时间格式显示', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');

    // Wait for records to load
    await page.waitForSelector('[data-testid="checkin-row"]', { timeout: 10000 });
    
    const firstRow = page.locator('[data-testid="checkin-row"]').first();
    const timeCell = firstRow.locator('td').nth(3);
    
    // Should display formatted date
    const dateElement = timeCell.locator('.font-medium');
    await expect(dateElement).toBeVisible();
    
    // Should display formatted time  
    const timeElement = timeCell.locator('.text-sm.text-muted-foreground');
    await expect(timeElement).toBeVisible();
  });
});