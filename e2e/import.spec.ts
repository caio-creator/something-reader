import { expect, test } from "@playwright/test";
import { cards, closeReader, importFile, open, readerOpened } from "./helpers";

/**
 * Every format, through the real importer, in a real browser.
 *
 * The audit's matrix left EPUB, DOCX and both kinds of PDF at "core covered,
 * E2E pending" because the driver could not hand the page a file. This is the
 * part that was missing, not a repeat of the unit tests: the worker, the
 * transferred buffer, the progress phases and the library row.
 */

test.describe("opening a file", () => {
  // Titles come from the document where it has one and from the filename where
  // it does not, so what is asserted is that something readable arrived — not a
  // particular string per format.
  for (const file of ["sample.epub", "sample.docx", "sample.md", "sample.txt", "sample.html", "sample.pdf"]) {
    test(`imports ${file}`, async ({ page }) => {
      await open(page);
      await importFile(page, file);
      await readerOpened(page);
      await expect(page.locator(".reader-title")).not.toBeEmpty();
      await expect(page.locator(".prose p").first()).not.toBeEmpty();
      await closeReader(page);
      await expect(cards(page)).toHaveCount(1);
    });
  }

  test("says so plainly when a PDF has no text to extract", async ({ page }) => {
    await open(page);
    await importFile(page, "scanned.pdf");
    // An honest refusal or an honest empty state — never a blank reader with
    // nothing in it and nothing said about why.
    await expect(page.getByRole("alert").or(page.locator(".reader-top"))).toBeVisible({ timeout: 30_000 });
    if (await page.locator(".reader-top").isVisible()) {
      await expect(page.locator(".prose, .empty-state")).toBeVisible();
    }
  });

  test("refuses a file that is not what it claims to be", async ({ page }) => {
    await open(page);
    await importFile(page, "broken.epub");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
    await expect(cards(page)).toHaveCount(0);
  });

  test("does not import the same document twice", async ({ page }) => {
    await open(page);
    await importFile(page, "sample.epub");
    await readerOpened(page);
    await closeReader(page);
    await expect(cards(page)).toHaveCount(1);

    // Ids are derived from the content, so the same file is the same document.
    await importFile(page, "sample.epub");
    await readerOpened(page);
    await closeReader(page);
    await expect(cards(page)).toHaveCount(1);
  });

  test("takes a document dropped anywhere on the page", async ({ page }) => {
    await open(page);
    const handle = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["A dropped document.\n\nWith two blocks in it."], "dropped.txt", { type: "text/plain" }));
      return transfer;
    });
    // `.app` is the drop target: the handlers are on the shell, so a document
    // can be dropped anywhere rather than onto a particular rectangle.
    const target = page.locator(".app");
    await target.dispatchEvent("dragover", { dataTransfer: handle });
    await target.dispatchEvent("drop", { dataTransfer: handle });
    await readerOpened(page);
    await closeReader(page);
    await expect(cards(page)).toHaveCount(1);
  });

  test("keeps pasted text", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Add something" }).click();
    await page.getByRole("menuitem", { name: "Paste" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("textbox").fill("A pasted document.\n\nIt has a second paragraph, so it has somewhere to go.");
    await sheet.getByRole("button", { name: "Add", exact: true }).click();
    await readerOpened(page);
    await closeReader(page);
    await expect(cards(page)).toHaveCount(1);
  });
});
