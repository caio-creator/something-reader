import { expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

export const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

/** Land in the app past onboarding, with an empty library. */
export const open = async (page: Page) => {
  // A Playwright context starts with its own empty storage, so there is nothing
  // to clear — and deleting the database on every navigation raced the app
  // opening it, which is a different bug to be debugging.
  await page.addInitScript(() => {
    // The key App.tsx actually reads; onboarding is not what these test.
    localStorage.setItem("something.seen-onboarding", "1");
  });
  await page.goto("/");
  await expect(page.locator("nav.tabbar")).toBeVisible();
};

/**
 * Hand the page a real file, which is the thing the audit could not do.
 *
 * A finished import opens the document — the app takes you to what you just
 * added rather than back to a list — so this waits for the reader, not for a
 * library row.
 */
export const importFile = async (page: Page, name: string) => {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add something" }).click();
  await page.getByRole("menuitem", { name: "Open file" }).click();
  (await chooser).setFiles(fixture(name));
};

export const readerOpened = async (page: Page) => {
  await expect(page.locator(".reader-top")).toBeVisible({ timeout: 30_000 });
};

/**
 * Close the reader and land on the library.
 *
 * Adding switches to the Add screen so the file chooser can be opened from it,
 * and closing returns to wherever you were — which is that screen, not the
 * shelf. The library is one tab away and this says so rather than assuming.
 */
export const closeReader = async (page: Page) => {
  // The header's Close, not a sheet's — Focus mode shows both.
  await page.locator(".reader-top").getByRole("button", { name: "Close" }).click();
  await expect(page.locator("nav.tabbar")).toBeVisible();
  await page.getByRole("button", { name: "Library" }).click();
};

export const cards = (page: Page) => page.locator(".thing");

/**
 * Open one of the reader's panels, wherever it currently lives.
 *
 * Below 600 px, Contents, Look and Pace collapse into one trigger. That is the
 * fix for A13, so a test that only knows the wide layout is testing the wrong
 * app on a phone.
 */
export const openPanel = async (page: Page, name: string) => {
  const direct = page.locator(".reader-top").getByRole("button", { name });
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
    return;
  }
  await page.locator(".reader-top").getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name }).click();
};
