import { test, expect } from '@playwright/test';

test.describe('Login Form Remember Me Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Start the dev server if needed (assumes it's running on port 5173)
    await page.goto('http://localhost:5174/login');
  });

  test('should render remember me checkbox and interact correctly', async ({ page }) => {
    console.log('=== Starting Remember Me Debug Test ===');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check if the checkbox exists
    const checkbox = page.locator('#rememberMe');
    await expect(checkbox).toBeVisible();
    console.log('✅ Checkbox is visible');
    
    // Check initial state
    const initialChecked = await checkbox.isChecked();
    console.log(`Initial checkbox state: ${initialChecked}`);
    
    // Try to check the checkbox by clicking
    console.log('Clicking checkbox...');
    await checkbox.click();
    
    // Wait a moment for state to update
    await page.waitForTimeout(100);
    
    // Check state after click
    const afterClickChecked = await checkbox.isChecked();
    console.log(`After click checkbox state: ${afterClickChecked}`);
    
    // Try clicking the label instead
    console.log('Clicking label...');
    await page.locator('label[for="rememberMe"]').click();
    await page.waitForTimeout(100);
    
    const afterLabelClickChecked = await checkbox.isChecked();
    console.log(`After label click checkbox state: ${afterLabelClickChecked}`);
    
    // Check the React Hook Form debug info
    const debugInfo = page.locator('text=Debug: RememberMe');
    if (await debugInfo.isVisible()) {
      const debugText = await debugInfo.textContent();
      console.log(`Debug info: ${debugText}`);
    }
    
    // Fill out form with valid data and check the checkbox programmatically
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass123');
    
    // Force check the checkbox using JavaScript
    console.log('Force checking checkbox with JavaScript...');
    await page.evaluate(() => {
      const checkbox = document.getElementById('rememberMe') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await page.waitForTimeout(100);
    const forceCheckedState = await checkbox.isChecked();
    console.log(`After force check state: ${forceCheckedState}`);
    
    // Check if form shows it as checked in debug
    if (await debugInfo.isVisible()) {
      const finalDebugText = await debugInfo.textContent();
      console.log(`Final debug info: ${finalDebugText}`);
    }
    
    // Test if the Controller component receives the change
    const controllerInput = page.locator('[data-state="checked"], [data-state="unchecked"]');
    if (await controllerInput.isVisible()) {
      const dataState = await controllerInput.getAttribute('data-state');
      console.log(`Controller data-state: ${dataState}`);
    }
  });

  test('should handle form submission with remember me', async ({ page }) => {
    console.log('=== Testing Form Submission with Remember Me ===');
    
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass123');
    
    // Check remember me
    await page.check('#rememberMe');
    
    // Wait for validation
    await page.waitForTimeout(200);
    
    // Check if the form data includes rememberMe
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
      }
      return {};
    });
    
    console.log('Form data:', formData);
    
    // Check React Hook Form state via debug info
    const debugInfo = page.locator('text=Debug: RememberMe');
    if (await debugInfo.isVisible()) {
      const debugText = await debugInfo.textContent();
      console.log(`Form debug info: ${debugText}`);
    }
    
    // Try to trigger form submission (this will likely fail due to API, but we can see the request)
    await page.click('button[type="submit"]');
    
    // Wait briefly to see if any network requests are made
    await page.waitForTimeout(1000);
  });

  test('should preserve checkbox state on page interactions', async ({ page }) => {
    console.log('=== Testing Checkbox State Persistence ===');
    
    await page.waitForLoadState('networkidle');
    
    // Check the checkbox
    await page.check('#rememberMe');
    
    // Interact with other form fields
    await page.fill('#username', 'test');
    await page.fill('#password', 'test123');
    
    // Clear a field (this might trigger form re-render)
    await page.fill('#username', '');
    
    // Check if checkbox is still checked
    const stillChecked = await page.locator('#rememberMe').isChecked();
    console.log(`Checkbox still checked after form interaction: ${stillChecked}`);
    
    // Check debug info
    const debugInfo = page.locator('text=Debug: RememberMe');
    if (await debugInfo.isVisible()) {
      const debugText = await debugInfo.textContent();
      console.log(`Debug info after interaction: ${debugText}`);
    }
  });
});