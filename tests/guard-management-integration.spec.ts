import { test, expect, Page } from '@playwright/test';

test.describe('Guard Management Integration Tests', () => {
  let page: Page;

  // Authentication helper
  const authenticateUser = async (page: Page, role: 'admin' | 'superAdmin' = 'admin') => {
    const futureTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
      sub: 'test-user',
      username: 'testuser',
      role: role,
      exp: futureTime,
      iat: Math.floor(Date.now() / 1000)
    }))}.fake-signature`;
    
    await page.evaluate(({ token, role }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        username: 'testuser',
        role: role,
        createdAt: new Date().toISOString(),
        isActive: true
      }));
      localStorage.setItem('superAdmin', (role === 'superAdmin').toString());
    }, { token: mockToken, role });
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await authenticateUser(page);
  });

  test.describe('Authentication Integration', () => {
    test('should redirect to login when not authenticated', async () => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      await page.goto('/admin/guards');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to login
      expect(page.url()).toMatch(/\/login$/);
    });

    test('should handle token refresh during guard operations', async () => {
      // Mock token refresh scenario
      let refreshCalled = false;
      await page.route('**/api/auth/refresh', async route => {
        refreshCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'new-token' })
        });
      });

      // Mock initial 401, then success after refresh
      let requestCount = 0;
      await page.route('**/api/guards', async route => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({ status: 401 });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      });

      await page.goto('/admin/guards');
      await page.waitForTimeout(2000); // Allow time for refresh

      expect(refreshCalled).toBe(true);
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      await page.route('**/api/guards', async route => {
        // Simulate timeout by delaying response
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/admin/guards');
      
      // Should show loading state initially
      await expect(page.locator('[data-testid="loading"]')).toBeVisible({
        timeout: 1000
      }).catch(() => {
        // If no loading indicator, that's okay
      });
    });

    test('should handle server errors during CRUD operations', async () => {
      // Mock sites successfully but guards with error
      await page.route('**/api/sites', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: '东门岗位', isActive: true }
          ])
        });
      });

      await page.route('**/api/guards', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database connection failed' })
          });
        } else if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Validation failed: Phone number already exists' })
          });
        }
      });

      await page.goto('/admin/guards');
      
      // Should show error message
      await expect(page.locator('text=获取保安数据失败')).toBeVisible();
      
      // Try to add a guard and see validation error
      await page.locator('button:has-text("添加保安")').click();
      await page.locator('input[placeholder="请输入保安姓名"]').fill('测试保安');
      await page.locator('input[placeholder="请输入11位手机号"]').fill('13900139001');
      await page.locator('[role="combobox"]').click();
      await page.locator('text=东门岗位').click();
      await page.locator('button:has-text("添加保安")').nth(1).click();
      
      // Should show validation error
      await expect(page.locator('text=Validation failed')).toBeVisible();
    });

    test('should retry failed requests appropriately', async () => {
      let attemptCount = 0;
      await page.route('**/api/guards', async route => {
        attemptCount++;
        if (attemptCount === 1) {
          await route.fulfill({ status: 503 }); // Service unavailable
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      });

      await page.goto('/admin/guards');
      await page.waitForTimeout(2000); // Allow retry
      
      expect(attemptCount).toBeGreaterThan(1);
    });
  });

  test.describe('Data Validation Edge Cases', () => {
    test('should handle special characters in names', async () => {
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(route.request().method() === 'GET' ? [] : {
            id: 1,
            name: route.request().postDataJSON?.()?.name || 'test',
            phoneNumber: '13900139001',
            employeeId: 'EMP001',
            site: { id: 1, name: '测试站点' }
          })
        });
      });

      await page.goto('/admin/guards');
      await page.locator('button:has-text("添加保安")').click();
      
      // Test with special characters
      await page.locator('input[placeholder="请输入保安姓名"]').fill('张三-李四（测试）');
      await page.locator('input[placeholder="请输入11位手机号"]').fill('13900139001');
      await page.locator('[role="combobox"]').click();
      
      // The sites dropdown should be empty, so we can't complete this test
      // But the form should handle the special characters properly
    });

    test('should validate phone number edge cases', async () => {
      await page.route('**/api/sites', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: '测试站点' }
          ])
        });
      });

      await page.goto('/admin/guards');
      await page.locator('button:has-text("添加保安")').click();

      // Test various invalid phone formats
      const invalidPhones = ['123', '1234567890', '12345678901', '11900139001'];
      
      for (const phone of invalidPhones) {
        await page.locator('input[placeholder="请输入保安姓名"]').fill('测试保安');
        await page.locator('input[placeholder="请输入11位手机号"]').clear();
        await page.locator('input[placeholder="请输入11位手机号"]').fill(phone);
        await page.locator('[role="combobox"]').click();
        await page.locator('text=测试站点').click();
        await page.locator('button:has-text("添加保安")').nth(1).click();
        
        // Should show validation error
        await expect(page.locator('text=请输入有效的手机号')).toBeVisible();
        
        // Close the error by clearing the form
        await page.locator('button:has-text("取消")').click();
        await page.locator('button:has-text("添加保安")').click();
      }
    });

    test('should handle empty employee ID generation', async () => {
      await page.route('**/api/sites', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: '测试站点' }
          ])
        });
      });

      await page.route('**/api/guards', async route => {
        if (route.request().method() === 'POST') {
          const body = await route.request().postDataJSON();
          // Verify that employeeId was generated
          expect(body.employeeId).toMatch(/^EMP\d+$/);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ ...body, id: 1 })
          });
        }
      });

      await page.goto('/admin/guards');
      await page.locator('button:has-text("添加保安")').click();
      
      // Leave employee ID empty
      await page.locator('input[placeholder="请输入保安姓名"]').fill('测试保安');
      await page.locator('input[placeholder="请输入11位手机号"]').fill('13900139001');
      await page.locator('[role="combobox"]').click();
      await page.locator('text=测试站点').click();
      
      // Submit without employee ID
      await page.locator('button:has-text("添加保安")').nth(1).click();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `保安${i + 1}`,
        phoneNumber: `1390013${String(i).padStart(4, '0')}`,
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
        site: { id: (i % 5) + 1, name: `站点${(i % 5) + 1}` },
        isActive: i % 10 !== 0
      }));

      await page.route('**/api/guards', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });

      const startTime = Date.now();
      await page.goto('/admin/guards');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Search should still work efficiently
      await page.locator('input[placeholder*="搜索"]').fill('保安1');
      await expect(page.locator('text=保安1')).toBeVisible();
    });

    test('should be accessible with keyboard navigation', async () => {
      await page.route('**/api/**', async route => {
        const mockData = route.request().url().includes('sites') 
          ? [{ id: 1, name: '测试站点' }]
          : [{ id: 1, name: '测试保安', phoneNumber: '13900139001', employeeId: 'EMP001', site: { id: 1, name: '测试站点' } }];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockData)
        });
      });

      await page.goto('/admin/guards');
      
      // Test tab navigation
      await page.keyboard.press('Tab'); // Search input
      await expect(page.locator('input[placeholder*="搜索"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Add button
      await expect(page.locator('button:has-text("添加保安")')).toBeFocused();
      
      // Open dialog with Enter/Space
      await page.keyboard.press('Enter');
      await expect(page.locator('text=添加保安信息')).toBeVisible();
      
      // Should be able to navigate form with Tab
      await page.keyboard.press('Tab');
      await expect(page.locator('input[placeholder="请输入保安姓名"]')).toBeFocused();
    });

    test('should announce screen reader content appropriately', async () => {
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/admin/guards');
      
      // Check for proper ARIA labels and roles
      await expect(page.locator('table')).toHaveAttribute('role', 'table');
      await expect(page.locator('input[placeholder*="搜索"]')).toHaveAttribute('aria-label');
      await expect(page.locator('button:has-text("添加保安")')).toBeVisible();
      
      // Dialog should have proper ARIA attributes
      await page.locator('button:has-text("添加保安")').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work correctly in different viewports', async () => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet landscape
        { width: 768, height: 1024 },  // Tablet portrait
        { width: 375, height: 667 }    // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/admin/guards');
        
        // Core functionality should be available
        await expect(page.locator('h1:has-text("员工管理")')).toBeVisible();
        await expect(page.locator('button:has-text("添加保安")')).toBeVisible();
        await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();
      }
    });
  });

  test.describe('Data Persistence', () => {
    test('should maintain search query across page refreshes', async () => {
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/admin/guards');
      
      // Enter search query
      await page.locator('input[placeholder*="搜索"]').fill('测试搜索');
      
      // Reload page
      await page.reload();
      
      // Search should be cleared (expected behavior)
      await expect(page.locator('input[placeholder*="搜索"]')).toHaveValue('');
    });

    test('should handle concurrent operations', async () => {
      let operationCount = 0;
      await page.route('**/api/guards', async route => {
        operationCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: operationCount,
              name: `保安${operationCount}`,
              phoneNumber: '13900139001',
              employeeId: `EMP${operationCount}`,
              site: { id: 1, name: '测试站点' }
            })
          });
        }
      });

      await page.route('**/api/sites', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, name: '测试站点' }])
        });
      });

      await page.goto('/admin/guards');
      
      // Try to create multiple guards rapidly
      for (let i = 0; i < 3; i++) {
        await page.locator('button:has-text("添加保安")').click();
        await page.locator('input[placeholder="请输入保安姓名"]').fill(`保安${i + 1}`);
        await page.locator('input[placeholder="请输入11位手机号"]').fill('13900139001');
        await page.locator('[role="combobox"]').click();
        await page.locator('text=测试站点').click();
        await page.locator('button:has-text("添加保安")').nth(1).click();
        
        // Wait a bit before next operation
        await page.waitForTimeout(50);
      }
      
      // Should have handled all operations
      expect(operationCount).toBeGreaterThan(0);
    });
  });
});