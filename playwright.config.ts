import { defineConfig, devices } from "@playwright/test";

/**
 * The tests the audit could not run.
 *
 * EPUB, DOCX and PDF were never accepted end to end because the Chrome
 * extension driving the browser refused `setFiles`, so every format that
 * arrives as a file was covered by core tests and nothing else. A driver that
 * can hand the page a real file closes that, and the import worker, the drag
 * target and the quota path come with it.
 *
 * Against the dev server: the importers run in a browser worker either way, and
 * link import only exists where a server can make the request — the static
 * build's own behaviour is asserted separately, as a capability.
 */
const PORT = 5199;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // The app honours this, so the tests stop racing entry animations and
    // exercise the path a reader who asked for less motion actually gets.
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    // Bound explicitly: vite's default `localhost` resolves to ::1 only, and
    // the health check below asks 127.0.0.1.
    command: `bun run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
