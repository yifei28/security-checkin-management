import { test, expect } from '@playwright/test';

test.describe('Login Flow Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Monitor network requests
    page.on('request', request => {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    });

    // Navigate to login page
    await page.goto('http://localhost:5174/login');
  });

  test('should debug complete login flow', async ({ page }) => {
    console.log('=== Starting Login Flow Debug ===');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check initial page state
    console.log('Current URL:', page.url());
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'debug-login-initial.png', fullPage: true });

    // Check if login form is visible
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
    console.log('Login form is visible');

    // Fill in login credentials (using test credentials)
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    console.log('Filling in test credentials...');
    await usernameInput.fill('admin');
    await passwordInput.fill('password123');

    // Check remember me checkbox
    const rememberMeCheckbox = page.locator('#rememberMe');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
      console.log('Remember me checkbox checked');
    }

    // Take screenshot before submitting
    await page.screenshot({ path: 'debug-before-submit.png', fullPage: true });

    // Submit the form
    console.log('Submitting login form...');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // Click submit and wait for navigation or error
    await Promise.race([
      submitButton.click(),
      page.waitForURL('**/admin**', { timeout: 10000 }).catch(() => console.log('No redirect to admin')),
    ]);

    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    console.log('After submit - Current URL:', page.url());

    // Check for any error messages
    const errorElements = page.locator('[class*="error"], [role="alert"], .text-destructive');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      console.log(`Found ${errorCount} potential error elements:`);
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`Error ${i + 1}: ${errorText}`);
      }
    }

    // Check for loading states
    const loadingElements = page.locator('[class*="loading"], [class*="spinner"], [class*="animate-spin"]');
    const loadingCount = await loadingElements.count();
    
    if (loadingCount > 0) {
      console.log(`Found ${loadingCount} loading elements - form might still be processing`);
      await page.waitForTimeout(3000); // Wait for loading to complete
      console.log('After waiting for loading - Current URL:', page.url());
    }

    // Take screenshot after submit
    await page.screenshot({ path: 'debug-after-submit.png', fullPage: true });

    // Check localStorage for authentication data
    const tokenData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        superAdmin: localStorage.getItem('superAdmin'),
      };
    });
    
    console.log('LocalStorage data after login:', tokenData);

    // Check if we're on the dashboard
    if (page.url().includes('/admin')) {
      console.log('✅ Successfully redirected to admin dashboard');
      
      // Check if dashboard content is loaded
      const dashboardTitle = page.locator('h1, h2').first();
      if (await dashboardTitle.isVisible()) {
        const titleText = await dashboardTitle.textContent();
        console.log('Dashboard title:', titleText);
      }
    } else {
      console.log('❌ Not redirected to dashboard');
      
      // Check what happened
      if (page.url().includes('/login')) {
        console.log('Still on login page - login likely failed');
        
        // Check for validation errors
        const validationErrors = page.locator('.text-red-500, [class*="error"]');
        const validationCount = await validationErrors.count();
        
        for (let i = 0; i < validationCount; i++) {
          const errorText = await validationErrors.nth(i).textContent();
          console.log(`Validation error ${i + 1}: ${errorText}`);
        }
      }
    }

    // Final state check
    console.log('=== Final State ===');
    console.log('Final URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
  });

  test('should test with different credentials', async ({ page }) => {
    console.log('=== Testing with different credentials ===');

    await page.waitForLoadState('networkidle');
    
    const credentials = [
      { username: 'test', password: 'test123' },
      { username: 'admin', password: 'admin' },
      { username: 'superadmin', password: 'password' },
    ];

    for (const cred of credentials) {
      console.log(`Trying credentials: ${cred.username}/${cred.password}`);
      
      // Clear form first
      await page.locator('input[name="username"]').fill('');
      await page.locator('input[name="password"]').fill('');
      
      // Fill credentials
      await page.locator('input[name="username"]').fill(cred.username);
      await page.locator('input[name="password"]').fill(cred.password);
      
      // Submit
      await page.locator('button[type="submit"]').click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      console.log(`After ${cred.username} login attempt - URL: ${page.url()}`);
      
      if (page.url().includes('/admin')) {
        console.log(`✅ Login successful with ${cred.username}`);
        break;
      } else {
        console.log(`❌ Login failed with ${cred.username}`);
        
        // Check for specific error message
        const errorMessage = await page.locator('.text-red-500, [role="alert"]').first().textContent().catch(() => 'No error message');
        console.log(`Error message: ${errorMessage}`);
        
        // Reset for next attempt (if we're still on login page)
        if (page.url().includes('/login')) {
          await page.reload();
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test('should test API endpoint connectivity', async ({ page }) => {
    console.log('=== Testing API Endpoint ===');

    // Test the login API endpoint directly
    const response = await page.request.post('http://localhost:8080/api/login', {
      data: {
        username: 'admin',
        password: 'password123'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Direct API call status: ${response.status()}`);
    
    if (response.ok()) {
      const responseData = await response.json();
      console.log('API Response:', responseData);
    } else {
      console.log('API Error:', await response.text());
      
      // Test if backend is running
      try {
        const healthCheck = await page.request.get('http://localhost:8080/health').catch(() => null);
        if (healthCheck) {
          console.log(`Health check status: ${healthCheck.status()}`);
        } else {
          console.log('❌ Backend server appears to be down');
        }
      } catch (error) {
        console.log('❌ Cannot reach backend server:', error);
      }
    }
  });
});