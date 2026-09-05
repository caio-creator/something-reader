# something.

**Read something.**

Something is a local-first reader for books, PDFs, EPUBs, Markdown, and anything you paste. Drop it in. Read it. Close it. Open it. Continue.

No account. No cloud. No paywall on the files you already have.

```
Got something? Drop it here.
```

## What it is

A desktop-first, open-source reading app. Traditional reading is first-class. RSVP (word-by-word) is a mode, not the product. Progress survives a restart.

It is not Kindle, not Readwise, not a speed-reading gimmick, and not an AI assistant.

## Run it

```bash
bun install
bun run dev
```

Then open the URL Vite prints. Import an EPUB, PDF, Markdown file, or paste text.

```bash
bun test
bun run build
```

Node 22+ works if you prefer `npm install && npm run dev`.

## Magic moment

1. Open the app.
2. Import something.
3. Read it (page or focus mode).
4. Change speed if you are in focus mode.
5. Close the tab.
6. Open it again. You are where you left off.

## Architecture

Core logic lives in `src/core` and does not import React.

- `src/core/model` — document model
- `src/core/importers` — EPUB, PDF, text, Markdown
- `src/core/engine` — position, RSVP timing, ORP
- `src/core/storage` — IndexedDB + OPFS
- `src/app` — UI
- `src/ui` — tokens, copy, components

See [docs/architecture/system-overview.md](docs/architecture/system-overview.md).

## Brand

- **Something** — the brand
- **Something Reader** — GitHub, packages, stores, SEO
- **something.** — the wordmark

Campaign line, not the product name: *Read this shit.*

## License

Apache License 2.0. See [LICENSE](LICENSE).

Reference screenshots of other products, if present locally, live in `references/` and are gitignored. Do not commit them.
