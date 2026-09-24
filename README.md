# something.

**Read something.**

Something is a local-first reader for books, PDFs, EPUBs, DOCX, Markdown, web
links, and anything you paste. Drop it in. Read it. Close it. Open it again.
Continue.

No account. No cloud. No paywall on the files you already have.

```
Got something? Drop it here.
```

![The library](docs/images/library.png)

## What it is

A desktop-and-mobile, open-source reading app. It opens in **Focus** — one word
at a time on its optimal recognition position — and the full text is always one
tap away. Progress survives a restart, and survives re-importing the same file.

It is not Kindle, not Readwise, not a speed-reading gimmick, and not an AI
assistant.

**On speed:** Focus mode will not make you read three times faster. Silent
reading sits around 200–300 WPM, regressions aid comprehension, and RSVP blocks
them. What it does is keep you moving through a backlog you would otherwise not
open. See `docs/research/speed-reading-research.md` for the citations.

|  |  |
|---|---|
| ![Focus mode](docs/images/focus.png) | ![Text mode](docs/images/text.png) |
| **Focus** — one word on its recognition point | **Text** — the whole thing, in Literata |

## Magic moment

1. Open the app.
2. Import something.
3. Read it — focus mode or the full text.
4. Change the pace if you want.
5. Close the tab.
6. Open it again. You are where you left off.

## Formats

| In | How |
|---|---|
| EPUB | JSZip + the real table of contents |
| PDF | pdf.js text layer, paragraphs rebuilt from line geometry |
| DOCX | mammoth |
| Markdown | markdown-it |
| HTML, TXT | built in |
| Web link | Readability, fetched by your own dev server |
| Pasted text | built in |

Scanned PDFs have no text layer and fail with an honest message rather than a
blank document. Web links go through a local endpoint, so no third-party reader
service ever sees what you read; that one path needs a server that can make the
request, so the static build does not offer it and asks you to paste instead.

Something stores the text it extracts. Images, complex tables, footnotes and
links are not preserved the way a full EPUB or PDF viewer preserves them — it is
a reader for the words.

## Install

```bash
bun install
bun run dev
```

Then open http://localhost:5173.

## On a phone

**Tonight, over your own network.** Nothing to deploy:

```bash
bun run dev --host
```

Vite prints a `Network:` address. Open it on a phone on the same Wi-Fi. Your
documents are stored in that phone's browser, not on the Mac — but the Mac has
to be running, and web-link import needs it because the fetch proxy lives
there.

**Properly, as an installed app.** The build is a static SPA, so any static
host works. Over HTTPS the service worker registers, and Add to Home Screen
gives a real icon, a standalone window and full offline use:

```bash
bun run build
```

Serve `dist/` over HTTPS from any static host. What that costs, measured rather
than estimated:

| | Size | When it is fetched |
|---|---|---|
| App shell | ~3.6 MB | first visit; listed in `dist/shell-manifest.json` and precached |
| Reading fonts | ~740 KB | when a face is first used |
| Voice runtime (ONNX/WASM) | ~25 MB | only if Something Voice is turned on |
| Voice model | ~398 MB (+ 25 MB runtime) | only on an explicit download, into its own cache |

So `dist/` is ~29 MB on disk and a first visit is ~3.3 MB. A reader who never
turns the voice on never fetches the other 25.

Settings reports how much of the shell is actually cached, so "works offline" is
something the app can answer rather than something the README claims. A new
version installs in the background and waits — it will not reload the page under
you mid-sentence.

Documents still never leave the device: the host only serves the app itself.

```bash
bun test         # unit tests
bun run test:e2e # browser tests: every format, through the real importer
bun run build    # typecheck + production build
```

## Architecture

Core logic lives in `src/core` and does not import React.

| Path | What |
|---|---|
| `src/core/model` | the document model: sections, blocks, stable ids, offsets |
| `src/core/importers` | one importer per format, run in a Web Worker |
| `src/core/engine` | tokenizing, timing, ORP, play/pause/seek — framework-free |
| `src/core/storage` | a `Storage` seam over IndexedDB, with the original bytes |
| `src/ui` | tokens, copy, components |
| `src/app` | screens, providers, hooks |
| `src/core/voice` | narration segments, the system voices, and Something Voice |

Storage and text-to-speech are browser adapters behind explicit contracts rather
than DOM-free code: the model, the engine and the importers' parsing are what run
without a DOM.

Decisions are recorded in `docs/adr`. Research is in `docs/research`. The
September 2026 audit and the plan that came out of it are in `docs/reviews`.

## What is tested, and what is not

`bun test` covers the model, the engine, the importers' parsing, storage and its
migrations, the address guard, and the voice provider's protocol. `bun run
test:e2e` drives a real browser: every format through the real importer worker,
drag-and-drop, re-import, an invalid file, position surviving a reload mid-read,
chapter navigation, and the reader's header at 360–1440 px.

Something Voice reaches confirmed audio output: four ONNX sessions on WebGPU,
first sentence 503–660 ms after asking, peak RMS 0.10–0.14 at the destination,
and a person confirming they heard it. The trail is in
`docs/reviews/evidence/voice-confirmed.md`.

Not yet established: that on a range of other machines, a real iOS device (the
mobile project runs WebKit through Playwright, which is not the same thing), and
a first offline install measured on a phone.

## Brand

**Something** — the brand · **Something Reader** — GitHub, packages, stores, SEO
· `something.` — the wordmark.

A campaign line, not the product name: *Read this shit.*

## License

Apache 2.0.

Something Voice is a separate work: Supertone's
[Supertonic 3](https://huggingface.co/Supertone/supertonic-3), under the
[BigScience OpenRAIL-M license](https://huggingface.co/Supertone/supertonic-3/blob/3cadd1ee6394adea1bd021217a0e650ede09a323/LICENSE).
It is not in this repository; the browser downloads it from Hugging Face when a
reader asks, after being shown the license and its use restrictions. See
[ADR-012](docs/adr/ADR-012-voice-model-license.md).

---

`references/` holds material from other products, for study only. It is
gitignored and must stay that way.
