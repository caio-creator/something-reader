import { expect, test } from "@playwright/test";
import { open } from "./helpers";

/**
 * A16: the build offered a link import that returned an instruction to run
 * `bun run dev`. The action is a capability now, so the two environments can be
 * asserted rather than assumed.
 */
test("offers link import where a server can make the request", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Add something" }).click();
  // The dev server has the fetcher, so the action is here.
  await expect(page.getByRole("menuitem", { name: "Web link" })).toBeVisible();
});

test("never offers an action that needs a terminal", async ({ page }) => {
  await open(page);
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("bun run dev");
});
