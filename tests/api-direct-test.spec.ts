import { test, expect } from '@playwright/test';

test.describe('API直接测试 - 绕过登录验证时间功能', () => {
  test('验证API端点和时间参数', async ({ page }) => {
    const apiRequests: unknown[] = [];
    const apiResponses: unknown[] = [];
    
    // 监听所有API请求和响应
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        const url = new URL(request.url());
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          params: Object.fromEntries(url.searchParams)
        });
        console.log(`📤 API请求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/checkin')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`📥 API响应: ${response.status()} ${response.url()}`);
      }
    });

    // 模拟已登录状态 - 设置localStorage
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ 
        id: '1', 
        username: 'admin', 
        role: 'admin' 
      }));
      localStorage.setItem('superAdmin', 'true');
    });

    // 直接访问签到记录页面
    console.log('🚀 直接导航到签到记录页面...');
    await page.goto('http://localhost:5173/admin/checkins');
    
    // 等待页面加载和API调用
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 分析收集到的API请求
    console.log('\n=== API请求分析 ===');
    console.log(`总共捕获 ${apiRequests.length} 个API请求`);
    
    apiRequests.forEach((req, index) => {
      console.log(`\n请求 ${index + 1}:`);
      console.log(`  URL: ${req.url}`);
      console.log(`  方法: ${req.method}`);
      console.log(`  参数:`, req.params);
      
      // 检查时间相关参数
      if (req.params.startDate || req.params.endDate) {
        console.log(`  ⏰ 时间参数检测:`);
        console.log(`    开始时间: ${req.params.startDate}`);
        console.log(`    结束时间: ${req.params.endDate}`);
        
        // 验证时间格式
        if (req.params.startDate) {
          const startDate = new Date(req.params.startDate);
          console.log(`    开始时间解析: ${startDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
          expect(req.params.startDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
        
        if (req.params.endDate) {
          const endDate = new Date(req.params.endDate);
          console.log(`    结束时间解析: ${endDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
          expect(req.params.endDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      }
      
      // 检查分页参数
      if (req.params.page || req.params.pageSize) {
        console.log(`  📄 分页参数:`);
        console.log(`    页码: ${req.params.page}`);
        console.log(`    每页数量: ${req.params.pageSize}`);
        console.log(`    排序字段: ${req.params.sortBy}`);
        console.log(`    排序顺序: ${req.params.sortOrder}`);
      }
    });

    // 分析API响应
    console.log('\n=== API响应分析 ===');
    console.log(`总共收到 ${apiResponses.length} 个API响应`);
    
    apiResponses.forEach((res, index) => {
      console.log(`响应 ${index + 1}: ${res.status} ${res.statusText}`);
      
      if (res.status === 200) {
        console.log('  ✅ API调用成功');
      } else {
        console.log(`  ❌ API调用失败: ${res.status}`);
      }
    });

    // 验证基本要求
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // 验证至少有一个带时间参数的请求
    const requestsWithTimeParams = apiRequests.filter(req => 
      req.params.startDate || req.params.endDate
    );
    expect(requestsWithTimeParams.length).toBeGreaterThan(0);
    
    // 验证至少有一个成功的响应
    const successfulResponses = apiResponses.filter(res => res.status === 200);
    expect(successfulResponses.length).toBeGreaterThan(0);
    
    console.log('\n🎉 API和时间参数测试完成!');
  });

  test('直接访问页面检查时间显示', async ({ page }) => {
    // 模拟已登录状态
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ 
        id: '1', 
        username: 'admin', 
        role: 'admin' 
      }));
    });

    // 访问签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 截图当前页面状态
    await page.screenshot({ 
      path: 'test-results/checkin-page-direct-access.png',
      fullPage: true
    });

    // 检查页面内容
    const bodyText = await page.locator('body').textContent() || '';
    console.log('页面文本内容长度:', bodyText.length);
    console.log('页面内容预览:', bodyText.substring(0, 500));

    // 查找时间相关的文本
    const timeRelatedTexts = bodyText.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}|上午|下午|签到时间|时间筛选/g) || [];
    
    console.log('找到的时间相关文本:');
    timeRelatedTexts.forEach((text, index) => {
      console.log(`  ${index + 1}: ${text}`);
    });

    // 检查DOM元素
    const tableCount = await page.locator('table').count();
    const cardCount = await page.locator('.card, [data-testid*="card"]').count();
    const buttonCount = await page.locator('button').count();
    const selectCount = await page.locator('select').count();

    console.log('\nDOM元素统计:');
    console.log(`  表格: ${tableCount}`);
    console.log(`  卡片: ${cardCount}`);
    console.log(`  按钮: ${buttonCount}`);
    console.log(`  选择框: ${selectCount}`);

    // 查找可能的筛选器
    const filterTexts = await page.locator('button, select, input').allTextContents();
    const timeFilters = filterTexts.filter(text => 
      text.includes('今天') || 
      text.includes('本周') || 
      text.includes('本月') || 
      text.includes('全部') ||
      text.includes('时间') ||
      text.includes('筛选')
    );

    if (timeFilters.length > 0) {
      console.log('找到可能的时间筛选器:');
      timeFilters.forEach((text, index) => {
        console.log(`  ${index + 1}: ${text}`);
      });
    }

    // 基本断言
    expect(bodyText.length).toBeGreaterThan(100);
    console.log('\n✅ 页面访问和内容检查完成');
  });
});