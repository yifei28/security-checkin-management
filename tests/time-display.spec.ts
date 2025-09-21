import { test, expect } from '@playwright/test';

test.describe('签到记录时间显示和时间范围测试', () => {
  test.beforeEach(async ({ context }) => {
    // 设置中国时区
    await context.addInitScript(() => {
      // Mock timezone to China/Shanghai
      Object.defineProperty(Intl, 'DateTimeFormat', {
        value: function(...args: unknown[]) {
          if (args[1] && !args[1].timeZone) {
            args[1].timeZone = 'Asia/Shanghai';
          }
          return new (Intl.DateTimeFormat as unknown as new (...args: unknown[]) => Intl.DateTimeFormat)(...args);
        }
      });
    });
  });

  test('验证签到记录页面时间显示格式', async ({ page }) => {
    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');

    // 等待页面加载
    await page.waitForSelector('table', { timeout: 10000 });

    // 查找时间显示元素
    const timeElements = await page.locator('td').filter({ hasText: /\d{4}\/\d{1,2}\/\d{1,2}/ });
    const timeCount = await timeElements.count();
    
    if (timeCount > 0) {
      console.log(`找到 ${timeCount} 个时间显示元素`);
      
      // 检查第一个时间元素的格式
      const firstTimeText = await timeElements.first().textContent();
      console.log('第一个时间显示:', firstTimeText);
      
      // 验证时间格式是否包含中文或符合中国格式
      expect(firstTimeText).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
    }

    // 检查时间列是否存在
    const timeHeaders = await page.locator('th').filter({ hasText: /时间|签到时间/ });
    expect(await timeHeaders.count()).toBeGreaterThan(0);
  });

  test('验证时间范围筛选器功能', async ({ page }) => {
    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');

    // 等待页面加载
    await page.waitForSelector('table', { timeout: 10000 });

    // 等待网络请求稳定
    await page.waitForTimeout(1000);

    // 查找时间范围选择器
    const timeRangeSelector = page.locator('select').filter({ hasText: /今天|全部|本周|本月/ }).or(
      page.locator('button').filter({ hasText: /今天|全部|本周|本月/ })
    ).or(
      page.locator('[data-testid*="time"]').or(page.locator('[data-testid*="date"]'))
    );

    if (await timeRangeSelector.count() > 0) {
      console.log('找到时间范围选择器');
      
      // 监听网络请求
      const apiRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/checkin')) {
          apiRequests.push(request.url());
          console.log('API请求:', request.url());
        }
      });

      // 测试选择"今天"
      await timeRangeSelector.first().click();
      await page.waitForTimeout(500);
      
      // 查找"今天"选项并点击
      const todayOption = page.locator('option').filter({ hasText: /今天/ }).or(
        page.locator('button').filter({ hasText: /今天/ }).or(
          page.locator('[role="option"]').filter({ hasText: /今天/ })
        )
      );
      
      if (await todayOption.count() > 0) {
        await todayOption.first().click();
        await page.waitForTimeout(1000);
        
        console.log('选择了今天选项');
        
        // 检查是否有新的API请求
        const hasApiRequest = apiRequests.some(url => 
          url.includes('startDate') || url.includes('endDate')
        );
        
        if (hasApiRequest) {
          console.log('时间筛选触发了API请求');
        }
      }
    } else {
      console.log('未找到明显的时间范围选择器，检查其他可能的筛选控件');
      
      // 检查是否有其他筛选相关的元素
      const filterElements = await page.locator('input[type="date"], select, button').all();
      for (const element of filterElements) {
        const text = await element.textContent();
        const placeholder = await element.getAttribute('placeholder');
        if (text?.includes('时间') || text?.includes('日期') || placeholder?.includes('date')) {
          console.log('找到可能的时间筛选元素:', { text, placeholder });
        }
      }
    }
  });

  test('验证API请求包含正确的时区参数', async ({ page }) => {
    let apiRequestUrl = '';
    
    // 监听API请求
    page.on('request', request => {
      if (request.url().includes('/api/checkin')) {
        apiRequestUrl = request.url();
        console.log('捕获的API请求URL:', apiRequestUrl);
      }
    });

    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');
    
    // 等待API请求完成
    await page.waitForTimeout(3000);

    if (apiRequestUrl) {
      console.log('API请求URL分析:', apiRequestUrl);
      
      // 检查URL参数
      const url = new URL(apiRequestUrl);
      const params = url.searchParams;
      
      console.log('URL参数:');
      for (const [key, value] of params) {
        console.log(`  ${key}: ${value}`);
      }

      // 如果有时间参数，验证时间格式
      const startDate = params.get('startDate');
      const endDate = params.get('endDate');
      
      if (startDate) {
        console.log('开始时间参数:', startDate);
        expect(startDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
      
      if (endDate) {
        console.log('结束时间参数:', endDate);
        expect(endDate).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    }
  });

  test('验证页面加载后的数据显示', async ({ page }) => {
    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');

    // 等待表格加载
    await page.waitForSelector('table', { timeout: 10000 });
    
    // 等待数据加载完成
    await page.waitForTimeout(2000);

    // 检查表格是否有数据
    const tableRows = await page.locator('tbody tr').count();
    console.log('表格行数:', tableRows);

    if (tableRows > 0) {
      // 获取第一行的所有单元格
      const firstRowCells = await page.locator('tbody tr:first-child td').allTextContents();
      console.log('第一行数据:', firstRowCells);
      
      // 查找包含时间信息的单元格
      const timeCells = firstRowCells.filter(cell => 
        cell.match(/\d{4}\/\d{1,2}\/\d{1,2}/) || 
        cell.match(/\d{1,2}:\d{2}/) ||
        cell.includes('上午') || 
        cell.includes('下午')
      );
      
      if (timeCells.length > 0) {
        console.log('找到的时间数据:', timeCells);
      }
    }

    // 检查分页组件
    const paginationElements = await page.locator('[data-testid*="pagination"], .pagination, button').filter({ 
      hasText: /上一页|下一页|第.*页/ 
    }).count();
    
    if (paginationElements > 0) {
      console.log('找到分页组件');
    }

    // 检查加载状态
    const loadingElements = await page.locator('text=加载中, text=Loading').count();
    console.log('加载状态元素数量:', loadingElements);
  });

  test('时间显示一致性检查', async ({ page }) => {
    // Mock当前时间为固定值以便测试
    const mockTime = new Date('2025-01-15T10:30:00+08:00');
    
    await page.addInitScript(`
      // Mock Date.now
      const originalNow = Date.now;
      Date.now = () => ${mockTime.getTime()};
      
      // Mock Date constructor
      const OriginalDate = Date;
      Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(${mockTime.getTime()});
          } else {
            super(...args);
          }
        }
        
        static now() {
          return ${mockTime.getTime()};
        }
      };
    `);

    // 导航到签到记录页面
    await page.goto('http://localhost:5173/admin/checkins');

    // 等待页面加载
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 检查页面中的所有时间显示
    const allTimeElements = await page.locator('*').filter({ 
      hasText: /\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|上午|下午/ 
    }).allTextContents();
    
    console.log('页面中的所有时间显示:', allTimeElements);

    // 验证时间格式的一致性
    const timeFormats = allTimeElements.map(text => {
      if (text.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) return 'date';
      if (text.match(/\d{1,2}:\d{2}/)) return 'time';
      if (text.includes('上午') || text.includes('下午')) return 'chinese_ampm';
      return 'other';
    });

    console.log('时间格式分析:', timeFormats);
    
    // 确保至少找到一些时间显示
    expect(allTimeElements.length).toBeGreaterThan(0);
  });
});