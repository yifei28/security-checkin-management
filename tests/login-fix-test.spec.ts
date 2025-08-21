import { test, expect } from '@playwright/test';

test.describe('Login Flow - After CORS Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`[API REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`[API RESPONSE] ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to login page
    await page.goto('http://localhost:5173/login');
  });

  test('should successfully login with correct credentials and redirect to dashboard', async ({ page }) => {
    console.log('=== Testing Login with yifei/11235813 ===');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Current URL:', page.url());

    // Fill in the correct credentials
    await page.fill('input[name="username"]', 'yifei');
    await page.fill('input[name="password"]', '11235813');
    
    // Check remember me
    const rememberMeCheckbox = page.locator('#rememberMe');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
      console.log('Remember me checkbox checked');
    }

    // Take screenshot before submitting
    await page.screenshot({ path: 'test-results/before-login.png', fullPage: true });

    // Submit the form and wait for navigation
    console.log('Submitting login form...');
    const submitButton = page.locator('button[type="submit"]');
    
    // Click submit and wait for navigation to admin dashboard
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 10000 }),
      submitButton.click()
    ]);

    console.log('After login - Current URL:', page.url());

    // Verify we're on the admin dashboard
    expect(page.url()).toMatch(/\/admin/);

    // Check that authentication data is stored
    const authData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        superAdmin: localStorage.getItem('superAdmin'),
      };
    });

    console.log('Authentication data:', authData);
    expect(authData.token).toBeTruthy();

    // Check that dashboard content is loaded
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Take screenshot of successful dashboard
    await page.screenshot({ path: 'test-results/successful-dashboard.png', fullPage: true });

    console.log('✅ Login successful and dashboard loaded');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    console.log('=== Testing Login with invalid credentials ===');

    await page.waitForLoadState('networkidle');
    
    // Fill in invalid credentials
    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'invalid');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should stay on login page
    expect(page.url()).toMatch(/\/login/);
    
    // Should show error message
    const errorMessages = await page.locator('.text-red-500, [role="alert"]').allTextContents();
    console.log('Error messages:', errorMessages);
    
    // Should have some error indication
    expect(errorMessages.length).toBeGreaterThan(0);
    
    console.log('✅ Invalid login correctly rejected');
  });
});