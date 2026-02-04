import { test as base, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage';

/**
 * Custom test fixtures for AIBuddy Desktop E2E tests
 * 
 * Provides pre-configured page objects for common test scenarios.
 */

type TestFixtures = {
  appPage: AppPage;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  appPage: async ({ page }, use) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.waitForPageLoad();
    await use(appPage);
  },
});

export { expect };

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Generate a unique test message
   */
  uniqueMessage: () => `Test message ${Date.now()}`,
  
  /**
   * Wait for a specific duration
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Check if running in CI
   */
  isCI: () => !!process.env.CI,
  
  /**
   * Skip test in CI
   */
  skipInCI: (test: typeof base) => {
    if (process.env.CI) {
      test.skip();
    }
  },
};
