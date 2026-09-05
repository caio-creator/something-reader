# ADR-010 — Amber identity, mono voice, and no sidebar

Date: 2026-09-05 · Status: accepted · Supersedes the palette in ADR-009's wake
and the desktop guidance in `docs/design/interface-principles.md`.

## Context

The first interface shipped iOS system blue (`#0a84ff`) on `#1c1c1e` cards, with
emoji glyphs for tab icons and bare `×` and `⌁` characters for reader controls.
It read as the iPhone Settings app rather than as a product. It also contradicted
`docs/design/design-system.md`, which specified a warm amber palette that the CSS
never implemented, and it had no width media queries at all — every surface was
sized `min(92vw, 400px)`, which is the stretched phone UI the brief ruled out.

## Options considered

1. **Keep the HIG-derived system.** Cheapest, and accessible by construction. But
   system blue on system grey is the definition of an undesigned app, and it is
   the thing being complained about.
2. **Follow the benchmark's palette.** Red on black with red gradients. Rejected:
   that is trade dress, and copying it was explicitly out of bounds.
3. **One warm accent, three type voices, dark first.** Chosen.

## Decision

- **Amber `#E8A33D`** is the brand colour and carries buttons, active states,
  focus, progress, and the default ORP anchor. `#94600F` on the light theme so it
  clears AA on a cream ground.
- **Three voices.** JetBrains Mono for chrome labels, timecodes, counts and
  version stamps; Inter for controls; Literata for reading and the focus word.
  The mono voice is where most of the personality lives.
- **Fonts are self-hosted.** A local-first reader must not call a font CDN on
  every load. OpenDyslexic is fetched only when someone selects it.
- **The anchor colour belongs to the reader**, chosen from eight swatches. The
  neutral swatch resolves to the theme's text colour so it stays visible on both
  grounds.
- **No sidebar, at any width.** Navigation is a floating pill: bottom-centre on
  phones, top-centre from 700px up. Desktop earns its space through a library
  grid, full-bleed reader rails and a wider measure — not a nav rail.

## Trade-offs

Self-hosting adds roughly 250 KB of woff2 to the first load. Accepted: it buys
the identity and keeps the privacy promise literal. A single accent means state
must be carried by weight, ground and position rather than by hue, which is more
work per component but keeps the reading surface quiet.

## Consequences

`docs/design/design-system.md` is rewritten to describe what ships.
`docs/design/hig-application.md` remains as the accessibility floor — tap
targets, focus rings, reduced-motion and reduced-transparency still follow it.
