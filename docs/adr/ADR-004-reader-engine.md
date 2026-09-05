# ADR-004 — Reader engine

- Status: accepted
- Date: 2026-09-04

## Decision

A testable engine owns position, progress, tokenization, and Focus-mode timing. UI only renders. Clock is injected. Timing is punctuation- and structure-aware. No `setInterval`.
