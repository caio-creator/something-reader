import { describe, expect, test } from "bun:test";
import { declaredSize, guardArchive, guardEntry } from "../src/core/importers/archive";
import { ImportError, MAX_ARCHIVE_ENTRIES, MAX_ENTRY_BYTES, MAX_EXPANDED_BYTES } from "../src/core/importers/types";

/**
 * A18's expansion limits, at their boundaries.
 *
 * Deliberately arithmetic rather than a zip bomb: the audit asked for small
 * fixtures and simulated boundaries, and building a real one to prove a
 * `>` works would be both slower and worse evidence.
 */

const entries = (...sizes: number[]) => sizes.map((declared) => ({ declared }));

describe("what an archive is allowed to expand to", () => {
  test("lets an ordinary book through", () => {
    expect(() => guardArchive("EPUB", entries(2_000_000, 500_000, 120_000))).not.toThrow();
  });

  test("refuses one part larger than the per-entry ceiling", () => {
    expect(() => guardArchive("EPUB", entries(MAX_ENTRY_BYTES + 1))).toThrow(/single part larger/);
    expect(() => guardArchive("EPUB", entries(MAX_ENTRY_BYTES))).not.toThrow();
  });

  test("refuses many parts that add up past the total", () => {
    const each = MAX_ENTRY_BYTES;
    const enough = Math.floor(MAX_EXPANDED_BYTES / each) + 1;
    expect(() => guardArchive("DOCX", entries(...Array(enough).fill(each)))).toThrow(/more than 300 MB/);
  });

  test("refuses an unreasonable number of parts before measuring any of them", () => {
    const many = entries(...Array(MAX_ARCHIVE_ENTRIES + 1).fill(1));
    expect(() => guardArchive("EPUB", many)).toThrow(/unreasonable number/);
  });

  test("names the format it is talking about", () => {
    expect(() => guardArchive("DOCX", entries(MAX_ENTRY_BYTES + 1))).toThrow(/DOCX/);
    expect(() => guardArchive("EPUB", entries(MAX_ENTRY_BYTES + 1))).toThrow(/EPUB/);
  });

  test("reports a size problem as too-large, not as a broken file", () => {
    try {
      guardArchive("EPUB", entries(MAX_ENTRY_BYTES + 1));
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportError);
      expect((error as ImportError).code).toBe("too-large");
    }
  });
});

describe("one entry, against what came before it", () => {
  test("counts what is already unpacked", () => {
    expect(() => guardEntry("EPUB", 10, MAX_EXPANDED_BYTES - 5)).toThrow(/more than 300 MB/);
    expect(() => guardEntry("EPUB", 5, MAX_EXPANDED_BYTES - 5)).not.toThrow();
  });

  test("refuses an oversized entry however empty the archive is so far", () => {
    expect(() => guardEntry("EPUB", MAX_ENTRY_BYTES + 1, 0)).toThrow(/single part larger/);
  });
});

describe("reading the size an archive declares", () => {
  test("takes the number JSZip recorded before inflating", () => {
    expect(declaredSize({ _data: { uncompressedSize: 1234 } })).toBe(1234);
  });

  /* Unknown must not read as zero-and-fine; the running total covers it. */
  test("treats a missing or nonsense size as unknown", () => {
    expect(declaredSize({})).toBe(0);
    expect(declaredSize({ _data: {} })).toBe(0);
    expect(declaredSize({ _data: { uncompressedSize: "big" } })).toBe(0);
    expect(declaredSize({ _data: { uncompressedSize: Number.NaN } })).toBe(0);
    expect(declaredSize({ _data: { uncompressedSize: -5 } })).toBe(0);
  });
});
