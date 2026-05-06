import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'bun run build && bun run preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure'
  }
});
