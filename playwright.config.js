import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://vital-production-82b0.up.railway.app';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone-ish to catch mobile layout issues
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});

