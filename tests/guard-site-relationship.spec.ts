/**
 * Guard-Site Relationship and ID Type Bug Tests
 * 
 * This test suite specifically tests:
 * - One-to-one guard-site relationship enforcement
 * - ID type consistency after CRUD operations
 * - Prevention of "startsWith is not a function" errors
 * - Proper data type handling between frontend and backend
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_CREDENTIALS = {
  username: 'yifei',
  password: '11235813'
};

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/);
}

async function navigateToGuards(page: Page) {
  await page.click('a[href="/admin/guards"]');
  await expect(page).toHaveURL('/admin/guards');
}

async function navigateToSites(page: Page) {
  await page.click('a[href="/admin/sites"]');
  await expect(page).toHaveURL('/admin/sites');
}

test.describe('Guard-Site Relationship and ID Type Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('One-to-One Guard-Site Relationship', () => {
    test('should enforce single site selection for guards', async ({ page }) => {
      await navigateToGuards(page);
      await page.click('button:has-text("添加保安")');
      
      // Check site selection is single select
      const siteSelect = page.locator('[role="combobox"]');
      await expect(siteSelect).toBeVisible();
      
      // Open site selector
      await siteSelect.click();
      
      // Should show site options
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        // Select first site
        await options.first().click();
        
        // Verify selection is reflected in the input
        await expect(siteSelect).toContainText(/.+/); // Should have some text (site name)
        
        // Try to open selector again - should show current selection
        await siteSelect.click();
        const checkedOptions = page.locator('[role="option"][data-state="checked"]');
        await expect(checkedOptions).toHaveCount(1);
      }
    });

    test('should prevent multiple site assignment', async ({ page }) => {
      await navigateToGuards(page);
      
      // Try to add a guard
      await page.click('button:has-text("添加保安")');
      
      await page.fill('input[placeholder*="姓名"]', '单站点测试保安');
      await page.fill('input[placeholder*="手机号"]', '13900000001');
      
      // Select a site
      const siteSelect = page.locator('[role="combobox"]');
      await siteSelect.click();
      
      const options = page.locator('[role="option"]');
      if (await options.count() > 0) {
        await options.first().click();
        
        // Submit form
        await page.click('[role="dialog"] button:has-text("添加保安")');
        
        // Wait for dialog to close
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify guard was created with single site
        await expect(page.locator('text=单站点测试保安')).toBeVisible();
        
        // Find the created guard and check it shows only one site
        const guardRow = page.locator('[data-testid="guard-row"]:has-text("单站点测试保安")');
        await expect(guardRow).toBeVisible();
        
        // The site cell should show one site, not multiple
        const siteCell = guardRow.locator('td').nth(3); // Site column
        const siteText = await siteCell.textContent();
        expect(siteText).not.toContain('，'); // Should not contain comma (multiple sites)
        expect(siteText).not.toContain('、'); // Should not contain Chinese comma
      }
    });

    test('should update guard site assignment correctly', async ({ page }) => {
      await navigateToGuards(page);
      
      // Find first guard and edit
      const guardRows = page.locator('[data-testid="guard-row"]');
      if (await guardRows.count() > 0) {
        const firstRow = guardRows.first();
        const editButton = firstRow.locator('[data-testid*="edit-guard"]');
        await editButton.click();
        
        // Dialog should open
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        // Change site assignment
        const siteSelect = page.locator('[role="combobox"]');
        await siteSelect.click();
        
        const options = page.locator('[role="option"]');
        if (await options.count() > 1) {
          // Select a different site
          await options.nth(1).click();
          
          // Save changes
          await page.click('button:has-text("保存更改")');
          
          // Wait for dialog to close
          await expect(page.locator('[role="dialog"]')).not.toBeVisible();
          
          // Verify the site was updated (no errors)
          await expect(firstRow).toBeVisible();
        }
      }
    });
  });

  test.describe('ID Type Consistency and Bug Prevention', () => {
    test('should handle multiple consecutive edits without ID type errors', async ({ page }) => {
      await navigateToGuards(page);
      
      const guardRows = page.locator('[data-testid="guard-row"]');
      const rowCount = await guardRows.count();
      
      if (rowCount > 0) {
        const targetRow = guardRows.first();
        
        // First edit
        await targetRow.locator('[data-testid*="edit-guard"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        const nameInput = page.locator('input[placeholder*="姓名"]');
        await nameInput.clear();
        await nameInput.fill('第一次编辑');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify first edit worked
        await expect(page.locator('text=第一次编辑')).toBeVisible();
        
        // Second edit immediately (this should not cause "startsWith is not a function" error)
        await targetRow.locator('[data-testid*="edit-guard"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        await nameInput.clear();
        await nameInput.fill('第二次编辑');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify second edit worked
        await expect(page.locator('text=第二次编辑')).toBeVisible();
        
        // Third edit to be thorough
        await targetRow.locator('[data-testid*="edit-guard"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        await nameInput.clear();
        await nameInput.fill('第三次编辑');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify third edit worked
        await expect(page.locator('text=第三次编辑')).toBeVisible();
      }
    });

    test('should handle site edits without ID type errors', async ({ page }) => {
      await navigateToSites(page);
      
      const siteRows = page.locator('[data-testid="site-row"]');
      const rowCount = await siteRows.count();
      
      if (rowCount > 0) {
        const targetRow = siteRows.first();
        
        // First edit
        await targetRow.locator('[data-testid*="edit-site"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        const nameInput = page.locator('input[placeholder*="站点名称"]');
        await nameInput.clear();
        await nameInput.fill('站点第一次编辑');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify first edit worked
        await expect(page.locator('text=站点第一次编辑')).toBeVisible();
        
        // Second edit immediately
        await targetRow.locator('[data-testid*="edit-site"]').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        
        await nameInput.clear();
        await nameInput.fill('站点第二次编辑');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Verify second edit worked
        await expect(page.locator('text=站点第二次编辑')).toBeVisible();
      }
    });

    test('should handle guard creation after editing existing guards', async ({ page }) => {
      await navigateToGuards(page);
      
      // First, edit an existing guard if available
      const guardRows = page.locator('[data-testid="guard-row"]');
      if (await guardRows.count() > 0) {
        const firstRow = guardRows.first();
        await firstRow.locator('[data-testid*="edit-guard"]').click();
        
        const nameInput = page.locator('input[placeholder*="姓名"]');
        await nameInput.clear();
        await nameInput.fill('编辑后的保安');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      }
      
      // Now create a new guard (should not cause ID type issues)
      await page.click('button:has-text("添加保安")');
      
      await page.fill('input[placeholder*="姓名"]', 'ID类型测试保安');
      await page.fill('input[placeholder*="手机号"]', '13900000002');
      
      // Select a site
      const siteSelect = page.locator('[role="combobox"]');
      await siteSelect.click();
      
      const options = page.locator('[role="option"]');
      if (await options.count() > 0) {
        await options.first().click();
      }
      
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify creation worked
      await expect(page.locator('text=ID类型测试保安')).toBeVisible();
    });

    test('should handle mixed operations (create, edit, delete) without errors', async ({ page }) => {
      await navigateToGuards(page);
      
      const initialRowCount = await page.locator('[data-testid="guard-row"]').count();
      
      // Create a test guard
      await page.click('button:has-text("添加保安")');
      await page.fill('input[placeholder*="姓名"]', '混合操作测试保安');
      await page.fill('input[placeholder*="手机号"]', '13900000003');
      
      const siteSelect = page.locator('[role="combobox"]');
      await siteSelect.click();
      const options = page.locator('[role="option"]');
      if (await options.count() > 0) {
        await options.first().click();
      }
      
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify creation
      await expect(page.locator('text=混合操作测试保安')).toBeVisible();
      
      // Edit the created guard
      const createdGuardRow = page.locator('[data-testid="guard-row"]:has-text("混合操作测试保安")');
      await createdGuardRow.locator('[data-testid*="edit-guard"]').click();
      
      const nameInput = page.locator('input[placeholder*="姓名"]');
      await nameInput.clear();
      await nameInput.fill('混合操作已编辑保安');
      
      await page.click('button:has-text("保存更改")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify edit
      await expect(page.locator('text=混合操作已编辑保安')).toBeVisible();
      
      // Delete the guard
      const editedGuardRow = page.locator('[data-testid="guard-row"]:has-text("混合操作已编辑保安")');
      
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      await editedGuardRow.locator('[data-testid*="delete-guard"]').click();
      
      // Wait for deletion
      await page.waitForTimeout(1000);
      
      // Verify deletion
      await expect(page.locator('text=混合操作已编辑保安')).not.toBeVisible();
      
      // Create another guard after deletion to ensure state is clean
      await page.click('button:has-text("添加保安")');
      await page.fill('input[placeholder*="姓名"]', '后续创建保安');
      await page.fill('input[placeholder*="手机号"]', '13900000004');
      
      await siteSelect.click();
      if (await options.count() > 0) {
        await options.first().click();
      }
      
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Verify final creation worked
      await expect(page.locator('text=后续创建保安')).toBeVisible();
    });
  });

  test.describe('Data Type Validation and Error Prevention', () => {
    test('should handle backend responses with numeric IDs correctly', async ({ page }) => {
      // Mock API responses to return numeric IDs (simulating backend behavior)
      await page.route('**/api/guards**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        
        if (method === 'POST') {
          // Mock create response with numeric ID
          await route.fulfill({
            json: {
              success: true,
              data: {
                id: 12345, // Numeric ID
                name: '数字ID测试保安',
                phoneNumber: '13900000005',
                employeeId: 'EMP001',
                site: {
                  id: 67890, // Numeric site ID
                  name: '测试站点'
                }
              }
            }
          });
        } else if (method === 'PUT') {
          // Mock update response with numeric ID
          await route.fulfill({
            json: {
              success: true,
              data: {
                id: 12345, // Numeric ID
                name: '更新后的数字ID保安',
                phoneNumber: '13900000005',
                employeeId: 'EMP001',
                site: {
                  id: 67890, // Numeric site ID
                  name: '测试站点'
                }
              }
            }
          });
        } else {
          // Continue with normal request for GET, DELETE, etc.
          await route.continue();
        }
      });
      
      await navigateToGuards(page);
      
      // Create guard with mocked numeric ID response
      await page.click('button:has-text("添加保安")');
      await page.fill('input[placeholder*="姓名"]', '数字ID测试保安');
      await page.fill('input[placeholder*="手机号"]', '13900000005');
      
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Should handle numeric ID without errors
      await expect(page.locator('text=数字ID测试保安')).toBeVisible();
      
      // Try to edit immediately (this should not cause "startsWith is not a function")
      const guardRow = page.locator('[data-testid="guard-row"]:has-text("数字ID测试保安")');
      await guardRow.locator('[data-testid*="edit-guard"]').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Make an edit
      const nameInput = page.locator('input[placeholder*="姓名"]');
      await nameInput.clear();
      await nameInput.fill('数字ID测试保安已编辑');
      
      await page.click('button:has-text("保存更改")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Should complete without errors
      await expect(page.locator('text=更新后的数字ID保安')).toBeVisible();
    });

    test('should handle mixed string and numeric IDs in the same session', async ({ page }) => {
      await navigateToGuards(page);
      
      // Get current guards (might have string IDs)
      const initialRows = await page.locator('[data-testid="guard-row"]').count();
      
      // Edit an existing guard (might have string ID from backend)
      if (initialRows > 0) {
        const firstRow = page.locator('[data-testid="guard-row"]').first();
        await firstRow.locator('[data-testid*="edit-guard"]').click();
        
        const nameInput = page.locator('input[placeholder*="姓名"]');
        await nameInput.clear();
        await nameInput.fill('混合ID类型测试');
        
        await page.click('button:has-text("保存更改")');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      }
      
      // Now mock a response with numeric ID for new creation
      await page.route('**/api/guards', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              data: {
                id: 99999, // Force numeric ID
                name: '新数字ID保安',
                phoneNumber: '13900000006',
                employeeId: 'EMP002',
                site: {
                  id: 77777,
                  name: '数字ID站点'
                }
              }
            }
          });
        } else {
          await route.continue();
        }
      });
      
      // Create new guard with numeric ID
      await page.click('button:has-text("添加保安")');
      await page.fill('input[placeholder*="姓名"]', '新数字ID保安');
      await page.fill('input[placeholder*="手机号"]', '13900000006');
      
      await page.click('button:has-text("添加保安")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Should handle both string and numeric IDs correctly
      await expect(page.locator('text=新数字ID保安')).toBeVisible();
      
      // Edit both types of guards in succession
      if (initialRows > 0) {
        // Edit original guard (string ID)
        const originalRow = page.locator('[data-testid="guard-row"]:has-text("混合ID类型测试")');
        if (await originalRow.count() > 0) {
          await originalRow.locator('[data-testid*="edit-guard"]').click();
          
          const nameInput = page.locator('input[placeholder*="姓名"]');
          await nameInput.clear();
          await nameInput.fill('原有保安再次编辑');
          
          await page.click('button:has-text("保存更改")');
          await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        }
      }
      
      // Edit new guard (numeric ID)
      const newRow = page.locator('[data-testid="guard-row"]:has-text("新数字ID保安")');
      await newRow.locator('[data-testid*="edit-guard"]').click();
      
      const nameInput = page.locator('input[placeholder*="姓名"]');
      await nameInput.clear();
      await nameInput.fill('数字ID保安已编辑');
      
      await page.click('button:has-text("保存更改")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Both should work without errors
      await expect(page.locator('text=数字ID保安已编辑')).toBeVisible();
    });
  });

  test.describe('Employee ID Auto-generation', () => {
    test('should not show employee ID field in add guard form', async ({ page }) => {
      await navigateToGuards(page);
      await page.click('button:has-text("添加保安")');
      
      // Check that employeeId field is NOT present in the dialog
      await expect(page.locator('[role="dialog"] label:has-text("工号")')).not.toBeVisible();
      await expect(page.locator('[role="dialog"] input[placeholder*="工号"]')).not.toBeVisible();
      
      // Only name, phone, and site should be present
      await expect(page.locator('label:has-text("姓名")')).toBeVisible();
      await expect(page.locator('label:has-text("手机号")')).toBeVisible();
      await expect(page.locator('label:has-text("所属站点")')).toBeVisible();
    });

    test('should not show employee ID field in edit guard form', async ({ page }) => {
      await navigateToGuards(page);
      
      const guardRows = page.locator('[data-testid="guard-row"]');
      if (await guardRows.count() > 0) {
        await guardRows.first().locator('[data-testid*="edit-guard"]').click();
        
        // Check that employeeId field is NOT present in edit form
        await expect(page.locator('label:has-text("工号")')).not.toBeVisible();
        await expect(page.locator('input[placeholder*="工号"]')).not.toBeVisible();
        
        // Only name, phone, and site should be editable
        await expect(page.locator('label:has-text("姓名")')).toBeVisible();
        await expect(page.locator('label:has-text("手机号")')).toBeVisible();
        await expect(page.locator('label:has-text("所属站点")')).toBeVisible();
      }
    });

    test('should display auto-generated employee ID in guard list', async ({ page }) => {
      await navigateToGuards(page);
      
      // Check that employee ID column is present in the table
      await expect(page.locator('th:has-text("工号")')).toBeVisible();
      
      // Check that guards display their employee IDs
      const guardRows = page.locator('[data-testid="guard-row"]');
      if (await guardRows.count() > 0) {
        const firstRow = guardRows.first();
        const employeeIdCell = firstRow.locator('td').nth(2); // Employee ID column
        
        // Should have some employee ID value
        const employeeIdText = await employeeIdCell.textContent();
        expect(employeeIdText).toBeTruthy();
        expect(employeeIdText.trim()).not.toBe('');
      }
    });
  });
});