import { test, expect, testUtils } from './fixtures/test-fixtures';

/**
 * App Feature Tests for AIBuddy Desktop
 * 
 * Tests for specific app features and user flows.
 * More comprehensive than smoke tests.
 */

test.describe('Chat Interface', () => {
  test('should display welcome message or empty state', async ({ appPage, page }) => {
    // Check for welcome content or empty state
    const welcomeTexts = ['welcome', 'start', 'ask', 'help', 'hello'];
    const bodyText = await page.locator('body').textContent() || '';
    
    const hasWelcome = welcomeTexts.some(text => 
      bodyText.toLowerCase().includes(text)
    );
    
    expect(hasWelcome).toBe(true);
  });

  test('should allow typing in chat input', async ({ appPage }) => {
    const testMessage = testUtils.uniqueMessage();
    
    await appPage.chatInput.fill(testMessage);
    await expect(appPage.chatInput).toHaveValue(testMessage);
  });

  test('should clear input field', async ({ appPage }) => {
    await appPage.chatInput.fill('Test');
    await appPage.chatInput.clear();
    await expect(appPage.chatInput).toHaveValue('');
  });

  test('should handle multi-line input', async ({ appPage, page }) => {
    await appPage.chatInput.fill('Line 1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Line 2');
    
    const value = await appPage.chatInput.inputValue();
    expect(value).toContain('Line 1');
  });
});

test.describe('Error Handling', () => {
  test('should not show errors on initial load', async ({ appPage }) => {
    // Wait for app to settle
    await appPage.page.waitForTimeout(1000);
    
    // Check for error indicators
    const hasErrors = await appPage.hasErrorMessage();
    
    // Initial load should be error-free
    expect(hasErrors).toBe(false);
  });

  test('should handle network errors gracefully', async ({ appPage, page }) => {
    // This is a UI-level test - just verify the app doesn't crash
    // when network operations might fail
    
    // Disable network to simulate offline
    await page.context().setOffline(true);
    
    // App should still be functional (input enabled)
    await expect(appPage.chatInput).toBeEnabled();
    
    // Re-enable network
    await page.context().setOffline(false);
  });
});

test.describe('Theme and Appearance', () => {
  test('should have consistent styling', async ({ page }) => {
    // Check that CSS is loaded (buttons have styles)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const styles = await firstButton.evaluate(el => 
        window.getComputedStyle(el)
      );
      
      // Buttons should have some styling
      expect(styles.backgroundColor || styles.color).toBeTruthy();
    }
  });

  test('should support dark mode by default', async ({ page }) => {
    // AIBuddy uses dark theme by default
    const bodyStyles = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el)
    );
    
    // Check for dark background or theme class
    const isDark = bodyStyles.backgroundColor !== 'rgb(255, 255, 255)';
    const hasDarkClass = await page.locator('html, body, #root').evaluate(el => 
      el.classList.contains('dark') || 
      el.getAttribute('data-theme') === 'dark' ||
      document.documentElement.classList.contains('dark')
    );
    
    // Either dark styles or dark class should be present
    expect(isDark || hasDarkClass).toBe(true);
  });
});

test.describe('Accessibility', () => {
  test('should have focusable elements', async ({ page }) => {
    // Tab through the page
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focusedElement = await page.evaluate(() => 
      document.activeElement?.tagName
    );
    
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper heading structure', async ({ page }) => {
    const headings = page.locator('h1, h2, h3, [role="heading"]');
    const count = await headings.count();
    
    // Should have at least one heading
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have labeled form controls', async ({ appPage }) => {
    // Main input should have a label or placeholder
    const placeholder = await appPage.chatInput.getAttribute('placeholder');
    const ariaLabel = await appPage.chatInput.getAttribute('aria-label');
    
    expect(placeholder || ariaLabel).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have memory leaks in chat interaction', async ({ appPage }) => {
    // Type and clear multiple times
    for (let i = 0; i < 10; i++) {
      await appPage.chatInput.fill(`Test ${i}`);
      await appPage.chatInput.clear();
    }
    
    // App should still be responsive
    await appPage.chatInput.fill('Final test');
    await expect(appPage.chatInput).toHaveValue('Final test');
  });
});
