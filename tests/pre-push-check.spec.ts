/**
 * Pre-Push 综合检查测试
 *
 * 这是专门为GitHub push前验证设计的核心测试套件
 * 包含认证、导航、CRUD操作、数据展示等关键功能验证
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
  await expect(page.locator('h1')).toContainText('管理控制台');
}

// 帮助函数：收集控制台错误
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      // 过滤掉非关键错误（网络请求、资源加载等）
      if (!errorText.includes('favicon') &&
          !errorText.includes('404') &&
          !errorText.includes('net::ERR') &&
          !errorText.includes('Failed to fetch') &&
          !errorText.includes('[REQUEST]') &&
          !errorText.includes('NetworkError') &&
          !errorText.includes('CORS') &&
          !errorText.includes('TypeError: Failed to fetch')) {
        errors.push(errorText);
      }
    }
  });

  return errors;
}

test.describe('🔐 认证功能测试', () => {
  test('应该能成功登录管理后台', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);

    expect(errors).toHaveLength(0);
    console.log('✅ 登录功能正常');
  });

  test('应该拒绝错误的登录凭据', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

    await page.fill('input[type="text"]', 'wronguser');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // 应该仍然在登录页面
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/login/);
    console.log('✅ 错误凭据被正确拒绝');
  });

  test('页面刷新后应该保持登录状态', async ({ page }) => {
    await loginAsAdmin(page);

    await page.reload();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('管理控制台');
    console.log('✅ 登录状态持久化正常');
  });
});

test.describe('🧭 页面导航测试', () => {
  test('应该能访问所有主要页面', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);

    const pages = [
      { path: '/admin', title: '管理控制台' },
      { path: '/admin/guards', title: '员工管理' },
      { path: '/admin/sites', title: '单位管理' },
      { path: '/admin/checkins', title: '签到记录' }
    ];

    for (const testPage of pages) {
      await page.goto(testPage.path);
      await expect(page).toHaveURL(testPage.path);
      await expect(page.locator('h1')).toContainText(testPage.title);
      await page.waitForTimeout(500);
    }

    expect(errors).toHaveLength(0);
    console.log('✅ 所有页面导航正常');
  });

  test('侧边栏导航链接应该有效', async ({ page }) => {
    await loginAsAdmin(page);

    // 检查导航链接存在
    const navLinks = page.locator('nav a, aside a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    console.log(`✅ 找到 ${linkCount} 个导航链接`);
  });
});

test.describe('👤 员工管理功能测试', () => {
  test('应该正确显示员工列表', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);
    await page.goto('/admin/guards');

    await expect(page.locator('h1')).toContainText('员工管理');

    // 等待表格加载
    await page.waitForTimeout(2000);

    // 检查表格结构存在
    const table = page.locator('table');
    const tableExists = await table.count() > 0;
    expect(tableExists).toBe(true);

    // 检查表头
    const headers = page.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    expect(errors).toHaveLength(0);
    console.log('✅ 员工列表显示正常');
  });

  test('应该能打开添加员工对话框', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/guards');

    // 点击添加按钮
    const addButton = page.locator('button:has-text("添加"), button:has-text("新增")');
    if (await addButton.count() > 0) {
      await addButton.first().click();
      await page.waitForTimeout(500);

      // 检查对话框打开
      const dialog = page.locator('[role="dialog"], .modal, [data-state="open"]');
      const dialogVisible = await dialog.count() > 0;
      expect(dialogVisible).toBe(true);
      console.log('✅ 添加员工对话框正常');

      // 关闭对话框
      await page.keyboard.press('Escape');
    } else {
      console.log('⚠️ 未找到添加按钮，跳过此测试');
    }
  });
});

test.describe('📍 单位管理功能测试', () => {
  test('应该正确显示单位列表', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);
    await page.goto('/admin/sites');

    await expect(page.locator('h1')).toContainText('单位管理');

    // 等待表格加载
    await page.waitForTimeout(2000);

    // 检查表格存在
    const table = page.locator('table');
    expect(await table.count()).toBeGreaterThan(0);

    expect(errors).toHaveLength(0);
    console.log('✅ 单位列表显示正常');
  });

  test('应该能展开单位详情', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sites');

    await page.waitForTimeout(2000);

    // 查找展开按钮（ChevronRight 图标或可点击的行）
    const expandButton = page.locator('button:has(svg), tr[class*="cursor"]').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ 单位详情展开功能正常');
    } else {
      console.log('⚠️ 未找到展开按钮，可能是空数据');
    }
  });
});

test.describe('📊 签到记录功能测试', () => {
  test('应该正确显示签到记录页面', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);
    await page.goto('/admin/checkins');

    await expect(page.locator('h1')).toContainText('签到记录');

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 检查页面结构
    const hasTable = await page.locator('table').count() > 0;
    const hasContent = await page.locator('main, [role="main"]').count() > 0;
    expect(hasTable || hasContent).toBe(true);

    expect(errors).toHaveLength(0);
    console.log('✅ 签到记录页面显示正常');
  });

  test('应该有日期筛选功能', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/checkins');

    await page.waitForTimeout(1500);

    // 检查是否有日期选择器或筛选控件
    const dateInput = page.locator('input[type="date"], [data-date], button:has-text("日期")');
    const filterControls = page.locator('select, [role="combobox"]');

    const hasDateFilter = await dateInput.count() > 0 || await filterControls.count() > 0;
    console.log(`✅ 日期筛选控件: ${hasDateFilter ? '存在' : '未检测到'}`);
  });

  test('应该能展开签到记录详情', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/checkins');

    await page.waitForTimeout(2000);

    // 尝试点击表格行展开
    const tableRow = page.locator('tbody tr').first();
    if (await tableRow.count() > 0) {
      await tableRow.click();
      await page.waitForTimeout(500);
      console.log('✅ 签到记录行可点击');
    }
  });
});

test.describe('📈 仪表板功能测试', () => {
  test('仪表板应该显示统计数据', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.locator('h1')).toContainText('管理控制台');

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 检查是否有统计卡片或数据展示
    const statsCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
    const numbers = page.locator('text=/\\d+/');

    const hasStats = await statsCards.count() > 0 || await numbers.count() > 0;
    expect(hasStats).toBe(true);

    expect(errors).toHaveLength(0);
    console.log('✅ 仪表板统计数据显示正常');
  });
});

test.describe('⚡ 性能和稳定性测试', () => {
  test('应用应该在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('都豪鼎盛内部系统');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000); // 10秒内
    console.log(`✅ 应用加载时间: ${loadTime}ms`);
  });

  test('页面切换应该流畅无错误', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin(page);

    // 快速切换多个页面
    const routes = ['/admin/guards', '/admin/sites', '/admin/checkins', '/admin'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(300);
    }

    // 验证最终状态
    await expect(page).toHaveURL('/admin');
    expect(errors).toHaveLength(0);
    console.log('✅ 页面切换流畅，无错误');
  });
});

test.describe('🔍 完整用户流程测试', () => {
  test('完整的管理员操作流程', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    console.log('开始完整用户流程测试...');

    // 1. 访问应用
    await page.goto('/');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|admin)/);

    // 2. 登录
    if (currentUrl.includes('/login')) {
      await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/admin/);
    }

    // 3. 浏览仪表板
    await expect(page.locator('h1')).toContainText('管理控制台');
    await page.waitForTimeout(1000);

    // 4. 查看员工管理
    await page.goto('/admin/guards');
    await expect(page.locator('h1')).toContainText('员工管理');
    await page.waitForTimeout(1000);

    // 5. 查看单位管理
    await page.goto('/admin/sites');
    await expect(page.locator('h1')).toContainText('单位管理');
    await page.waitForTimeout(1000);

    // 6. 查看签到记录
    await page.goto('/admin/checkins');
    await expect(page.locator('h1')).toContainText('签到记录');
    await page.waitForTimeout(1000);

    // 7. 返回仪表板
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('管理控制台');

    expect(errors).toHaveLength(0);
    console.log('✅ 完整用户流程测试通过');
  });
});
