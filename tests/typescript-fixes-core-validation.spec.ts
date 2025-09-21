/**
 * Core TypeScript Fixes Validation
 *
 * This test focuses specifically on validating the TypeScript fixes without
 * complex UI interactions. Tests the core API response type handling,
 * authentication flow, and error handling improvements.
 */

import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

test.describe('Core TypeScript Fixes Validation', () => {
  test('应该能成功登录和获取用户数据（修复的日期类型）', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');

    // 验证登录页面加载正确
    await expect(page.locator('h1')).toContainText('安全巡检管理系统');

    // 执行登录
    await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // 应该成功重定向到管理页面
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('管理后台首页');

    // 检查用户数据在localStorage中的存储（日期应该是字符串）
    const userData = await page.evaluate(() => localStorage.getItem('user'));
    expect(userData).toBeTruthy();

    const user = JSON.parse(userData || '{}');
    expect(user.createdAt).toBeTruthy();
    expect(typeof user.createdAt).toBe('string'); // 修复后应该是字符串，不是Date对象

    // 验证没有TypeScript相关的运行时错误
    expect(consoleErrors.filter(error =>
      error.includes('toISOString') ||
      error.includes('is not a function') ||
      error.includes('Cannot read property') ||
      error.includes('Type')
    )).toHaveLength(0);
  });

  test('应该能处理API错误而不产生类型错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');

    // 使用错误的凭据触发API错误
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'invalid');
    await page.click('button[type="submit"]');

    // 应该显示错误而不跳转
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL('/login');

    // 验证错误处理没有产生类型相关的运行时错误
    expect(consoleErrors.filter(error =>
      error.includes('Cannot read property') ||
      error.includes('is not a function') ||
      error.includes('Type')
    )).toHaveLength(0);
  });

  test('应该能导航到不同页面而不产生类型错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 登录
    await page.goto('/login');
    await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    // 测试导航到不同页面
    const pages = [
      { path: '/admin/guards', expectedText: '保安管理' },
      { path: '/admin/sites', expectedText: '站点管理' },
      { path: '/admin/checkins', expectedText: '签到记录' },
      { path: '/admin', expectedText: '管理后台首页' }
    ];

    for (const testPage of pages) {
      await page.goto(testPage.path);
      await expect(page).toHaveURL(testPage.path);
      await expect(page.locator('h1')).toContainText(testPage.expectedText);

      // 等待页面加载完成
      await page.waitForTimeout(1000);
    }

    // 验证导航过程中没有类型相关的错误
    expect(consoleErrors.filter(error =>
      error.includes('Type') ||
      error.includes('is not assignable') ||
      error.includes('missing the following properties') ||
      error.includes('toISOString') ||
      error.includes('is not a function')
    )).toHaveLength(0);
  });

  test('应该能正确处理页面重新加载（验证身份认证状态持久化）', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 登录
    await page.goto('/login');
    await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    // 重新加载页面测试状态持久化
    await page.reload();

    // 应该仍然保持登录状态
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('管理后台首页');

    // 验证重新加载后没有类型相关的错误
    expect(consoleErrors.filter(error =>
      error.includes('toISOString') ||
      error.includes('is not a function') ||
      error.includes('Cannot read property') ||
      error.includes('Type')
    )).toHaveLength(0);
  });

  test('应该能正确显示控制台没有类型错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // 登录并浏览应用
    await page.goto('/login');
    await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    // 等待应用完全加载
    await page.waitForTimeout(3000);

    // 检查是否有TypeScript相关的错误
    const typeScriptErrors = consoleErrors.filter(error =>
      error.includes('Type') ||
      error.includes('is not assignable') ||
      error.includes('missing the following properties') ||
      error.includes('length, pop, push, concat') ||
      error.includes('toISOString') ||
      error.includes('is not a function') ||
      error.includes('Cannot read property')
    );

    // 输出错误信息用于调试
    if (typeScriptErrors.length > 0) {
      console.log('发现TypeScript相关错误:', typeScriptErrors);
    }

    // TypeScript修复应该消除所有这些错误
    expect(typeScriptErrors).toHaveLength(0);
  });
});