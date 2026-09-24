# Changelog

## 0.3.0 — 2026-09-24

The first version meant to be used by people other than its author: it is
published, it reads aloud, and it works offline.

### Added
- **Listen**, the third way to take a document, beside Text and Focus.
- **Something Voice**: Supertone's Supertonic 3 running in the browser —
  WebGPU where there is one, WASM otherwise. One download of 398 MB from
  Hugging Face on request, then it works with the network off and nothing read
  is sent anywhere. Ten voices. The system voices remain the default. The
  model's OpenRAIL-M license is shown before the download (ADR-012).
- Portuguese text prepared for speech: numbers, dates, gender agreement.
- Installable as an app, with an offline shell the build lists and Settings
  counts; a new version waits to be accepted instead of reloading the page.
- **Public deployment** on Vercel, with link import through `/api/fetch` —
  the same SSRF guard as the dev server, plus a per-address budget.
- A request for persistent storage after an import and after the voice
  download, so the browser does not evict the library (policy pending).

### Fixed
- The service worker never noticed a new version: its script was byte-for-byte
  the same in every build.
- After an update, offline opens lost the default typefaces and the voice lost
  its runtime; both are now kept where an update cannot sweep them.
- The voice progress bar stopped at 93% (the declared size was 426 MB against
  398 MB actually sent).
- Every PDF import failed on iPhones older than iOS 17.4.
- Three layout bugs only a real phone showed: tab bar clearance, the notch,
  flex overflow.
- An audit's 19 findings, among them: the library lost on a database upgrade,
  controls that only looked like controls, an IPv6-mapped private address
  getting past the fetch guard. See `docs/reviews/remediation-plan.md`.

### Not yet
- A real iPhone running Something Voice, and a first offline install measured
  on a phone. The E2E `phone` project is Playwright's WebKit, not iOS.

## 0.2.0 — 2026-09-05

The interface and the foundations under it were rebuilt.

### Added
- Onboarding, library search, per-item time remaining, and a working delete.
- Settings for background, text weight, anchor colour, guides, size, reading
  font (including OpenDyslexic), pace, words-at-a-time, storage and about.
- DOCX, HTML and web-link import. Links are fetched by the local dev server
  behind SSRF guards, not by a third-party service.
- Import runs in a Web Worker with real progress.
- A traditional reading mode that shares one position with focus mode.
- Self-hosted fonts; the previous build pulled two families from a CDN.

### Changed
- New design system: near-black ground, one amber accent, and a mono / sans /
  serif type system. Real SVG icons. See ADR-010.
- Responsive for the first time: the pill navigation moves to the top from
  tablet up and the library becomes a grid on desktop. Still no sidebar.
- EPUB reads its real table of contents and guards against zip bombs.
- PDF rebuilds paragraphs from line geometry rather than punctuation guessing.
- Storage keeps a light library index and the original file bytes.

### Fixed
- Reading position survived neither a re-import nor an edit upstream of it,
  because block ids were random per import. See ADR-011.
- Changing the pace rebuilt the engine and re-tokenized the whole document.
- Scrolling the text view did not move the shared position, so returning to
  focus mode silently ignored where you had scrolled to.
- `listLibrary` read every document in full about five times a second during
  playback.
- Progress mixed two different word counts and drifted.
- The EPUB sniffer matched any zip, swallowing DOCX files.
- Delete existed in storage but was never reachable from the interface.

## 0.1.0
Initial build.
