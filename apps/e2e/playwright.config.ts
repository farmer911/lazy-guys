import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.resolve(import.meta.dirname, '../..');
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const apiHealthURL = process.env.E2E_API_HEALTH_URL || 'http://localhost:4000/api/health';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev:api',
      cwd: rootDir,
      url: apiHealthURL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:web',
      cwd: rootDir,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
