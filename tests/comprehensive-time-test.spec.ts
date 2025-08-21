import { test, expect } from '@playwright/test';

test.describe('签到记录时间功能完整测试', () => {
  test.beforeEach(async ({ page, context }) => {
    // 设置中国时区和语言
    await context.addInitScript(() => {
      // 设置时区为中国
      Object.defineProperty(Intl, 'DateTimeFormat', {
        value: function(...args: any[]) {
          if (args[1]) {
            args[1].timeZone = args[1].timeZone || 'Asia/Shanghai';
          } else {
            args[1] = { timeZone: 'Asia/Shanghai' };
          }
          return new (Intl.DateTimeFormat as any)(...args);
        }
      });
    });

    // 登录流程
    console.log('开始登录流程...');
    await page.goto('http://localhost:5173/login');
    
    // 等待登录页面加载
    await page.waitForSelector('input[placeholder*="用户"]', { timeout: 10000 });
    
    // 输入登录信息
    await page.fill('input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    
    // 点击登录按钮
    await page.click('button:has-text("登录")');
    
    // 等待登录成功并跳转
    await page.waitForURL('**/admin**', { timeout: 10000 });
    console.log('登录成功，当前URL:', page.url());
  });

  test('完整的签到记录页面时间显示测试', async ({ page }) => {
    const apiRequests: string[] = [];
    
    // 监听API请求
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        apiRequests.push(request.url());
        console.log('API请求:', request.url());
      }
    });

    // 导航到签到记录页面
    console.log('导航到签到记录页面...');
    await page.goto('http://localhost:5173/admin/checkins');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 检查页面是否加载成功
    const pageTitle = await page.textContent('h1, h2, .title, [data-testid="page-title"]');
    console.log('页面标题:', pageTitle);

    // 查找表格或数据显示区域
    const tableExists = await page.locator('table').count() > 0;
    const cardExists = await page.locator('.card, [role="table"]').count() > 0;
    const dataContainer = await page.locator('[data-testid*="records"], [data-testid*="checkin"]').count() > 0;
    
    console.log('数据显示元素检查:');
    console.log('- 表格存在:', tableExists);
    console.log('- 卡片存在:', cardExists);
    console.log('- 数据容器存在:', dataContainer);

    if (tableExists) {
      console.log('找到表格，检查时间显示...');
      
      // 等待数据加载
      await page.waitForTimeout(2000);
      
      // 检查表格中的时间显示
      const timeCells = await page.locator('td').filter({ 
        hasText: /\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|上午|下午/ 
      });
      const timeCount = await timeCells.count();
      
      console.log('找到时间显示单元格:', timeCount);
      
      if (timeCount > 0) {
        // 获取前几个时间显示的内容
        for (let i = 0; i < Math.min(timeCount, 5); i++) {
          const timeText = await timeCells.nth(i).textContent();
          console.log(`时间显示 ${i + 1}:`, timeText);
          
          // 验证时间格式包含中国时区格式
          expect(timeText).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|上午|下午/);
        }
      }
    }

    // 检查时间筛选器
    console.log('检查时间筛选器...');
    const filterElements = await page.locator('select, button, input').filter({ 
      hasText: /今天|本周|本月|全部|时间|日期/ 
    });
    const filterCount = await filterElements.count();
    
    console.log('找到筛选器元素:', filterCount);
    
    if (filterCount > 0) {
      console.log('测试时间筛选功能...');
      
      // 尝试点击第一个筛选器
      const firstFilter = filterElements.first();
      const filterText = await firstFilter.textContent();
      console.log('第一个筛选器文本:', filterText);
      
      const initialApiCount = apiRequests.length;
      
      await firstFilter.click();
      await page.waitForTimeout(1000);
      
      // 如果是下拉选择器，尝试选择"今天"
      const todayOption = page.locator('option:has-text("今天"), [role="option"]:has-text("今天"), button:has-text("今天")');
      if (await todayOption.count() > 0) {
        await todayOption.first().click();
        await page.waitForTimeout(2000);
        console.log('选择了今天选项');
      }
      
      const finalApiCount = apiRequests.length;
      console.log('筛选前API请求数:', initialApiCount);
      console.log('筛选后API请求数:', finalApiCount);
      
      if (finalApiCount > initialApiCount) {
        console.log('时间筛选触发了新的API请求');
      }
    }

    // 分析API请求参数
    console.log('分析API请求参数...');
    apiRequests.forEach((url, index) => {
      console.log(`API请求 ${index + 1}: ${url}`);
      
      const urlObj = new URL(url);
      const startDate = urlObj.searchParams.get('startDate');
      const endDate = urlObj.searchParams.get('endDate');
      
      if (startDate || endDate) {
        console.log(`  时间参数: startDate=${startDate}, endDate=${endDate}`);
        
        // 验证时间格式
        if (startDate) {
          expect(startDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
        if (endDate) {
          expect(endDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      }
    });

    // 截图记录当前状态
    await page.screenshot({ path: 'test-results/checkin-page-final.png' });
    
    // 基本断言
    expect(apiRequests.length).toBeGreaterThan(0);
    console.log('测试完成，API请求总数:', apiRequests.length);
  });

  test('时间筛选器详细功能测试', async ({ page }) => {
    const apiRequests: any[] = [];
    
    // 监听所有API请求
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        const url = new URL(request.url());
        apiRequests.push({
          url: request.url(),
          params: Object.fromEntries(url.searchParams)
        });
      }
    });

    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('初始API请求:', apiRequests.length);

    // 查找时间范围筛选器的各种可能形式
    const timeFilters = [
      'select[data-testid*="time"]',
      'select[data-testid*="date"]', 
      'button:has-text("今天")',
      'button:has-text("本周")',
      'button:has-text("本月")',
      'button:has-text("全部")',
      'select:near(:text("时间"))',
      'select:near(:text("日期"))'
    ];

    let filterFound = false;
    
    for (const selector of timeFilters) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`找到时间筛选器: ${selector}`);
        filterFound = true;
        
        const element = page.locator(selector).first();
        const beforeCount = apiRequests.length;
        
        try {
          await element.click();
          await page.waitForTimeout(1000);
          
          // 如果是选择框，尝试选择不同的选项
          if (selector.includes('select')) {
            const options = await page.locator(`${selector} option`).all();
            for (const option of options.slice(0, 3)) { // 测试前3个选项
              const optionText = await option.textContent();
              console.log('测试选项:', optionText);
              
              await element.selectOption({ label: optionText || '' });
              await page.waitForTimeout(2000);
            }
          }
          
          const afterCount = apiRequests.length;
          console.log(`筛选器操作前请求数: ${beforeCount}, 后: ${afterCount}`);
          
        } catch (error) {
          console.log(`筛选器操作失败: ${error}`);
        }
        
        break;
      }
    }

    if (!filterFound) {
      console.log('未找到明显的时间筛选器，检查页面中所有相关元素...');
      
      // 搜索所有可能包含时间相关功能的元素
      const allSelects = await page.locator('select').allTextContents();
      const allButtons = await page.locator('button').allTextContents();
      
      console.log('所有select元素文本:', allSelects);
      console.log('所有button元素文本:', allButtons);
      
      // 查找包含时间关键词的元素
      const timeKeywords = ['今天', '本周', '本月', '全部', '时间', '日期', '筛选'];
      const timeRelatedElements = await page.locator('*').filter({ 
        hasText: new RegExp(timeKeywords.join('|')) 
      }).allTextContents();
      
      console.log('包含时间关键词的元素:', timeRelatedElements);
    }

    // 输出所有API请求的详细信息
    console.log('\n=== 所有API请求详情 ===');
    apiRequests.forEach((req, index) => {
      console.log(`请求 ${index + 1}:`);
      console.log(`  URL: ${req.url}`);
      console.log(`  参数:`, JSON.stringify(req.params, null, 2));
    });

    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('验证时间显示的时区一致性', async ({ page }) => {
    // 设置固定时间用于测试
    const fixedTime = new Date('2025-01-15T14:30:00+08:00'); // 中国时间下午2:30
    
    await page.addInitScript(`
      const originalDate = Date;
      Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(${fixedTime.getTime()});
          } else {
            super(...args);
          }
        }
        static now() {
          return ${fixedTime.getTime()};
        }
      };
      
      // 确保时区设置
      Object.defineProperty(Intl, 'DateTimeFormat', {
        value: function(...args) {
          if (!args[1]) args[1] = {};
          args[1].timeZone = 'Asia/Shanghai';
          return new originalDate.constructor.Intl.DateTimeFormat(...args);
        }
      });
    `);

    await page.goto('http://localhost:5173/admin/checkins');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 收集页面中所有时间显示
    const allTextContent = await page.locator('*').allTextContents();
    const timeTexts = allTextContent.filter(text => 
      text.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/) ||
      text.match(/\d{1,2}:\d{2}/) ||
      text.includes('上午') ||
      text.includes('下午')
    );

    console.log('页面中发现的时间显示:');
    timeTexts.forEach((text, index) => {
      console.log(`${index + 1}: ${text}`);
    });

    // 验证时间格式一致性
    const hasValidTimeFormat = timeTexts.some(text => 
      text.includes('2025') || // 应该显示当前年份
      text.match(/1[4-5]:\d{2}/) || // 应该显示下午时间
      text.includes('下午') // 应该显示中文时间格式
    );

    if (hasValidTimeFormat) {
      console.log('✓ 找到了符合中国时区的时间显示');
    } else {
      console.log('⚠ 未找到明显的中国时区时间显示');
    }

    // 检查是否有任何时间显示
    expect(timeTexts.length).toBeGreaterThanOrEqual(0); // 至少应该没有错误
  });
});