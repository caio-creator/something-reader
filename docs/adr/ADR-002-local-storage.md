# ADR-002 — Local storage

- Status: accepted
- Date: 2026-09-04

## Context

Library, documents, and positions must survive a refresh, offline.

## Options

SQLite WASM, IndexedDB, localStorage, filesystem via Tauri.

## Decision

IndexedDB for structured records. OPFS for original file bytes when available, IndexedDB blob fallback. `Storage` interface in core.

## Consequences

No WASM tax on day one. SQLite can replace the IDB adapter without UI changes. localStorage is too small and stringly.
