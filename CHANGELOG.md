# Changelog

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
