import { test, expect } from '@playwright/test';

/**
 * Test suite for multi-location management feature
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

test.describe('Site Location Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to sites page
    await page.click('text=单位管理');
    await page.waitForURL(/\/admin\/sites/);
    await page.waitForLoadState('networkidle');
  });

  test('should display location management button in site table', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Check if the location management button exists (MapPin icon button)
    const locationButtons = await page.locator('[data-testid^="locations-site-"]').count();
    expect(locationButtons).toBeGreaterThan(0);

    console.log(`Found ${locationButtons} location management buttons`);
  });

  test('should open location management dialog when clicking location button', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Click the first location management button
    const locationButton = page.locator('[data-testid^="locations-site-"]').first();
    await locationButton.click();

    // Wait for dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Verify dialog title
    await expect(page.locator('text=管理签到地点')).toBeVisible();

    // Verify dialog contains location list and map
    await expect(page.locator('text=签到地点列表')).toBeVisible();
    await expect(page.locator('text=地图预览')).toBeVisible();
    await expect(page.locator('text=添加地点')).toBeVisible();
  });

  test('should show location count in expanded detail', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Click to expand the first row
    await page.locator('[data-testid="site-row"]').first().click();

    // Wait for expanded content to load
    await page.waitForTimeout(2000);

    // Check if location count card is visible (the "签到地点" card header)
    const locationCard = page.locator('text=签到地点').first();
    await expect(locationCard).toBeVisible({ timeout: 5000 });

    // Check if "管理地点" button is visible
    await expect(page.locator('text=管理地点')).toBeVisible();
  });

  test('should open location dialog from expanded detail', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Click to expand the first row
    await page.locator('[data-testid="site-row"]').first().click();

    // Wait for expanded content to load
    await page.waitForTimeout(2000);

    // Click "管理地点" link
    await page.locator('text=管理地点').click();

    // Wait for dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Verify we can see the location management content
    await expect(page.locator('text=签到地点列表')).toBeVisible();
  });

  test('should display map in expanded detail', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Click to expand the first row
    await page.locator('[data-testid="site-row"]').first().click();

    // Wait for map to load
    await page.waitForTimeout(3000);

    // Check if map container exists
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 5000 });

    // Check if "签到位置" label is visible
    await expect(page.locator('text=签到位置')).toBeVisible();
  });

  test('should show add location form in dialog', async ({ page }) => {
    // Wait for sites table to load
    await page.waitForSelector('[data-testid="site-row"]', { timeout: 15000 });

    // Click the first location management button
    const locationButton = page.locator('[data-testid^="locations-site-"]').first();
    await locationButton.click();

    // Wait for dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Click "添加地点" button
    await page.locator('button:has-text("添加地点")').click();

    // Verify the add form appears with expected fields
    await expect(page.locator('text=新签到地点')).toBeVisible();
    await expect(page.locator('label:has-text("地点名称")')).toBeVisible();
    await expect(page.locator('label:has-text("纬度")')).toBeVisible();
    await expect(page.locator('label:has-text("经度")')).toBeVisible();
    await expect(page.locator('label:has-text("签到范围")')).toBeVisible();
  });
});
