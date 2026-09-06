import { expect, test } from "@playwright/test";
import { open } from "./helpers";

/**
 * A modal has to be on top of everything, including the screen that opened it.
 *
 * `.read-now` sets `z-index: 1`, which makes it a stacking context, so the
 * scrim's `z-index: 80` only ever competed inside it — and the tab bar, a
 * sibling of the screen at 40, painted over the whole sheet. On a 664 px-tall
 * phone that put the bar across the sheet's primary button: it looked correct
 * and could not be pressed.
 *
 * The screens are free to grow z-indexes; this is what stops the next one from
 * bringing the bug back.
 */
test("nothing covers the sheet's primary action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await open(page);
  await page.getByRole("button", { name: "Add something" }).click();
  await page.getByRole("menuitem", { name: "Paste" }).click();

  const covered = await page.evaluate(() => {
    const dialog = document.querySelector("[role=dialog]");
    const buttons = [...(dialog?.querySelectorAll("button") ?? [])];
    return buttons
      .filter((button) => button.getBoundingClientRect().height > 0)
      .map((button) => {
        const box = button.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return {
          label: button.textContent?.trim() || button.getAttribute("aria-label") || "?",
          reachable: top === button || button.contains(top),
          coveredBy: top ? `${top.tagName}.${top.className}` : "nothing",
        };
      })
      .filter((result) => !result.reachable);
  });

  expect(covered, "controls inside the sheet that cannot be pressed").toEqual([]);
});

test("the sheet outranks the tab bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await open(page);
  await page.getByRole("button", { name: "Add something" }).click();
  await page.getByRole("menuitem", { name: "Paste" }).click();

  // Rendered out of the screen's stacking context, so its z-index means what
  // it says rather than what its ancestor allows.
  const scrimParent = await page.evaluate(() => document.querySelector(".sheet-scrim")?.parentElement?.tagName);
  expect(scrimParent).toBe("BODY");
});
