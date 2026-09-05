# ADR-001 — Application architecture

- Status: accepted
- Date: 2026-09-04

## Context

Need a local-first reader that can grow to desktop without rewriting the core.

## Options

1. Next.js app with API routes
2. Electron monolith
3. Vite SPA + framework-free core (chosen)
4. Multi-package monorepo from day one

## Decision

Single TypeScript repo. `src/core` has no React. `src/app` is a Vite SPA.

## Consequences

Fast to run (`bun run dev`). Tauri can wrap the same build later. We extract packages only when a second app needs them.
