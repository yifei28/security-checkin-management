import { test, expect } from '@playwright/test';

test.describe('签到记录页面基础测试', () => {
  test('检查页面基本加载和内容', async ({ page }) => {
    console.log('导航到签到记录页面...');
    
    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 截图查看页面状态
    await page.screenshot({ path: 'test-results/page-screenshot.png' });

    // 检查页面内容
    const pageContent = await page.content();
    console.log('页面HTML长度:', pageContent.length);

    // 检查是否有任何表格相关元素
    const tables = await page.locator('table').count();
    const divs = await page.locator('div').count();
    const buttons = await page.locator('button').count();
    
    console.log('页面元素统计:');
    console.log('- table元素:', tables);
    console.log('- div元素:', divs);  
    console.log('- button元素:', buttons);

    // 检查页面标题
    const title = await page.title();
    console.log('页面标题:', title);

    // 检查是否显示了错误信息
    const errorElements = await page.locator('text=错误, text=Error, text=404, text=加载失败').count();
    console.log('错误信息元素:', errorElements);

    // 检查是否需要登录
    const loginElements = await page.locator('text=登录, text=Login, input[type="password"]').count();
    console.log('登录相关元素:', loginElements);

    // 如果需要登录，尝试登录
    if (loginElements > 0) {
      console.log('检测到需要登录，尝试登录...');
      
      // 查找用户名和密码输入框
      const usernameInput = page.locator('input[type="text"], input[type="username"], input[placeholder*="用户"], input[placeholder*="username"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button').filter({ hasText: /登录|Login/ }).first();

      if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
        await usernameInput.fill('admin');
        await passwordInput.fill('password');
        
        if (await loginButton.count() > 0) {
          await loginButton.click();
          await page.waitForTimeout(2000);
          
          // 重新导航到签到记录页面
          await page.goto('http://localhost:5173/admin/checkins');
          await page.waitForTimeout(2000);
        }
      }
    }

    // 检查最终页面状态
    const finalContent = await page.locator('body').textContent();
    console.log('页面文本内容预览:', finalContent?.substring(0, 500));

    // 查找任何包含时间信息的元素
    const allText = await page.locator('*').allTextContents();
    const timeRelatedTexts = allText.filter(text => 
      text.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/) || 
      text.match(/\d{1,2}:\d{2}/) ||
      text.includes('签到') ||
      text.includes('时间')
    );
    
    if (timeRelatedTexts.length > 0) {
      console.log('找到时间相关文本:', timeRelatedTexts.slice(0, 10));
    }

    // 基本断言 - 页面应该加载成功
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('监听网络请求和API调用', async ({ page }) => {
    const apiRequests: unknown[] = [];
    const networkErrors: unknown[] = [];

    // 监听所有网络请求
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: Object.fromEntries(request.headersArray().map(h => [h.name, h.value]))
        });
        console.log(`API请求: ${request.method()} ${request.url()}`);
      }
    });

    // 监听网络错误
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        error: request.failure()?.errorText
      });
      console.log(`请求失败: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // 导航到页面
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForTimeout(5000);

    console.log('收集到的API请求:', apiRequests.length);
    console.log('网络错误数量:', networkErrors.length);

    // 输出详细的API请求信息
    apiRequests.forEach((req, index) => {
      console.log(`API请求 ${index + 1}:`);
      console.log(`  URL: ${req.url}`);
      console.log(`  Method: ${req.method}`);
      
      // 检查时间相关参数
      const url = new URL(req.url);
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      
      if (startDate || endDate) {
        console.log(`  时间参数: startDate=${startDate}, endDate=${endDate}`);
      }
    });

    // 输出网络错误
    networkErrors.forEach((error, index) => {
      console.log(`网络错误 ${index + 1}: ${error.url} - ${error.error}`);
    });
  });
});