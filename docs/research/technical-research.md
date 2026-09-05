# Technical research

## UI

| Option | Fit | Verdict |
|---|---|---|
| Next.js / Remix / TanStack Start | Server/SaaS | No. Local-first SPA. |
| SvelteKit | Fine | Extra ecosystem cost vs React familiarity here. |
| Vue/Nuxt | Fine | Same. |
| **Vite + React + TS** | SPA, workers, simple | **Yes.** |

## Desktop

Tauri 2 later (native FS, no CORS). Electron is heavier. MVP is the browser app.

## Storage

wa-sqlite + OPFS is excellent and heavier than we need for a personal library of JSON documents. **IndexedDB** for records (idb-friendly wrapper we write ourselves) + **OPFS** for original bytes. Interface `Storage` so SQLite can replace it without UI changes.

## Parsing

| Format | Library | Notes |
|---|---|---|
| EPUB | JSZip + DOMParser | Read OPF/spine; sanitize XHTML. Don’t use epub.js as a view. |
| PDF | pdf.js | `getTextContent` in a Worker. Layout PDFs will be ugly. Scans fail closed. |
| Markdown | markdown-it | CommonMark + headings as sections. |
| TXT / paste | none | Paragraph split. |
| HTML | DOMPurify | Strip scripts. |
| DOCX | mammoth | V1. |
| URL | Readability | V1 via Tauri or a local sidecar. Browser CORS will fail. |

Run parsers in a **Web Worker**. An 800-page EPUB must not freeze the tab.

## Engine

Pure TS. Tokenize blocks lazily. `requestAnimationFrame` scheduler. Test with fake clocks.

## Security

- Sanitize HTML from EPUB/HTML.
- MIME + size caps.
- ZIP bomb limits on EPUB (entry count, uncompressed cap).
- No `eval`. No remote code.
- URL fetch (later): block private IP ranges (SSRF).
