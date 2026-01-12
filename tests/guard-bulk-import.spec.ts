import { test, expect } from '@playwright/test';

/**
 * Test suite for guard bulk import feature
 */

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
}

test.describe('Guard Bulk Import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to guards page
    await page.click('text=员工管理');
    await page.waitForURL(/\/admin\/guards/);
    await page.waitForLoadState('networkidle');
  });

  test('should display bulk import button', async ({ page }) => {
    // Check if the bulk import button exists
    const bulkImportButton = page.locator('button:has-text("批量导入")');
    await expect(bulkImportButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Bulk import button is visible');
  });

  test('should open bulk import dialog', async ({ page }) => {
    // Click the bulk import button
    await page.click('button:has-text("批量导入")');

    // Wait for dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Verify dialog title
    await expect(page.locator('text=批量导入保安')).toBeVisible();

    // Verify template download buttons exist
    await expect(page.locator('button:has-text("下载 Excel 模板")')).toBeVisible();
    await expect(page.locator('button:has-text("下载 CSV 模板")')).toBeVisible();

    // Verify upload area exists
    await expect(page.locator('text=点击或拖拽文件到此处上传')).toBeVisible();

    console.log('✅ Bulk import dialog opened successfully');
  });

  test('should download Excel template', async ({ page }) => {
    // Click the bulk import button
    await page.click('button:has-text("批量导入")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click download Excel template button
    await page.click('button:has-text("下载 Excel 模板")');

    // Wait for download
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe('保安导入模板.xlsx');
    console.log('✅ Excel template downloaded:', download.suggestedFilename());
  });

  test('should download CSV template', async ({ page }) => {
    // Click the bulk import button
    await page.click('button:has-text("批量导入")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click download CSV template button
    await page.click('button:has-text("下载 CSV 模板")');

    // Wait for download
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe('保安导入模板.csv');
    console.log('✅ CSV template downloaded:', download.suggestedFilename());
  });

  test('should show help info about required fields', async ({ page }) => {
    // Click the bulk import button
    await page.click('button:has-text("批量导入")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Verify help info is displayed
    await expect(page.locator('text=必填字段')).toBeVisible();
    await expect(page.locator('text=姓名、手机号、身份证号、性别、出生日期、所属单位')).toBeVisible();

    console.log('✅ Help info about required fields is displayed');
  });
});
