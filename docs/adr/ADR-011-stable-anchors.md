# ADR-011 — Stable block ids and position reconciliation

Date: 2026-09-05 · Status: accepted · Refines ADR-003.

## Context

ADR-003 promised "a content hash for reconciliation". It was never built. Every
`Block` and `Section` received a fresh `crypto.randomUUID()` on every import, and
`ReadingPosition` pointed at those ids. Re-importing the same file therefore
produced a document whose ids matched nothing, and the reading position — the
one thing this product promises to keep — was silently lost. `sourceHash` existed
on the document but nothing ever read it back.

## Decision

- **Document id is derived from the file's content hash.** The same bytes always
  yield the same document, so a re-import updates in place rather than forking.
- **Block ids are positional and deterministic**: `s<section>.b<block>`, stamped
  in `assembleDocument` once the tree is final, so importers stay unaware of them.
- **Every block carries a content fingerprint** (`hashText`, whitespace- and
  case-insensitive) and a `charStart` offset into the document's plain-text
  projection.
- **A position is `{ charOffset, blockId, blockHash, tokenIndex }`.** The block id
  is a fast path, trusted only while its fingerprint still matches. Otherwise the
  char offset decides, via binary search over the token list.

## Why not the alternatives

Storing every token was rejected in ADR-003 and still is: it triples the stored
size for something derivable. EPUB CFI and PDF page coordinates were rejected
because they only work for one source format each, and the whole point of the
document model is that the reader does not know where text came from.

## Consequences

Position survives a re-import, and survives edits upstream of it in the file —
text inserted in chapter one does not move the anchor in chapter four, because
the fingerprint still matches. It does not survive a rewrite *of the anchored
paragraph itself*; there the char offset lands the reader nearby rather than at
the beginning, which is the honest outcome.

`tokenCount` is now stored on the document and counted the way the tokenizer
counts, so progress cannot drift from `wordCount`'s different definition.
