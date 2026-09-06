import { expect, test } from "@playwright/test";
import { open } from "./helpers";

/**
 * What a phone does to a row that was designed across.
 *
 * All three of these are the same mistake wearing different clothes: a flex
 * item with `min-width: 0` is *allowed* to shrink to nothing, and when it does,
 * its text keeps painting outside its own box and straight over its neighbour.
 * The box measurements say the layout is fine; the screen says otherwise. These
 * measure the thing the screen shows.
 *
 * How much each one is worth, honestly: the empty state fails against the code
 * that shipped the bug, so it is a regression test. The other two do not —
 * Playwright does not simulate an iPhone's safe-area insets, and the row
 * collision needed a download in progress to push the hint across. They encode
 * the invariant and will catch it coming back on a narrow viewport, but the
 * device is still the judge for those two.
 */

/*
 * 320 px, not 390. Playwright does not simulate the safe-area insets an iPhone
 * actually has, so the layout has more room here than on the device that found
 * these. The narrowest phone still in use is the honest stand-in: what fits at
 * 320 fits inside the insets at 390.
 */
const PHONE = { width: 320, height: 700 };

test.describe("on a narrow screen", () => {
  test("the empty state's copy keeps its width and its button its own line", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);

    const layout = await page.evaluate(() => {
      const state = [...document.querySelectorAll(".empty-state")].pop();
      if (!state) return null;
      const copy = state.querySelector(".empty-copy")!.getBoundingClientRect();
      const action = state.querySelector(".empty-action")?.getBoundingClientRect();
      return {
        copyWidth: Math.round(copy.width),
        overlaps: action
          ? action.left < copy.right && action.right > copy.left && action.top < copy.bottom && action.bottom > copy.top
          : false,
      };
    });

    expect(layout, "the library should show an empty state").not.toBeNull();
    // It was measured at exactly 0 while its text ran across the button.
    expect(layout!.copyWidth, "the copy collapsed to nothing").toBeGreaterThan(120);
    expect(layout!.overlaps, "the action sits on top of the copy").toBe(false);
  });

  test("a settings row's label never runs across its hint", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    await page.locator("nav.tabbar button").nth(2).click();
    await expect(page.locator(".row").first()).toBeVisible();

    const colliding = await page.evaluate(() =>
      [...document.querySelectorAll(".row-head")]
        .map((head) => {
          const label = head.querySelector(".row-label");
          const hint = head.querySelector(".row-hint");
          if (!label || !hint) return null;
          const a = label.getBoundingClientRect();
          const b = hint.getBoundingClientRect();
          return a.right > b.left + 1 ? `${label.textContent} / ${hint.textContent}` : null;
        })
        .filter(Boolean),
    );

    expect(colliding, "labels printing through their hints").toEqual([]);
  });

  test("the tab bar never sits on the last row", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    await page.locator("nav.tabbar button").nth(2).click();
    await expect(page.locator(".row").first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const covered = await page.evaluate(() => {
      const bar = document.querySelector("nav.tabbar")!.getBoundingClientRect();
      return [...document.querySelectorAll(".row")]
        .filter((row) => {
          const box = row.getBoundingClientRect();
          return box.height > 0 && box.bottom > bar.top && box.top < bar.bottom;
        })
        .map((row) => row.textContent?.slice(0, 30));
    });

    expect(covered, "rows left under the floating tab bar").toEqual([]);
  });
});
