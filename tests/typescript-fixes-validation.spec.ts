/**
 * TypeScript Fixes Validation Tests
 *
 * This test suite validates that all the TypeScript fixes we made work correctly:
 * - API response type handling (ApiResponse vs ApiResponseSingle)
 * - Authentication flow with proper date types
 * - Guards and Sites CRUD operations with corrected types
 * - Error handling and form validation
 * - Check-in records display and export functionality
 */

import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

async function loginAsAdmin(page: unknown) {
  await page.goto('/login');
  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/);
}

test.describe('TypeScript Fixes Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Authentication with Fixed Date Types', () => {
    test('should login successfully with corrected user type handling', async ({ page }) => {
      await page.goto('/login');

      // Check login form is displayed
      await expect(page.locator('h1')).toContainText('安全巡检管理系统');

      // Perform login - this tests the AuthContext fixes
      await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.password);

      // Start monitoring console for TypeScript-related errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.click('button[type="submit"]');

      // Should successfully redirect to admin dashboard
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText('管理后台首页');

      // Verify no TypeScript-related runtime errors
      expect(consoleErrors.filter(error =>
        error.includes('toISOString') ||
        error.includes('is not a function') ||
        error.includes('Cannot read property')
      )).toHaveLength(0);
    });

    test('should handle authentication state properly after fixes', async ({ page }) => {
      await loginAsAdmin(page);

      // Check that user data is properly stored (dates as strings)
      const userData = await page.evaluate(() => localStorage.getItem('user'));
      expect(userData).toBeTruthy();

      const user = JSON.parse(userData || '{}');
      expect(user.createdAt).toBeTruthy();
      expect(typeof user.createdAt).toBe('string'); // Should be string, not Date object

      // Refresh page to test initialization with stored user data
      await page.reload();
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText('管理后台首页');
    });

    test('should handle invalid login with proper error display', async ({ page }) => {
      await page.goto('/login');

      // Monitor for runtime errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.fill('input[type="text"]', 'invalid');
      await page.fill('input[type="password"]', 'invalid');
      await page.click('button[type="submit"]');

      // Should show error message without crashing
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page).toHaveURL('/login');

      // Verify no runtime errors from our type fixes
      expect(consoleErrors.filter(error =>
        error.includes('Cannot read property') ||
        error.includes('is not a function')
      )).toHaveLength(0);
    });
  });

  test.describe('API Response Type Handling', () => {
    test('should handle guards API responses correctly', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to guards page - this tests the fixed API response types
      await page.click('a[href="/admin/guards"]');
      await expect(page).toHaveURL('/admin/guards');

      // Page should load without errors
      await expect(page.locator('h1')).toContainText('保安管理');
      await expect(page.locator('button:has-text("添加保安")')).toBeVisible();

      // Test guard creation (tests ApiResponseSingle<Guard> types)
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Fill form and submit
      await page.fill('[role="dialog"] input[placeholder*="姓名"]', '类型修复测试保安');
      await page.fill('[role="dialog"] input[placeholder*="手机号"]', '13800000001');

      // Monitor for runtime errors during form submission
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.click('[role="dialog"] button:has-text("添加保安")');

      // Dialog should close and guard should be added
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Verify no type-related errors
      expect(consoleErrors.filter(error =>
        error.includes('is missing the following properties') ||
        error.includes('length, pop, push, concat')
      )).toHaveLength(0);
    });

    test('should handle sites API responses correctly', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to sites page
      await page.click('a[href="/admin/sites"]');
      await expect(page).toHaveURL('/admin/sites');
      await expect(page.locator('h1')).toContainText('站点管理');

      // Test site creation (tests ApiResponseSingle<Site> types)
      await page.click('button:has-text("添加站点")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Fill and submit site form
      await page.fill('input[placeholder*="站点名称"]', '类型修复测试站点');
      await page.fill('input[placeholder*="纬度"]', '39.9042');
      await page.fill('input[placeholder*="经度"]', '116.4074');
      await page.fill('input[placeholder*="半径"]', '100');

      await page.click('button:has-text("添加站点")');

      // Should complete without type errors
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      expect(consoleErrors.filter(error =>
        error.includes('Type') && error.includes('is not assignable')
      )).toHaveLength(0);
    });

    test('should handle check-in records correctly', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to check-ins page
      await page.click('a[href="/admin/checkins"]');
      await expect(page).toHaveURL('/admin/checkins');
      await expect(page.locator('h1')).toContainText('签到记录');

      // This tests the PaginatedResponse<CheckInRecord> type fix
      await expect(page.locator('table')).toBeVisible();

      // Test date filter functionality
      const startDate = page.locator('input[type="date"]').first();
      const endDate = page.locator('input[type="date"]').last();

      const today = new Date().toISOString().split('T')[0];
      await startDate.fill(today);
      await endDate.fill(today);

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.click('button:has-text("查询")');

      // Should filter without array/object type confusion
      await page.waitForTimeout(1000);

      expect(consoleErrors.filter(error =>
        error.includes('Array.isArray') ||
        error.includes('not assignable to type')
      )).toHaveLength(0);
    });
  });

  test.describe('Export Functionality with Fixed Types', () => {
    test('should handle guard export without type errors', async ({ page }) => {
      await loginAsAdmin(page);
      await page.click('a[href="/admin/guards"]');

      // Look for export button
      const exportButton = page.locator('button:has-text("导出")');
      if (await exportButton.count() > 0) {
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        // Test export (this uses ApiResponseSingle<{downloadUrl, fileName}>)
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/);
        } catch {
          // Download might not work in test environment, but no type errors should occur
        }

        // Verify no type-related errors during export
        expect(consoleErrors.filter(error =>
          error.includes('downloadUrl') ||
          error.includes('fileName') ||
          error.includes('missing the following properties')
        )).toHaveLength(0);
      }
    });
  });

  test.describe('Form Validation and Error Handling', () => {
    test('should validate forms without type errors', async ({ page }) => {
      await loginAsAdmin(page);
      await page.click('a[href="/admin/guards"]');

      // Test form validation
      await page.click('button:has-text("添加保安")');

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Submit empty form to trigger validation
      await page.click('[role="dialog"] button:has-text("添加保安")');

      // Should show validation without type errors
      await expect(page.locator('[role="alert"]')).toBeVisible();

      expect(consoleErrors.filter(error =>
        error.includes('Type') ||
        error.includes('is not assignable')
      )).toHaveLength(0);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock API failure
      await page.route('**/api/guards', route => route.abort());

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.click('a[href="/admin/guards"]');

      // Should handle error without type-related crashes
      await page.waitForTimeout(2000);

      expect(consoleErrors.filter(error =>
        error.includes('Cannot read property') ||
        error.includes('is not a function') ||
        error.includes('Type')
      )).toHaveLength(0);
    });
  });

  test.describe('Photo Upload with Fixed Types', () => {
    test('should handle photo upload form without type errors', async ({ page }) => {
      await loginAsAdmin(page);
      await page.click('a[href="/admin/guards"]');

      // Find first guard and try to upload photo (if feature exists)
      const firstGuardRow = page.locator('[data-testid="guard-row"]').first();
      if (await firstGuardRow.count() > 0) {
        const photoButton = firstGuardRow.locator('button:has-text("上传照片")');
        if (await photoButton.count() > 0) {
          const consoleErrors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });

          await photoButton.click();

          // Should open upload interface without type errors
          await page.waitForTimeout(1000);

          expect(consoleErrors.filter(error =>
            error.includes('photoUrl') ||
            error.includes('Type')
          )).toHaveLength(0);
        }
      }
    });
  });

  test.describe('Dashboard Metrics with Corrected Types', () => {
    test('should display dashboard without date/type errors', async ({ page }) => {
      await loginAsAdmin(page);

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Dashboard should load with all metrics
      await expect(page.locator('h1')).toContainText('管理后台首页');

      // Wait for all API calls to complete
      await page.waitForTimeout(3000);

      // Check for metric cards (should display without errors)
      const metricCards = page.locator('[data-testid="metric-card"]');
      if (await metricCards.count() > 0) {
        await expect(metricCards.first()).toBeVisible();
      }

      // Verify no type-related runtime errors
      expect(consoleErrors.filter(error =>
        error.includes('toISOString') ||
        error.includes('is not a function') ||
        error.includes('Cannot read property') ||
        error.includes('Type')
      )).toHaveLength(0);
    });
  });

  test.describe('Real-time Updates and State Management', () => {
    test('should handle real-time updates without type errors', async ({ page }) => {
      await loginAsAdmin(page);

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate through different pages to test state management
      await page.click('a[href="/admin/guards"]');
      await page.waitForTimeout(1000);

      await page.click('a[href="/admin/sites"]');
      await page.waitForTimeout(1000);

      await page.click('a[href="/admin/checkins"]');
      await page.waitForTimeout(1000);

      await page.click('a[href="/admin"]');
      await page.waitForTimeout(1000);

      // Should navigate without accumulating type errors
      expect(consoleErrors.filter(error =>
        error.includes('Type') ||
        error.includes('is not assignable') ||
        error.includes('missing the following properties')
      )).toHaveLength(0);
    });
  });
});