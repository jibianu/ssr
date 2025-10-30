import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Angular SSR Application
 * 
 * Features:
 * - SSR validation tests
 * - Route navigation tests
 * - Meta tag rendering tests
 * - Cross-browser testing (Chrome, Firefox, Safari)
 * 
 * Installation:
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install
 * 
 * Usage:
 *   pnpm exec playwright test                    # Run all tests
 *   pnpm exec playwright test --ui               # Run with UI
 *   pnpm exec playwright test --headed           # Run in headed mode
 *   pnpm exec playwright test home-page          # Run specific test file
 *   pnpm exec playwright show-report             # Show last test report
 */

export default defineConfig({
  // Test directory containing all test files
  testDir: './tests',
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/junit.xml' }]] : []),
  ],
  
  // Global test settings
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    
    // Screenshot settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    // Video recording
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
    
    // Trace collection (useful for debugging)
    trace: 'on-first-retry',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Network settings
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chromium-specific settings
        channel: 'chrome',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile viewport tests
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web server configuration
  // Automatically starts the SSR server before tests
  webServer: {
    command: 'pnpm run serve:ssr',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
