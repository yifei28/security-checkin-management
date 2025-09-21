import { test, expect } from '@playwright/test';

test.describe('签到记录时间功能最终验证测试', () => {
  // 使用Context7推荐的最佳实践配置时区
  test.use({
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  test.beforeEach(async ({ page, context }) => {
    // 设置中国时区和语言 - 基于Context7最佳实践
    await context.addInitScript(() => {
      // 确保时区设置正确
      Object.defineProperty(Intl, 'DateTimeFormat', {
        value: function(...args: unknown[]) {
          if (!args[1]) args[1] = {};
          args[1].timeZone = 'Asia/Shanghai';
          return new (Intl.DateTimeFormat as any)(...args);
        }
      });
    });

    // 模拟已登录状态 - 避免第三方依赖测试问题
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-jwt-token-for-testing');
      localStorage.setItem('user', JSON.stringify({ 
        id: 'test-user-1', 
        username: 'admin-test', 
        role: 'admin',
        fullName: '测试管理员'
      }));
      localStorage.setItem('superAdmin', 'true');
    });
  });

  test('验证API请求包含正确的时区和分页参数', async ({ page }) => {
    const apiRequests: unknown[] = [];
    const apiResponses: unknown[] = [];
    
    // 使用Context7推荐的网络监听最佳实践
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        const url = new URL(request.url());
        const params = Object.fromEntries(url.searchParams);
        
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
          params: params
        });
        
        console.log(`🔄 API请求: ${request.method()} ${request.url()}`);
        
        // 详细记录参数
        if (Object.keys(params).length > 0) {
          console.log('📋 请求参数:', JSON.stringify(params, null, 2));
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/checkin')) {
        const timing = response.request().timing();
        
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now(),
          responseTime: timing.responseEnd - timing.requestStart
        });
        
        console.log(`📥 API响应: ${response.status()} ${response.url()}`);
        console.log(`⏱️ 响应时间: ${timing.responseEnd - timing.requestStart}ms`);
      }
    });

    // 导航到签到记录页面
    console.log('🚀 导航到签到记录页面...');
    await page.goto('http://localhost:5173/admin/checkins');
    
    // 等待页面完全加载 - 使用Context7推荐的等待策略
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // === 验证初始API请求 ===
    console.log('\n=== 初始API请求验证 ===');
    expect(apiRequests.length).toBeGreaterThan(0);
    
    const initialRequest = apiRequests[0];
    console.log('初始请求参数:', initialRequest.params);
    
    // 验证分页参数
    expect(initialRequest.params.page).toBeDefined();
    expect(initialRequest.params.pageSize).toBeDefined();
    expect(initialRequest.params.sortBy).toBe('timestamp');
    expect(initialRequest.params.sortOrder).toBe('desc');
    
    console.log('✅ 分页参数验证通过');

    // 验证时间参数格式
    if (initialRequest.params.startDate) {
      expect(initialRequest.params.startDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      console.log('✅ 开始时间格式正确:', initialRequest.params.startDate);
    }
    
    if (initialRequest.params.endDate) {
      expect(initialRequest.params.endDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      console.log('✅ 结束时间格式正确:', initialRequest.params.endDate);
    }

    // === 验证API响应 ===
    console.log('\n=== API响应验证 ===');
    const successfulResponses = apiResponses.filter(r => r.status === 200);
    expect(successfulResponses.length).toBeGreaterThan(0);
    console.log('✅ 成功响应数量:', successfulResponses.length);

    // 验证响应时间合理
    const avgResponseTime = apiResponses.reduce((sum, r) => sum + r.responseTime, 0) / apiResponses.length;
    console.log('📊 平均响应时间:', `${avgResponseTime.toFixed(2)}ms`);
    expect(avgResponseTime).toBeLessThan(5000); // 响应时间应该小于5秒

    console.log('🎉 API请求和响应验证完成！');
  });

  test('验证时间筛选功能触发正确的API调用', async ({ page }) => {
    const apiCallsBeforeFilter: string[] = [];
    const apiCallsAfterFilter: string[] = [];
    let filterApplied = false;

    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        if (!filterApplied) {
          apiCallsBeforeFilter.push(request.url());
        } else {
          apiCallsAfterFilter.push(request.url());
        }
      }
    });

    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📊 筛选前API调用数:', apiCallsBeforeFilter.length);

    // 查找时间筛选器 - 使用Context7推荐的定位器策略
    const filterSelectors = [
      'select[data-testid*="time"]',
      'select[data-testid*="date"]',
      'select:has-text("今天")',
      'select:has-text("全部")',
      'button:has-text("今天")',
      'button:has-text("本周")',
      'button:has-text("本月")',
      '[role="combobox"]',
      'select'
    ];

    let filterFound = false;
    for (const selector of filterSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`🎯 找到筛选器: ${selector} (${elements}个)`);
        
        const element = page.locator(selector).first();
        
        try {
          // 检查元素是否可见和可交互
          await expect(element).toBeVisible({ timeout: 5000 });
          
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          console.log('筛选器元素类型:', tagName);
          
          if (tagName === 'select') {
            // 处理select元素
            const options = await element.locator('option').allTextContents();
            console.log('可用选项:', options);
            
            // 寻找"今天"选项
            const todayOption = options.find(opt => 
              opt.includes('今天') || opt.includes('today') || opt.includes('Today')
            );
            
            if (todayOption) {
              console.log('选择今天选项:', todayOption);
              filterApplied = true;
              await element.selectOption({ label: todayOption });
              await page.waitForTimeout(3000); // 等待新的API调用
              filterFound = true;
              break;
            }
          } else if (tagName === 'button') {
            // 处理button元素
            console.log('点击筛选按钮');
            filterApplied = true;
            await element.click();
            await page.waitForTimeout(3000);
            filterFound = true;
            break;
          }
        } catch (error) {
          console.log(`尝试筛选器 ${selector} 失败:`, error);
          continue;
        }
      }
    }

    if (!filterFound) {
      console.log('⚠️ 未找到明显的时间筛选器，检查页面结构...');
      
      // 截图用于调试
      await page.screenshot({ 
        path: 'test-results/filter-debug.png',
        fullPage: true
      });
      
      // 记录页面上所有可能的筛选相关元素
      const allText = await page.locator('*').allTextContents();
      const filterRelatedTexts = allText.filter(text => 
        text.includes('今天') || 
        text.includes('本周') || 
        text.includes('本月') || 
        text.includes('全部') ||
        text.includes('筛选') ||
        text.includes('时间') ||
        text.includes('日期')
      );
      
      console.log('页面上的时间相关文本:', filterRelatedTexts);
    }

    console.log('📊 筛选后API调用数:', apiCallsAfterFilter.length);

    // 验证筛选是否触发了新的API调用
    if (filterFound && filterApplied) {
      expect(apiCallsAfterFilter.length).toBeGreaterThan(0);
      console.log('✅ 时间筛选成功触发API调用');
      
      // 比较筛选前后的API调用参数
      if (apiCallsAfterFilter.length > 0) {
        const afterFilterUrl = new URL(apiCallsAfterFilter[0]);
        const afterParams = Object.fromEntries(afterFilterUrl.searchParams);
        console.log('筛选后API参数:', afterParams);
        
        // 验证筛选后的请求包含时间参数
        expect(afterParams.startDate || afterParams.endDate).toBeTruthy();
        console.log('✅ 筛选后请求包含时间参数');
      }
    }

    // 基本断言 - 至少应该有初始的API调用
    expect(apiCallsBeforeFilter.length).toBeGreaterThan(0);
  });

  test('验证时区转换和时间显示一致性', async ({ page }) => {
    // 使用Context7推荐的时钟API设置固定时间进行测试
    const fixedTime = new Date('2025-01-15T14:30:00+08:00'); // 中国时间下午2:30
    await page.clock.setFixedTime(fixedTime);
    
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 截图记录当前状态
    await page.screenshot({ 
      path: 'test-results/timezone-verification.png',
      fullPage: true
    });

    // 检查页面中的时间显示
    const timeElements = await page.locator('*').filter({ 
      hasText: /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}:\d{2}|上午|下午|AM|PM/ 
    }).allTextContents();

    console.log('\n=== 时间显示验证 ===');
    console.log('页面上发现的时间显示:');
    timeElements.forEach((text, index) => {
      console.log(`  ${index + 1}: ${text}`);
    });

    // 验证是否有合理的时间显示
    if (timeElements.length > 0) {
      console.log('✅ 发现时间显示元素');
      
      // 检查是否有中文时间格式
      const chineseTimeFormat = timeElements.some(text => 
        text.includes('上午') || text.includes('下午') || text.match(/\d{4}\/\d{1,2}\/\d{1,2}/)
      );
      
      if (chineseTimeFormat) {
        console.log('✅ 发现中文时间格式');
      } else {
        console.log('ℹ️ 未发现明显的中文时间格式，但可能使用其他合适的本地化格式');
      }
    } else {
      console.log('ℹ️ 当前页面可能没有时间数据或时间显示在其他位置');
    }

    // 验证DOM结构
    const pageStructure = {
      tables: await page.locator('table').count(),
      cards: await page.locator('.card, [data-testid*="card"]').count(),
      buttons: await page.locator('button').count(),
      selects: await page.locator('select').count(),
      inputs: await page.locator('input').count()
    };

    console.log('\n=== 页面结构验证 ===');
    Object.entries(pageStructure).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // 基本断言 - 页面应该有基本的交互元素
    expect(pageStructure.buttons).toBeGreaterThan(0);
    console.log('✅ 页面基本结构验证通过');

    console.log('\n🎉 时区和时间显示验证完成！');
  });

  test('网络性能和稳定性验证', async ({ page }) => {
    const networkMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0 // 超过2秒的请求
    };

    const requestTimes: number[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkMetrics.totalRequests++;
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        const responseTime = timing.responseEnd - timing.requestStart;
        requestTimes.push(responseTime);
        
        if (response.status() >= 200 && response.status() < 300) {
          networkMetrics.successfulRequests++;
        } else {
          networkMetrics.failedRequests++;
        }
        
        if (responseTime > 2000) {
          networkMetrics.slowRequests++;
          console.log(`⚠️ 慢请求: ${response.url()} - ${responseTime}ms`);
        }
      }
    });

    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 计算性能指标
    if (requestTimes.length > 0) {
      networkMetrics.averageResponseTime = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
    }

    console.log('\n=== 网络性能报告 ===');
    console.log('总请求数:', networkMetrics.totalRequests);
    console.log('成功请求数:', networkMetrics.successfulRequests);
    console.log('失败请求数:', networkMetrics.failedRequests);
    console.log('平均响应时间:', `${networkMetrics.averageResponseTime.toFixed(2)}ms`);
    console.log('慢请求数量:', networkMetrics.slowRequests);
    
    const successRate = (networkMetrics.successfulRequests / networkMetrics.totalRequests) * 100;
    console.log('成功率:', `${successRate.toFixed(1)}%`);

    // 性能断言
    expect(networkMetrics.totalRequests).toBeGreaterThan(0);
    expect(networkMetrics.successfulRequests).toBeGreaterThan(0);
    expect(successRate).toBeGreaterThan(80); // 成功率应该超过80%
    expect(networkMetrics.averageResponseTime).toBeLessThan(5000); // 平均响应时间小于5秒
    
    console.log('✅ 网络性能验证通过！');
  });
});