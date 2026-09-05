# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-09-04] References of other products never leave the machine via git**
   Do instead: keep them in `references/` (gitignored). Check `git status` before every push.

2. **[2026-09-04] GitHub owner is caio-creator, not the currently active gh account**
   Do instead: `gh auth switch --user caio-creator` and confirm `gh api user -q .login` before `gh repo create`.

3. **[2026-09-04] Domain logic does not live in React**
   Do instead: put model, engine, importers, and storage in `src/core` and test them without the DOM.

## Shell & Command Reliability
1. **[2026-09-04] Bun is the default toolchain**
   Do instead: `bun install`, `bun run dev`, `bun test`. Fall back to npm only if bun is missing.

## Domain Behavior Guardrails
1. **[2026-09-04] RSVP is a mode, not the product**
   Do instead: ship a real scrolling reader first; focus mode sits on the same position model.

2. **[2026-09-04] Do not copy ReadMaxx trade dress**
   Do instead: `something.` wordmark, paper/ink palette, no red bookmark icon, no “3× with science” copy.

3. **[2026-09-04] PDF text extraction is lossy**
   Do instead: show an honest empty/limited state for scanned or image-only PDFs. OCR is future.

## User Directives
1. **[2026-09-04] Brand is Something / Something Reader**
   Do instead: GitHub repo `something-reader`, UI wordmark `something.`, tagline `Read something.`
