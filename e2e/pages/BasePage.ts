import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object for AIBuddy Desktop E2E tests
 * 
 * Provides common functionality shared by all page objects:
 * - Navigation
 * - Element helpers
 * - Common actions
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by role
   */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by placeholder
   */
  getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  /**
   * Get element by text
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(locator: Locator, timeout = 10000) {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Check if element exists and is visible
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    try {
      await expect(locator).toBeVisible({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
}
