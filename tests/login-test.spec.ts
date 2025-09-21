import { test } from '@playwright/test';

test.describe('登录功能测试', () => {
  test('测试不同的登录凭据', async ({ page }) => {
    console.log('导航到登录页面...');
    await page.goto('http://localhost:5173/login');
    
    // 等待登录表单出现
    await page.waitForSelector('input[placeholder*="用户"]', { timeout: 10000 });
    
    // 截图查看登录页面
    await page.screenshot({ path: 'test-results/login-page.png' });
    
    // 获取所有输入框和按钮
    const inputs = await page.locator('input').all();
    const buttons = await page.locator('button').all();
    
    console.log('输入框数量:', inputs.length);
    console.log('按钮数量:', buttons.length);
    
    for (let i = 0; i < inputs.length; i++) {
      const placeholder = await inputs[i].getAttribute('placeholder');
      const type = await inputs[i].getAttribute('type');
      console.log(`输入框 ${i + 1}: type=${type}, placeholder=${placeholder}`);
    }
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`按钮 ${i + 1}: ${text}`);
    }
    
    // 测试不同的登录凭据组合
    const credentials = [
      { username: 'admin', password: 'password' },
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: '123456' },
      { username: 'admin', password: 'admin123' },
      { username: 'test', password: 'test' },
      { username: 'super', password: 'super' }
    ];
    
    for (const cred of credentials) {
      console.log(`尝试登录: ${cred.username} / ${cred.password}`);
      
      // 清除输入框
      await page.fill('input[placeholder*="用户"]', '');
      await page.fill('input[type="password"]', '');
      
      // 输入凭据
      await page.fill('input[placeholder*="用户"]', cred.username);
      await page.fill('input[type="password"]', cred.password);
      
      // 点击登录
      await page.click('button:has-text("登录")');
      
      // 等待一段时间看是否成功
      await page.waitForTimeout(3000);
      
      // 检查当前URL
      const currentUrl = page.url();
      console.log('登录后URL:', currentUrl);
      
      if (currentUrl.includes('/admin')) {
        console.log('✅ 登录成功!');
        
        // 截图登录成功后的页面
        await page.screenshot({ path: 'test-results/after-login.png' });
        break;
      } else {
        console.log('❌ 登录失败，继续尝试下一个...');
        
        // 检查是否有错误消息
        const errorText = await page.locator('*').filter({ hasText: /错误|失败|invalid|wrong/ }).textContent();
        if (errorText) {
          console.log('错误信息:', errorText);
        }
      }
      
      // 回到登录页面准备下一次尝试
      await page.goto('http://localhost:5173/login');
      await page.waitForTimeout(1000);
    }
  });

  test('检查登录API调用', async ({ page }) => {
    const apiRequests: unknown[] = [];
    
    // 监听所有网络请求
    page.on('request', request => {
      if (request.url().includes('/api/') || request.method() === 'POST') {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
        console.log(`API请求: ${request.method()} ${request.url()}`);
        if (request.postData()) {
          console.log('请求数据:', request.postData());
        }
      }
    });
    
    // 监听响应
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`API响应: ${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    
    // 尝试登录
    await page.fill('input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登录")');
    
    // 等待网络请求完成
    await page.waitForTimeout(5000);
    
    console.log('收集到的API请求:');
    apiRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   数据: ${req.postData}`);
      }
    });
  });
});