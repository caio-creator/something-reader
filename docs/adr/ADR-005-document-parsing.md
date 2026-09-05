# ADR-005 — Document parsing

- Status: accepted
- Date: 2026-09-04

## Decision

Per-format importers in a Worker. EPUB via JSZip. PDF via pdf.js text layer. Markdown via markdown-it. HTML sanitized. Fail closed on empty PDF text.

URL import is deferred (CORS). DOCX deferred.
