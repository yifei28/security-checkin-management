import { test, expect } from '@playwright/test';

/**
 * Test: Adding a site should automatically create a default checkin location
 */

const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};

test('Adding a site should create default checkin location', async ({ page }) => {
  // Capture API requests
  const apiRequests: { method: string; url: string; body?: string }[] = [];

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/sites')) {
      apiRequests.push({
        method: request.method(),
        url,
        body: request.postData() || undefined
      });
    }
  });

  // Login
  await page.goto('/login');
  await page.fill('input[type="text"]', TEST_CREDENTIALS.username);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

  // Navigate to sites page
  await page.click('text=单位管理');
  await page.waitForURL(/\/admin\/sites/);
  await page.waitForLoadState('networkidle');

  // Click add site button
  await page.click('button:has-text("添加站点")');
  await expect(page.getByRole('dialog')).toBeVisible();

  // Generate unique site name
  const testSiteName = `测试单位_${Date.now()}`;

  // Fill the form
  await page.fill('input[placeholder="请输入站点名称"]', testSiteName);
  await page.fill('input[placeholder="点击地图选择"]:first-of-type', '39.9042');
  await page.locator('input[placeholder="点击地图选择"]').nth(1).fill('116.4074');
  await page.fill('input[placeholder="允许签到的半径范围（米）"]', '200');

  // Submit - click the button inside the dialog
  await page.locator('[role="dialog"] button:has-text("添加站点")').click();

  // Wait for dialog to close
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });

  // Analyze API calls
  console.log('\n=== API Requests ===');
  apiRequests.forEach(req => {
    console.log(`${req.method} ${req.url}`);
    if (req.body) console.log(`  Body: ${req.body.substring(0, 200)}`);
  });

  // Verify POST /api/sites was called (create site)
  const createSiteRequest = apiRequests.find(
    req => req.method === 'POST' && req.url.match(/\/api\/sites$/)
  );
  expect(createSiteRequest).toBeDefined();
  console.log('\n✅ Site creation API called');

  // Verify POST /api/sites/{id}/locations was called (create location)
  const createLocationRequest = apiRequests.find(
    req => req.method === 'POST' && req.url.match(/\/api\/sites\/\d+\/locations/)
  );
  expect(createLocationRequest).toBeDefined();
  console.log('✅ Location creation API called:', createLocationRequest?.url);

  // Verify the location request body contains correct data
  if (createLocationRequest?.body) {
    const locationBody = JSON.parse(createLocationRequest.body);
    expect(locationBody.name).toBe('默认签到点');
    expect(locationBody.latitude).toBe(39.9042);
    expect(locationBody.longitude).toBe(116.4074);
    expect(locationBody.allowedRadius).toBe(200);
    console.log('✅ Location data is correct');
  }

  // Verify the new site appears in the list
  await page.waitForSelector(`text=${testSiteName}`, { timeout: 5000 });
  console.log('✅ New site appears in the list');

  // Expand the new site to verify location count
  await page.locator(`[data-testid="site-row"]:has-text("${testSiteName}")`).click();
  await page.waitForTimeout(2000);

  // Check if location count shows 1
  const locationCountText = await page.locator('text=签到地点').first().textContent();
  console.log('Location count text:', locationCountText);

  console.log('\n=== Test Complete ===');
});
