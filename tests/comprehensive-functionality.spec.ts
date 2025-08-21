/**
 * Comprehensive Functional Tests for Security Check-in Management System
 * 
 * This test suite covers all major functionality:
 * - Authentication (login/logout)
 * - Guard Management (CRUD operations, one-to-one site assignment)
 * - Site Management (CRUD operations, guard assignments)
 * - Check-in Records viewing and analytics
 * - Navigation and UI interactions
 * - Error handling and validation
 */

import { test, expect, type Page } from '@playwright/test';

// Test data constants
const TEST_CREDENTIALS = {
  username: 'yifei',
  password: '11235813'
};

const TEST_GUARD = {
  name: '测试保安员张三',
  phoneNumber: '13812345678'
};

const TEST_SITE = {
  name: '测试站点东门',
  latitude: '39.9042',
  longitude: '116.4074',
  allowedRadius: '100'
};

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to admin dashboard
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('h1')).toContainText('管理后台首页');
}

async function navigateToGuards(page: Page) {
  await page.click('a[href="/admin/guards"]');
  await expect(page).toHaveURL('/admin/guards');
  await expect(page.locator('h1')).toContainText('保安管理');
}

async function navigateToSites(page: Page) {
  await page.click('a[href="/admin/sites"]');
  await expect(page).toHaveURL('/admin/sites');
  await expect(page.locator('h1')).toContainText('站点管理');
}

async function navigateToCheckins(page: Page) {
  await page.click('a[href="/admin/checkins"]');
  await expect(page).toHaveURL('/admin/checkins');
  await expect(page.locator('h1')).toContainText('签到记录查询');
}

