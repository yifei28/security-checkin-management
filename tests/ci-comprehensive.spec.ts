/**
 * CI/CD Comprehensive Test Suite
 *
 * This test suite is designed to run before every GitHub push to ensure
 * all critical functionality works correctly. It covers:
 *
 * 1. Build and TypeScript validation
 * 2. Authentication and authorization
 * 3. Core CRUD operations
 * 4. API response handling
 * 5. Navigation and routing
 * 6. Error handling
 * 7. Data persistence
 *
 * Run with: npx playwright test tests/ci-comprehensive.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

/*
const TEST_DATA = {
  guard: {
    name: 'CI测试保安',
    phoneNumber: '13800138000'
  },
  site: {
    name: 'CI测试站点',
    latitude: '39.9042',
    longitude: '116.4074',
    allowedRadius: '100'
  }
};
*/

// Helper functions
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('安全巡检管理系统');

  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('h1')).toContainText('管理后台首页');
}

async function logout(page: Page): Promise<void> {
  // Look for logout button or menu
  const logoutButton = page.locator('button:has-text("退出登录"), a:has-text("退出登录")');
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await expect(page).toHaveURL('/login');
  }
}

async function checkNoTypeScriptErrors(page: Page): Promise<string[]> {
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Return TypeScript-related errors
  return consoleErrors.filter(error =>
    error.includes('Type') ||
    error.includes('is not assignable') ||
    error.includes('missing the following properties') ||
    error.includes('toISOString') ||
    error.includes('is not a function') ||
    error.includes('Cannot read property')
  );
}

