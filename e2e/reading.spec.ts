import { expect, test } from "@playwright/test";
import { cards, closeReader, importFile, open, openPanel, readerOpened } from "./helpers";

/**
 * The transitions the audit found broken, in the browser that broke them.
 */

/** Importing opens what you imported, so this lands in the reader. */
const openSample = async (page: import("@playwright/test").Page) => {
  await open(page);
  await importFile(page, "sample.epub");
  await readerOpened(page);
};

test.describe("reading", () => {
  test("opens a document in Text, not in Focus", async ({ page }) => {
    await openSample(page);
    await expect(page.locator(".prose")).toBeVisible();
  });

  /* A01: continuous reading used to lose everything since the last pause. */
  test("keeps the position across a reload while playing", async ({ page }) => {
    await openSample(page);
    await page.keyboard.press("Space");
    await page.waitForTimeout(3000);
    const before = await page.evaluate(() => document.querySelectorAll(".word.is-read").length);
    expect(before).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator("nav.tabbar")).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
    await cards(page).first().locator(".thing-open").click();
    await readerOpened(page);
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => document.querySelectorAll(".word.is-read").length);
    expect(after).toBeGreaterThan(0);
  });

  /*
   * A07: picking a chapter moved the slider and left the text at the top.
   *
   * Which element scrolls is the reader's business, not the test's, so this
   * asks the page how far anything in it has scrolled rather than naming a
   * container and being wrong when the layout changes.
   */
  const scrolled = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      Math.max(
        window.scrollY,
        ...[...document.querySelectorAll("*")].map((el) => (el as HTMLElement).scrollTop || 0),
      ),
    );

  test("a chapter brings the text with it, and stays in Text", async ({ page }) => {
    // Three chapters and enough paragraphs that the document has to be
    // scrolled: the tiny fixture fits on one screen, where "did it scroll"
    // cannot be asked.
    await open(page);
    await importFile(page, "long.epub");
    await readerOpened(page);
    await expect(page.locator(".prose")).toBeVisible();
    const before = await scrolled(page);

    await openPanel(page, "Contents");
    const sections = page.locator(".contents-list button");
    test.skip(await sections.count() < 2, "the fixture has a single section");
    await sections.last().click();
    await page.waitForTimeout(800);

    // The destination came into view, and the mode did not change to get there.
    expect(await scrolled(page)).toBeGreaterThan(before);
    await expect(page.locator(".prose")).toBeVisible();
  });

  test("remembers the mode per document", async ({ page }) => {
    await openSample(page);
    await page.getByRole("button", { name: /Switch to Focus/ }).click();
    await expect(page.locator(".prose")).toHaveCount(0);
    await closeReader(page);
    await cards(page).first().locator(".thing-open").click();
    await readerOpened(page);
    await expect(page.locator(".prose")).toHaveCount(0);
  });
});

test.describe("the reader's header", () => {
  test("never lets the actions sit on the title", async ({ page }, testInfo) => {
    await openSample(page);
    for (const width of [360, 379, 380, 414, 1440]) {
      if (testInfo.project.name === "phone" && width > 414) continue;
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(150);
      const boxes = await page.evaluate(() => {
        const bar = document.querySelector(".reader-top")!;
        const title = bar.querySelector(".reader-title")!.getBoundingClientRect();
        const buttons = [...bar.querySelectorAll("button")]
          .filter((b) => (b as HTMLElement).offsetParent !== null)
          .map((b) => b.getBoundingClientRect());
        return { title, buttons, docWidth: document.documentElement.scrollWidth, view: window.innerWidth };
      });
      expect(boxes.docWidth, `no sideways scroll at ${width}px`).toBeLessThanOrEqual(boxes.view + 1);
      for (const button of boxes.buttons) {
        const overlaps = button.left < boxes.title.right && button.right > boxes.title.left;
        expect(overlaps, `a control overlaps the title at ${width}px`).toBe(false);
      }
      // Close and Listen survive every width.
      await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    }
  });
});