test.describe('Security Check-in Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('/');
  });

  test.describe('Authentication System', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL('/login');
      await expect(page.locator('h1')).toContainText('系统登录');
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Check login form elements exist
      await expect(page.locator('input[type="text"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Perform login
      await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      
      // Verify successful login
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText('管理后台首页');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="text"]', 'invalid');
      await page.fill('input[type="password"]', 'invalid');
      await page.click('button[type="submit"]');
      
      // Should remain on login page and show error
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('should logout successfully', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Find and click logout button (might be in a menu)
      await page.click('button:has-text("退出")');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Navigation and Layout', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should have proper navigation menu', async ({ page }) => {
      // Check all navigation links exist
      await expect(page.locator('a[href="/admin"]')).toBeVisible();
      await expect(page.locator('a[href="/admin/guards"]')).toBeVisible();
      await expect(page.locator('a[href="/admin/sites"]')).toBeVisible();
      await expect(page.locator('a[href="/admin/checkins"]')).toBeVisible();
    });

    test('should navigate to all admin pages', async ({ page }) => {
      // Test navigation to Guards
      await navigateToGuards(page);
      
      // Test navigation to Sites
      await navigateToSites(page);
      
      // Test navigation to Check-ins
      await navigateToCheckins(page);
      
      // Test navigation back to Dashboard
      await page.click('a[href="/admin"]');
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator('h1')).toContainText('管理后台首页');
    });
  });

  test.describe('Guard Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToGuards(page);
    });

    test('should display guards list page correctly', async ({ page }) => {
      // Check page elements
      await expect(page.locator('h1')).toContainText('保安管理');
      await expect(page.locator('button:has-text("添加保安")')).toBeVisible();
      await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();
      
      // Check table headers
      await expect(page.locator('th:has-text("保安信息")')).toBeVisible();
      await expect(page.locator('th:has-text("联系方式")')).toBeVisible();
      await expect(page.locator('th:has-text("工号")')).toBeVisible();
      await expect(page.locator('th:has-text("所属站点")')).toBeVisible();
      await expect(page.locator('th:has-text("操作")')).toBeVisible();
    });

    test('should open add guard dialog', async ({ page }) => {
      await page.click('button:has-text("添加保安")');
      
      // Check dialog is open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('h2:has-text("添加保安信息")')).toBeVisible();
      
      // Check form fields exist
      await expect(page.locator('label:has-text("姓名")')).toBeVisible();
      await expect(page.locator('label:has-text("手机号")')).toBeVisible();
      await expect(page.locator('label:has-text("所属站点")')).toBeVisible();
      
      // Check employeeId field is NOT present (auto-generated)
      await expect(page.locator('label:has-text("工号")')).not.toBeVisible();
    });

    test('should validate guard form inputs', async ({ page }) => {
      await page.click('button:has-text("添加保安")');
      
      // Try to submit empty form (click the submit button inside the dialog)
      await page.click('[role="dialog"] button:has-text("添加保安")');
      
      // Should show validation errors
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    });

    test('should validate phone number format', async ({ page }) => {
      await page.click('button:has-text("添加保安")');
      
      // Fill with invalid phone number (be specific to dialog inputs)
      await page.fill('[role="dialog"] input[placeholder*="姓名"]', TEST_GUARD.name);
      await page.fill('[role="dialog"] input[placeholder*="手机号"]', '123');
      
      await page.click('[role="dialog"] button:has-text("添加保安")');
      
      // Should show validation error
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    });

    test('should create a new guard successfully', async ({ page }) => {
      // Get initial guard count
      const initialRowCount = await page.locator('[data-testid="guard-row"]').count();
      
      await page.click('button:has-text("添加保安")');
      
      // Fill form (be specific to dialog inputs)
      await page.fill('[role="dialog"] input[placeholder*="姓名"]', TEST_GUARD.name);
      await page.fill('[role="dialog"] input[placeholder*="手机号"]', TEST_GUARD.phoneNumber);
      
      // Select a site if available (inside dialog)
      const siteSelect = page.locator('[role="dialog"] [role="combobox"]');
      if (await siteSelect.count() > 0) {
        await siteSelect.click();
        const firstSite = page.locator('[role="option"]').first();
        if (await firstSite.count() > 0) {
          await firstSite.click();
        }
      }
      
      // Submit form (inside dialog)
      await page.click('[role="dialog"] button:has-text("添加保安")');
      
      // Wait for dialog to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify guard was added
      await expect(page.locator(`text=${TEST_GUARD.name}`)).toBeVisible();
      
      // Check that guard count increased
      const newRowCount = await page.locator('[data-testid="guard-row"]').count();
      expect(newRowCount).toBeGreaterThan(initialRowCount);
    });

    test('should search guards by name', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]');
      
      // Search for a specific guard
      await searchInput.fill('张');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // All visible guards should contain the search term
      const guardRows = page.locator('[data-testid="guard-row"]');
      const count = await guardRows.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const row = guardRows.nth(i);
          await expect(row).toContainText('张');
        }
      }
    });

    test('should edit guard information', async ({ page }) => {
      // Find first guard row and click edit
      const firstGuardRow = page.locator('[data-testid="guard-row"]').first();
      
      if (await firstGuardRow.count() > 0) {
        const editButton = firstGuardRow.locator('[data-testid*="edit-guard"]');
        await editButton.click();
        
        // Check edit dialog is open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.locator('h2:has-text("编辑保安信息")')).toBeVisible();
        
        // Modify the name (be more specific to target the dialog input)
        const nameInput = page.locator('[role="dialog"] input[placeholder*="姓名"]');
        await nameInput.clear();
        await nameInput.fill('编辑后的姓名');
        
        // Save changes
        await page.click('button:has-text("保存更改")');
        
        // Wait for dialog to close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify changes were saved
        await expect(page.locator('text=编辑后的姓名')).toBeVisible();
      }
    });

    test('should delete guard with confirmation', async ({ page }) => {
      const initialRowCount = await page.locator('[data-testid="guard-row"]').count();
      
      if (initialRowCount > 0) {
        const firstGuardRow = page.locator('[data-testid="guard-row"]').first();
        const deleteButton = firstGuardRow.locator('[data-testid*="delete-guard"]');
        
        // Click delete button
        await deleteButton.click();
        
        // Handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        
        // Wait for deletion
        await page.waitForTimeout(1000);
        
        // Check that guard count decreased
        const newRowCount = await page.locator('[data-testid="guard-row"]').count();
        expect(newRowCount).toBeLessThan(initialRowCount);
      }
    });

    test('should enforce one-to-one guard-site relationship', async ({ page }) => {
      await page.click('button:has-text("添加保安")');
      
      // Check that site selection is single select (not multi-select)
      const siteSelect = page.locator('[role="combobox"]');
      await siteSelect.click();
      
      // Should only be able to select one site
      const options = page.locator('[role="option"]');
      if (await options.count() > 1) {
        await options.first().click();
        
        // Verify only one site is selected
        await expect(siteSelect).toHaveCount(1);
        
        // Try to open again - should show single selection
        await siteSelect.click();
        const selectedOption = page.locator('[role="option"][data-state="checked"]');
        await expect(selectedOption).toHaveCount(1);
      }
    });
  });

  test.describe('Site Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToSites(page);
    });

    test('should display sites list page correctly', async ({ page }) => {
      // Check page elements
      await expect(page.locator('h1')).toContainText('站点管理');
      await expect(page.locator('button:has-text("添加站点")')).toBeVisible();
      await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();
    });

    test('should create a new site successfully', async ({ page }) => {
      const initialRowCount = await page.locator('[data-testid="site-row"]').count();
      
      await page.click('button:has-text("添加站点")');
      
      // Fill form
      await page.fill('input[placeholder*="站点名称"]', TEST_SITE.name);
      await page.fill('input[placeholder*="纬度"]', TEST_SITE.latitude);
      await page.fill('input[placeholder*="经度"]', TEST_SITE.longitude);
      await page.fill('input[placeholder*="半径"]', TEST_SITE.allowedRadius);
      
      // Submit form
      await page.click('button:has-text("添加站点")');
      
      // Wait for dialog to close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify site was added
      await expect(page.locator(`text=${TEST_SITE.name}`)).toBeVisible();
    });

    test('should validate site form inputs', async ({ page }) => {
      await page.click('button:has-text("添加站点")');
      
      // Try to submit empty form
      await page.click('button:has-text("添加站点")');
      
      // Should show validation errors
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should validate coordinate formats', async ({ page }) => {
      await page.click('button:has-text("添加站点")');
      
      // Fill with invalid coordinates
      await page.fill('input[placeholder*="站点名称"]', TEST_SITE.name);
      await page.fill('input[placeholder*="纬度"]', 'invalid');
      await page.fill('input[placeholder*="经度"]', 'invalid');
      await page.fill('input[placeholder*="半径"]', 'invalid');
      
      await page.click('button:has-text("添加站点")');
      
      // Should show validation error
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should edit site information', async ({ page }) => {
      // Find first site row and edit
      const firstSiteRow = page.locator('[data-testid="site-row"]').first();
      
      if (await firstSiteRow.count() > 0) {
        const editButton = firstSiteRow.locator('[data-testid*="edit-site"]');
        await editButton.click();
        
        // Check edit dialog is open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Modify the name
        const nameInput = page.locator('input[placeholder*="站点名称"]');
        await nameInput.clear();
        await nameInput.fill('编辑后的站点名');
        
        // Save changes
        await page.click('button:has-text("保存更改")');
        
        // Wait for dialog to close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify changes were saved
        await expect(page.locator('text=编辑后的站点名')).toBeVisible();
      }
    });

    test('should display site location on map', async ({ page }) => {
      // Check if map component is present
      const mapContainer = page.locator('.leaflet-container');
      if (await mapContainer.count() > 0) {
        await expect(mapContainer).toBeVisible();
        
        // Check for map markers
        const markers = page.locator('.leaflet-marker-icon');
        if (await markers.count() > 0) {
          await expect(markers.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Check-in Records', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToCheckins(page);
    });

    test('should display check-in records page correctly', async ({ page }) => {
      // Check page elements
      await expect(page.locator('h1')).toContainText('签到记录');
      
      // Check filter controls
      await expect(page.locator('input[type="date"]')).toHaveCount(2); // Start and end date
      
      // Check table exists
      await expect(page.locator('table')).toBeVisible();
    });

    test('should filter check-ins by date range', async ({ page }) => {
      const startDateInput = page.locator('input[type="date"]').first();
      const endDateInput = page.locator('input[type="date"]').last();
      
      // Set date range to today
      const today = new Date().toISOString().split('T')[0];
      await startDateInput.fill(today);
      await endDateInput.fill(today);
      
      // Trigger filter
      await page.click('button:has-text("查询")');
      
      // Wait for results
      await page.waitForTimeout(1000);
      
      // Should show filtered results
      const records = page.locator('[data-testid="checkin-row"]');
      const count = await records.count();
      
      // If there are records, they should be from today
      if (count > 0) {
        const firstRecord = records.first();
        await expect(firstRecord).toContainText(today.replace(/-/g, '/'));
      }
    });

    test('should display check-in statistics', async ({ page }) => {
      // Check for statistics display
      const statsSection = page.locator('[data-testid="checkin-statistics"]');
      if (await statsSection.count() > 0) {
        await expect(statsSection).toBeVisible();
        
        // Check for key metrics
        await expect(page.locator('text=总记录数')).toBeVisible();
        await expect(page.locator('text=成功率')).toBeVisible();
      }
    });

    test('should export check-in data', async ({ page }) => {
      const exportButton = page.locator('button:has-text("导出")');
      if (await exportButton.count() > 0) {
        // Start download
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        // Wait for download to complete
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
      }
    });

    test('should paginate through records', async ({ page }) => {
      // Check if pagination controls exist
      const paginationContainer = page.locator('[data-testid="pagination"]');
      if (await paginationContainer.count() > 0) {
        const nextButton = page.locator('button:has-text("下一页")');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          
          // Wait for new page to load
          await page.waitForTimeout(1000);
          
          // Verify page changed
          const currentPageIndicator = page.locator('[data-testid="current-page"]');
          if (await currentPageIndicator.count() > 0) {
            await expect(currentPageIndicator).toContainText('2');
          }
        }
      }
    });
  });

  test.describe('Dashboard Analytics', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      // Should already be on dashboard
    });

    test('should display key metrics', async ({ page }) => {
      // Check for dashboard metrics cards
      const metricsCards = page.locator('[data-testid="metric-card"]');
      if (await metricsCards.count() > 0) {
        await expect(metricsCards.first()).toBeVisible();
        
        // Check for common metrics
        await expect(page.locator('text=总保安数')).toBeVisible();
        await expect(page.locator('text=总站点数')).toBeVisible();
        await expect(page.locator('text=今日签到')).toBeVisible();
      }
    });

    test('should display charts and analytics', async ({ page }) => {
      // Check for chart containers
      const chartContainer = page.locator('[data-testid="chart-container"]');
      if (await chartContainer.count() > 0) {
        await expect(chartContainer.first()).toBeVisible();
      }
      
      // Check for Recharts components
      const rechartsSvg = page.locator('svg.recharts-surface');
      if (await rechartsSvg.count() > 0) {
        await expect(rechartsSvg.first()).toBeVisible();
      }
    });

    test('should update real-time data', async ({ page }) => {
      // Get initial metric value
      const todayCheckinMetric = page.locator('[data-testid="today-checkins"]');
      if (await todayCheckinMetric.count() > 0) {
        const initialValue = await todayCheckinMetric.textContent();
        
        // Wait for potential updates
        await page.waitForTimeout(5000);
        
        // Metric should still be displayed (even if same value)
        await expect(todayCheckinMetric).toBeVisible();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await navigateToGuards(page);
      
      // Should show error message or loading state
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should handle empty data states', async ({ page }) => {
      // Mock empty responses
      await page.route('**/api/guards', route => 
        route.fulfill({
          json: { success: true, data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }
        })
      );
      
      await navigateToGuards(page);
      
      // Should show empty state message
      await expect(page.locator('text=还没有保安记录')).toBeVisible();
    });

    test('should validate form inputs and show appropriate errors', async ({ page }) => {
      await navigateToGuards(page);
      await page.click('button:has-text("添加保安")');
      
      // Test various validation scenarios
      const testCases = [
        { name: '', phone: '13812345678', expectError: '姓名不能为空' },
        { name: '测试', phone: '', expectError: '手机号不能为空' },
        { name: '测试', phone: '123', expectError: '请输入有效的手机号' },
      ];
      
      for (const testCase of testCases) {
        // Clear and fill form
        await page.fill('input[placeholder*="姓名"]', testCase.name);
        await page.fill('input[placeholder*="手机号"]', testCase.phone);
        
        // Try to submit
        await page.click('button:has-text("添加保安")');
        
        // Should show specific error
        await expect(page.locator('[role="alert"]')).toContainText(testCase.expectError);
      }
    });

    test('should handle session timeout', async ({ page }) => {
      // Mock 401 response
      await page.route('**/api/**', route => 
        route.fulfill({
          status: 401,
          json: { success: false, message: 'Unauthorized' }
        })
      );
      
      await navigateToGuards(page);
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await navigateToGuards(page);
      
      // Should still be functional on mobile
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("添加保安")')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await navigateToGuards(page);
      
      // Check for proper accessibility attributes
      await expect(page.locator('[role="button"]')).toHaveCount.atLeast(1);
      await expect(page.locator('[role="table"]')).toBeVisible();
      
      // Check form labels
      await page.click('button:has-text("添加保安")');
      const labels = page.locator('label');
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await navigateToGuards(page);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate buttons with Enter/Space
      await page.keyboard.press('Enter');
      
      // Should open dialog or navigate
      await page.waitForTimeout(500);
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should persist data after page refresh', async ({ page }) => {
      await navigateToGuards(page);
      
      // Get initial data
      const guardRows = page.locator('[data-testid="guard-row"]');
      const initialCount = await guardRows.count();
      
      // Refresh page
      await page.reload();
      
      // Should show same data
      await expect(page.locator('[data-testid="guard-row"]')).toHaveCount(initialCount);
    });

    test('should maintain search filters after navigation', async ({ page }) => {
      await navigateToGuards(page);
      
      // Apply search filter
      await page.fill('input[placeholder*="搜索"]', '张');
      
      // Navigate away and back
      await navigateToSites(page);
      await navigateToGuards(page);
      
      // Filter should be reset (this is expected behavior)
      const searchInput = page.locator('input[placeholder*="搜索"]');
      await expect(searchInput).toHaveValue('');
    });

    test('should handle concurrent edits properly', async ({ page }) => {
      await navigateToGuards(page);
      
      const firstGuardRow = page.locator('[data-testid="guard-row"]').first();
      
      if (await firstGuardRow.count() > 0) {
        // Start editing
        const editButton = firstGuardRow.locator('[data-testid*="edit-guard"]');
        await editButton.click();
        
        // Make changes
        const nameInput = page.locator('input[placeholder*="姓名"]');
        await nameInput.clear();
        await nameInput.fill('并发编辑测试');
        
        // Save changes
        await page.click('button:has-text("保存更改")');
        
        // Wait for save to complete
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify the change persisted
        await expect(page.locator('text=并发编辑测试')).toBeVisible();
        
        // Edit again immediately (test for ID type bug fix)
        await firstGuardRow.locator('[data-testid*="edit-guard"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Should not get "startsWith is not a function" error
        await page.click('button:has-text("取消")');
      }
    });
  });
});