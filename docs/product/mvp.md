# MVP

## Magic moment

Open locally → import EPUB, PDF, Markdown, or paste → see it in Things → read traditionally → optional Focus (RSVP) with WPM → quit → reopen → same place.

## In

- Importers: text, markdown, HTML, EPUB, DOCX, PDF (extractable text), web link
- Library with progress and search by metadata
- Traditional reader (measure ~65ch, themes, font size)
- Focus mode: ORP, play/pause, seek, punctuation-aware timing
- Listen: the device's own voices, and Something Voice locally
- Position persistence, checkpointed rather than only on pause
- Keyboard: space play/pause (focus), j/k or arrows, `o` open, `esc` back
- Drag and drop + file picker + paste
- Honest PDF failure state
- Installable, with an offline shell the app can report on

## Out

AI, tags, collections, full-text search, Tauri, haptics, OCR, accounts, telemetry,
backup and restore, highlights.

Web link needs a server that can make the request, so it is offered where one
exists and replaced by paste where one does not.

## Definition of done

Matches the original brief §60: install, polished UI, import, list, open, navigate, traditional read, settings, focus + WPM, restart, library + progress restored. Critical tests green. No secrets in git.