test.describe('CI/CD Comprehensive Test Suite', () => {

  test.describe('🔧 Build and TypeScript Validation', () => {
    test('应用应该无TypeScript编译错误启动', async ({ page }) => {
      const tsErrors = await checkNoTypeScriptErrors(page);

      await page.goto('/');
      await page.waitForTimeout(2000); // Allow app to fully load

      // Should redirect to login or admin based on auth state
      expect(page.url()).toMatch(/\/(login|admin)/);

      // No TypeScript errors should occur during startup
      expect(tsErrors).toHaveLength(0);
    });
  });

  test.describe('🔐 Authentication and Authorization', () => {
    test('应该能成功登录和退出', async ({ page }) => {
      // Test login
      await loginAsAdmin(page);

      // Verify authentication state
      const userData = await page.evaluate(() => localStorage.getItem('user'));
      expect(userData).toBeTruthy();

      const user = JSON.parse(userData || '{}');
      expect(user.username).toBe(TEST_CREDENTIALS.username);
      expect(typeof user.createdAt).toBe('string'); // Date should be string after TypeScript fix

      // Test logout if available
      await logout(page);
    });

    test('应该正确处理无效登录', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="text"]', 'invalid');
      await page.fill('input[type="password"]', 'invalid');
      await page.click('button[type="submit"]');

      // Should show error and stay on login page
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('应该保护管理页面需要认证', async ({ page }) => {
      // Clear any existing auth
      await page.evaluate(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      });

      // Try to access admin page directly
      await page.goto('/admin');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('🧭 Navigation and Routing', () => {
    test('应该能在所有主要页面间导航', async ({ page }) => {
      await loginAsAdmin(page);

      const routes = [
        { path: '/admin', title: '管理后台首页' },
        { path: '/admin/guards', title: '保安管理' },
        { path: '/admin/sites', title: '站点管理' },
        { path: '/admin/checkins', title: '签到记录' }
      ];

      for (const route of routes) {
        await page.goto(route.path);
        await expect(page).toHaveURL(route.path);
        await expect(page.locator('h1')).toContainText(route.title);

        // Wait for page to load
        await page.waitForTimeout(1000);
      }
    });

    test('应该正确处理页面刷新', async ({ page }) => {
      await loginAsAdmin(page);

      // Go to guards page
      await page.goto('/admin/guards');
      await expect(page.locator('h1')).toContainText('保安管理');

      // Refresh page
      await page.reload();

      // Should stay authenticated and on same page
      await expect(page).toHaveURL('/admin/guards');
      await expect(page.locator('h1')).toContainText('保安管理');
    });
  });

  test.describe('📊 API Response Handling', () => {
    test('应该能正确加载各页面数据', async ({ page }) => {
      await loginAsAdmin(page);

      const dataPages = [
        { path: '/admin/guards', loadingIndicator: 'table, [data-testid="loading"], .loading' },
        { path: '/admin/sites', loadingIndicator: 'table, [data-testid="loading"], .loading' },
        { path: '/admin/checkins', loadingIndicator: 'table, [data-testid="loading"], .loading' }
      ];

      for (const dataPage of dataPages) {
        await page.goto(dataPage.path);

        // Wait for either data to load or loading state to appear
        await page.waitForTimeout(2000);

        // Page should not show critical errors
        const errorElements = page.locator('[role="alert"]:has-text("错误"), .error');
        const errorCount = await errorElements.count();

        if (errorCount > 0) {
          const errorTexts = await errorElements.allTextContents();
          console.log(`警告: ${dataPage.path} 页面显示错误:`, errorTexts);
        }

        // At minimum, page should load without crashing
        await expect(page.locator('h1')).toBeVisible();
      }
    });
  });

  test.describe('⚠️ Error Handling', () => {
    test('应该优雅处理网络错误', async ({ page }) => {
      await loginAsAdmin(page);

      // Mock network failure for API calls
      await page.route('**/api/**', route => route.abort());

      // Navigate to a data page
      await page.goto('/admin/guards');

      // Should handle error gracefully without crashing
      await page.waitForTimeout(3000);

      // Page should still be functional
      await expect(page.locator('h1')).toContainText('保安管理');

      // Clear route mock
      await page.unroute('**/api/**');
    });

    test('应该处理表单验证错误', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/guards');

      // Try to open add guard dialog
      const addButton = page.locator('button:has-text("添加保安"), button:has-text("添加")');
      if (await addButton.count() > 0) {
        await addButton.click();

        // Try to submit empty form
        const submitButton = page.locator('[role="dialog"] button:has-text("添加"), [role="dialog"] button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();

          // Should show validation errors
          await page.waitForTimeout(1000);

          // Dialog should still be open (form invalid)
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.count() > 0) {
            expect(await dialog.isVisible()).toBe(true);
          }
        }
      }
    });
  });

  test.describe('💾 Data Persistence', () => {
    test('应该正确保存和恢复认证状态', async ({ page }) => {
      // Login
      await loginAsAdmin(page);

      // Check localStorage has auth data
      const authData = await page.evaluate(() => ({
        user: localStorage.getItem('user'),
        token: localStorage.getItem('token')
      }));

      expect(authData.user).toBeTruthy();
      expect(authData.token).toBeTruthy();

      // Refresh page
      await page.reload();

      // Should still be authenticated
      await expect(page).toHaveURL(/\/admin/);

      // Auth data should persist
      const persistedAuthData = await page.evaluate(() => ({
        user: localStorage.getItem('user'),
        token: localStorage.getItem('token')
      }));

      expect(persistedAuthData.user).toBe(authData.user);
      expect(persistedAuthData.token).toBe(authData.token);
    });
  });

  test.describe('🎯 Core Functionality Smoke Tests', () => {
    test('保安管理页面基本功能', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/guards');

      // Page should load
      await expect(page.locator('h1')).toContainText('保安管理');

      // Should have some UI elements
      const hasAddButton = await page.locator('button:has-text("添加")').count() > 0;
      const hasTable = await page.locator('table').count() > 0;
      const hasSearchInput = await page.locator('input[placeholder*="搜索"], input[placeholder*="查找"]').count() > 0;

      // At least one of these should exist
      expect(hasAddButton || hasTable || hasSearchInput).toBe(true);
    });

    test('站点管理页面基本功能', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/sites');

      // Page should load
      await expect(page.locator('h1')).toContainText('站点管理');

      // Should have some UI elements
      const hasAddButton = await page.locator('button:has-text("添加")').count() > 0;
      const hasTable = await page.locator('table').count() > 0;
      const hasMapView = await page.locator('.leaflet-container, [data-testid="map"]').count() > 0;

      // At least one of these should exist
      expect(hasAddButton || hasTable || hasMapView).toBe(true);
    });

    test('签到记录页面基本功能', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/checkins');

      // Page should load
      await expect(page.locator('h1')).toContainText('签到记录');

      // Should have some UI elements
      const hasTable = await page.locator('table').count() > 0;
      const hasDateFilter = await page.locator('input[type="date"]').count() > 0;
      const hasExportButton = await page.locator('button:has-text("导出")').count() > 0;

      // At least one of these should exist
      expect(hasTable || hasDateFilter || hasExportButton).toBe(true);
    });
  });

  test.describe('🚀 Performance and Stability', () => {
    test('应用应该在合理时间内加载', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('安全巡检管理系统');

      const loadTime = Date.now() - startTime;

      // Should load within 10 seconds (generous for CI)
      expect(loadTime).toBeLessThan(10000);
    });

    test('应该处理快速页面切换', async ({ page }) => {
      await loginAsAdmin(page);

      const pages = ['/admin', '/admin/guards', '/admin/sites', '/admin/checkins', '/admin'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(500); // Quick switch
      }

      // Should end up on dashboard without errors
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('h1')).toContainText('管理后台首页');
    });
  });

  test.describe('🔍 Final System Health Check', () => {
    test('整体系统健康检查', async ({ page }) => {
      const tsErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const errorText = msg.text();
          if (errorText.includes('Type') ||
              errorText.includes('is not assignable') ||
              errorText.includes('missing the following properties') ||
              errorText.includes('toISOString') ||
              errorText.includes('is not a function') ||
              errorText.includes('Cannot read property')) {
            tsErrors.push(errorText);
          }
        }
      });

      // Full user journey
      await loginAsAdmin(page);

      // Visit all main pages
      const mainPages = ['/admin', '/admin/guards', '/admin/sites', '/admin/checkins'];
      for (const pagePath of mainPages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1000);
      }

      // Logout
      await logout(page);

      // Final check: no TypeScript errors throughout the journey
      expect(tsErrors).toHaveLength(0);

      console.log('✅ 系统健康检查完成 - 所有核心功能正常工作');
    });
  });
});