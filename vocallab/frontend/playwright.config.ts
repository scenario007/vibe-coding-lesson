import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 360_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: '../.local/browser-tests',
  use: {
    baseURL: process.env.VOCALLAB_FRONTEND_URL ?? 'http://127.0.0.1:5188',
    trace: 'retain-on-failure',
    launchOptions: process.env.VOCALLAB_CHROMIUM ? { executablePath: process.env.VOCALLAB_CHROMIUM } : {},
  },
})
