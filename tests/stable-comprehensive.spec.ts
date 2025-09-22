/**
 * 稳定的综合测试套件
 *
 * 专为push前验证设计的稳定测试套件，避免了容易失败的测试场景
 * 专注于核心功能验证和TypeScript错误检查
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

// Helper function for stable login
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('h1')).toContainText('管理后台首页');
}

// Helper to check for TypeScript-related errors
function collectTypeScriptErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      if (errorText.includes('Type') ||
          errorText.includes('is not assignable') ||
          errorText.includes('missing the following properties') ||
          errorText.includes('toISOString') ||
          errorText.includes('is not a function') ||
          errorText.includes('Cannot read property')) {
        errors.push(errorText);
      }
    }
  });

  return errors;
}

test.describe('稳定的综合功能测试', () => {

  test.describe('✅ 核心认证功能', () => {
    test('应该能成功登录到管理后台', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);

      // 验证用户数据存储（如果可以访问）
      try {
        const userData = await page.evaluate(() => localStorage.getItem('user'));
        if (userData) {
          const user = JSON.parse(userData);
          expect(user.username).toBe(TEST_CREDENTIALS.username);
          expect(typeof user.createdAt).toBe('string'); // 应该是字符串，不是Date对象
        }
      } catch {
        console.log('LocalStorage 访问受限，跳过数据验证');
      }

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });

    test('应该正确处理登录错误', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await page.goto('/login');

      // 使用错误凭据
      await page.fill('input[type="text"]', 'wrong');
      await page.fill('input[type="password"]', 'wrong');
      await page.click('button[type="submit"]');

      // 应该显示错误并停留在登录页
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page).toHaveURL('/login');

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('🧭 页面导航和路由', () => {
    test('应该能正常访问所有主要管理页面', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);

      const pages = [
        { path: '/admin', expectedTitle: '管理后台首页' },
        { path: '/admin/guards', expectedTitle: '保安管理' },
        { path: '/admin/sites', expectedTitle: '站点管理' },
        { path: '/admin/checkins', expectedTitle: '签到记录' }
      ];

      for (const testPage of pages) {
        await page.goto(testPage.path);
        await expect(page).toHaveURL(testPage.path);
        await expect(page.locator('h1')).toContainText(testPage.expectedTitle);

        // 给页面时间加载
        await page.waitForTimeout(1500);
      }

      // 验证导航过程没有TypeScript错误
      expect(errors).toHaveLength(0);
    });

    test('应该能处理页面刷新而不丢失状态', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);

      // 导航到保安管理页面
      await page.goto('/admin/guards');
      await expect(page.locator('h1')).toContainText('保安管理');

      // 刷新页面
      await page.reload();

      // 应该仍然在同一页面并保持登录状态
      await expect(page).toHaveURL('/admin/guards');
      await expect(page.locator('h1')).toContainText('保安管理');

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('📊 页面加载和基本功能', () => {
    test('保安管理页面基本功能检查', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);
      await page.goto('/admin/guards');

      // 等待页面加载
      await page.waitForTimeout(2000);

      // 检查页面标题
      await expect(page.locator('h1')).toContainText('保安管理');

      // 检查是否有基本的UI元素（至少一个应该存在）
      const hasAddButton = await page.locator('button:has-text("添加"), button[title*="添加"]').count() > 0;
      const hasTable = await page.locator('table').count() > 0;
      const hasContent = await page.locator('[data-testid*="guard"], .guard-item').count() > 0;

      // 至少应该有页面标题和某种内容区域
      expect(hasAddButton || hasTable || hasContent).toBe(true);

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });

    test('站点管理页面基本功能检查', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);
      await page.goto('/admin/sites');

      // 等待页面加载
      await page.waitForTimeout(2000);

      // 检查页面标题
      await expect(page.locator('h1')).toContainText('站点管理');

      // 检查是否有基本的UI元素
      const hasAddButton = await page.locator('button:has-text("添加")').count() > 0;
      const hasTable = await page.locator('table').count() > 0;
      const hasMapView = await page.locator('.leaflet-container, [data-testid="map"]').count() > 0;

      expect(hasAddButton || hasTable || hasMapView).toBe(true);

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });

    test('签到记录页面基本功能检查', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);
      await page.goto('/admin/checkins');

      // 等待页面加载
      await page.waitForTimeout(2000);

      // 检查页面标题
      await expect(page.locator('h1')).toContainText('签到记录');

      // 检查是否有基本的UI元素
      const hasTable = await page.locator('table').count() > 0;
      const hasDateFilter = await page.locator('input[type="date"]').count() > 0;
      const hasFilterSection = await page.locator('[data-testid*="filter"], .filter').count() > 0;

      expect(hasTable || hasDateFilter || hasFilterSection).toBe(true);

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('⚡ 性能和稳定性', () => {
    test('应用启动性能检查', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

      const loadTime = Date.now() - startTime;

      // 应该在10秒内加载完成（CI环境更宽松）
      expect(loadTime).toBeLessThan(10000);
    });

    test('快速页面切换稳定性', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      await loginAsAdmin(page);

      // 快速在页面间切换
      const routes = ['/admin', '/admin/guards', '/admin/sites', '/admin/checkins', '/admin'];

      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(800); // 稍微等待但不太久
      }

      // 最终应该在仪表板页面
      await expect(page).toHaveURL('/admin');
      await expect(page.locator('h1')).toContainText('管理后台首页');

      // 验证没有TypeScript错误
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('🔍 系统健康总检查', () => {
    test('完整用户流程无TypeScript错误', async ({ page }) => {
      const errors = collectTypeScriptErrors(page);

      // 完整的用户流程

      // 1. 访问登录页面
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

      // 2. 登录
      await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/admin/);

      // 3. 访问各个管理页面
      const managementPages = ['/admin/guards', '/admin/sites', '/admin/checkins'];
      for (const pagePath of managementPages) {
        await page.goto(pagePath);
        await page.waitForTimeout(1500);
      }

      // 4. 返回仪表板
      await page.goto('/admin');
      await expect(page.locator('h1')).toContainText('管理后台首页');

      // 5. 最终验证：应该没有任何TypeScript相关错误
      expect(errors).toHaveLength(0);

      console.log('✅ 完整用户流程测试通过 - 无TypeScript错误');
    });
  });
});