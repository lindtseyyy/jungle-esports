import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: process.env.PLAYWRIGHT_BASE_URL
      ? 'npm run preview -- --port 4173'
      : 'npm run dev -- --port 5173',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
