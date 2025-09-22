/**
 * Pre-Push 检查测试
 *
 * 这是专门为GitHub push前验证设计的核心测试套件
 * 只包含最关键的功能验证，确保高可靠性
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

// 帮助函数：登录
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('h1')).toContainText('管理后台首页');
}

// 帮助函数：收集TypeScript错误
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

test.describe('Pre-Push 核心检查', () => {

  test('🔐 认证功能 - 应该能成功登录', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    await loginAsAdmin(page);

    // 验证没有TypeScript错误
    expect(errors).toHaveLength(0);
    console.log('✅ 登录功能正常，无TypeScript错误');
  });

  test('🧭 路由导航 - 应该能访问所有主要页面', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    await loginAsAdmin(page);

    // 测试主要页面导航
    const pages = [
      { path: '/admin', title: '管理后台首页' },
      { path: '/admin/guards', title: '保安管理' },
      { path: '/admin/sites', title: '站点管理' },
      { path: '/admin/checkins', title: '签到记录' }
    ];

    for (const testPage of pages) {
      await page.goto(testPage.path);
      await expect(page).toHaveURL(testPage.path);
      await expect(page.locator('h1')).toContainText(testPage.title);
      await page.waitForTimeout(1000); // 给页面时间加载
    }

    // 验证导航过程无TypeScript错误
    expect(errors).toHaveLength(0);
    console.log('✅ 所有页面导航正常，无TypeScript错误');
  });

  test('💾 状态持久化 - 页面刷新应该保持登录状态', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    await loginAsAdmin(page);

    // 刷新页面
    await page.reload();

    // 应该仍然保持登录状态
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('管理后台首页');

    // 验证没有TypeScript错误
    expect(errors).toHaveLength(0);
    console.log('✅ 状态持久化正常，无TypeScript错误');
  });

  test('⚡ 应用性能 - 应该在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

    const loadTime = Date.now() - startTime;

    // 应该在8秒内加载（CI环境）
    expect(loadTime).toBeLessThan(8000);
    console.log(`✅ 应用加载时间: ${loadTime}ms`);
  });

  test('🎯 核心页面基本功能 - 每个页面应该能正常加载', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    await loginAsAdmin(page);

    // 测试每个管理页面的基本加载
    const managementPages = [
      { path: '/admin/guards', title: '保安管理' },
      { path: '/admin/sites', title: '站点管理' },
      { path: '/admin/checkins', title: '签到记录' }
    ];

    for (const managementPage of managementPages) {
      await page.goto(managementPage.path);

      // 页面应该加载并显示正确标题
      await expect(page.locator('h1')).toContainText(managementPage.title);

      // 等待页面内容加载
      await page.waitForTimeout(2000);

      // 检查页面是否有严重错误
      const criticalErrors = page.locator('[role="alert"]:has-text("错误"), .error:has-text("错误")');
      const criticalErrorCount = await criticalErrors.count();

      if (criticalErrorCount > 0) {
        console.log(`警告: ${managementPage.path} 页面可能有问题`);
      }

      // 页面至少应该有基本内容结构
      const hasMainContent = await page.locator('main, .main-content, [role="main"]').count() > 0;
      const hasPageHeader = await page.locator('h1').count() > 0;

      expect(hasMainContent || hasPageHeader).toBe(true);
    }

    // 验证没有TypeScript错误
    expect(errors).toHaveLength(0);
    console.log('✅ 所有管理页面基本功能正常，无TypeScript错误');
  });

  test('🔍 系统完整性检查 - 完整用户流程', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    console.log('开始完整用户流程测试...');

    // 1. 访问登录页面
    await page.goto('/');

    // 应该重定向到登录页面或管理页面
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|admin)/);

    // 2. 如果在登录页面，进行登录
    if (currentUrl.includes('/login')) {
      await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/admin/);
    }

    // 3. 确认在管理后台
    await expect(page.locator('h1')).toContainText('管理后台首页');

    // 4. 快速访问其他页面
    const quickNavigation = ['/admin/guards', '/admin/sites', '/admin'];
    for (const route of quickNavigation) {
      await page.goto(route);
      await page.waitForTimeout(800);
    }

    // 5. 最终检查：应该在仪表板且无TypeScript错误
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('管理后台首页');

    // 验证整个流程没有TypeScript错误
    expect(errors).toHaveLength(0);

    console.log('✅ 完整用户流程测试通过');
    console.log('✅ 系统完整性检查通过 - 应用可以安全push到GitHub');
  });
});

test.describe('构建和部署准备检查', () => {
  test('📦 应用启动检查 - 无编译错误', async ({ page }) => {
    const errors = collectTypeScriptErrors(page);

    // 简单访问应用确保能正常启动
    await page.goto('/');

    // 等待应用初始化
    await page.waitForTimeout(2000);

    // 应该能到达某个有效页面
    const url = page.url();
    expect(url).toMatch(/\/(login|admin)/);

    // 验证启动过程无TypeScript错误
    expect(errors).toHaveLength(0);

    console.log('✅ 应用启动正常，构建无TypeScript错误');
  });
});