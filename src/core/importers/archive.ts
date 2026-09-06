import { ImportError, MAX_ARCHIVE_ENTRIES, MAX_ENTRY_BYTES, MAX_EXPANDED_BYTES } from "./types";

/**
 * What an archive says it will weigh once unpacked.
 *
 * JSZip reads this from the zip's own central directory while loading, before
 * anything is inflated — which is the only moment at which refusing costs
 * nothing. It is not a public field, so an absent one is read as unknown, and
 * the caller's running total is what covers that case.
 */
export const declaredSize = (file: unknown): number => {
  const data = (file as { _data?: { uncompressedSize?: unknown } })._data;
  const size = data?.uncompressedSize;
  return typeof size === "number" && Number.isFinite(size) && size > 0 ? size : 0;
};

/**
 * The expansion rules, over declared sizes rather than over an unpacked file.
 *
 * A18: EPUB checked its total only after `async("string")` had decompressed an
 * entry, so the entry it was worried about was already in memory, and DOCX had
 * no limit at all. Both formats are zips arriving from the same places, so both
 * ask the same question here.
 *
 * Kept free of JSZip so the boundaries can be tested with numbers instead of
 * with a zip bomb.
 */
export const guardArchive = (
  format: "EPUB" | "DOCX",
  entries: readonly { declared: number }[],
): void => {
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new ImportError("too-large", `That ${format} has an unreasonable number of files.`);
  }
  let expanded = 0;
  for (const entry of entries) {
    if (entry.declared > MAX_ENTRY_BYTES) {
      throw new ImportError("too-large", `That ${format} has a single part larger than 50 MB.`);
    }
    expanded += entry.declared;
    if (expanded > MAX_EXPANDED_BYTES) {
      throw new ImportError("too-large", `That ${format} expands to more than 300 MB.`);
    }
  }
};

/** One entry, checked against what has already been unpacked before it. */
export const guardEntry = (
  format: "EPUB" | "DOCX",
  declared: number,
  expandedSoFar: number,
): void => {
  if (declared > MAX_ENTRY_BYTES) {
    throw new ImportError("too-large", `That ${format} has a single part larger than 50 MB.`);
  }
  if (expandedSoFar + declared > MAX_EXPANDED_BYTES) {
    throw new ImportError("too-large", `That ${format} expands to more than 300 MB.`);
  }
};
