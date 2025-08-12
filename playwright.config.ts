import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable console logging
        launchOptions: {
          // Run in headed mode for debugging
          headless: false,
          slowMo: 500, // Slow down actions by 500ms for visibility
        }
      },
    },
  ],

  // Run preview server before starting tests
  webServer: {
    command: 'npm run preview',
    port: 4175,
    reuseExistingServer: true,
  },
});