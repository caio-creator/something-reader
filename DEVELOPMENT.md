# Development

```bash
bun install
bun run dev        # http://localhost:5173
bun test
bun run typecheck
bun run build      # typecheck + production build
```

Core code is in `src/core` and must stay UI-free — no React imports below
`src/app` or `src/ui`.

## Things worth knowing

- **Import runs in a Web Worker** (`src/core/importers/worker.ts`). `DOMParser`
  does not exist there, which is why HTML is converted to blocks by a scanner
  rather than a DOM. Do not reintroduce `DOMParser` into that path.
- **Web-link import needs the dev server.** The browser cannot fetch other
  origins, so `vite-plugin-fetch.ts` adds a `/api/fetch` endpoint that does it
  locally. It is deliberately hostile to misuse: same-origin only, resolved
  addresses validated and pinned against DNS rebinding, redirects re-checked,
  responses capped. If you touch it, keep `tests/fetch-guard.test.ts` green.
- **Block ids are deterministic** and positions reconcile through a content
  fingerprint plus a char offset (ADR-011). If you change how blocks are built,
  run `tests/model.test.ts` — that is what protects resume.
- **Fixtures** in `fixtures/` include a real EPUB, PDF and DOCX. Regenerate them
  only if you also update `tests/formats.test.ts`.
- **`references/` is gitignored and stays that way.** It holds other products'
  material, for study only.

## The specimen sheet

`http://localhost:5173/#specimen` renders every token and every component in
every state on one page: the colour ramps, the type scale with its per-step
tracking, space and radius, all 35 icons at three sizes, and each control in
its default, selected, disabled and pressed states.

This is the design system's review surface — what a Storybook would give us,
at one file and no dependencies. **Add a component there in the same commit
that adds the component.** If it looks wrong on the specimen it is wrong, and
that is far cheaper to see than finding it inside a screen.

## Verifying UI work

Run it in a browser at 414px and 1440px and exercise the whole path: import,
library, both reader modes, settings, then reload and confirm the position came
back. A screenshot is not verification.
