import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for AIBuddy Desktop
 * 
 * Tests the renderer (React/Vite) frontend in isolation.
 * For full Electron testing, use electron-playwright or test via renderer preview.
 * 
 * @see https://playwright.dev/docs/intro
 */
export default defineConfig({
  // E2E test directory
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  
  // Run tests in parallel for speed
  fullyParallel: true,
  
  // Fail CI if test.only() is left in code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests (more in CI)
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers in CI
  workers: process.env.CI ? 1 : undefined,
  
  // Test reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  // Global test options
  use: {
    // Base URL for all tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    
    // Capture trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'on-first-retry',
    
    // Viewport size
    viewport: { width: 1400, height: 900 },
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout
  expect: { timeout: 10000 },
  
  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // For Electron/Vite dev server
    env: {
      NODE_ENV: 'test',
    },
  },
});
