# ADR-003 — Document model

- Status: accepted
- Date: 2026-09-04

## Decision

Documents are trees of sections and text blocks. Tokens are derived at read time. Positions point at `sectionId + blockId + tokenIndex` plus a content hash for reconciliation.

Rejected: storing every token; coupling the model to EPUB CFI or PDF page numbers only.
