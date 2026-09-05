# Design system

What ships. Tokens live in `src/ui/tokens.css`; components in
`src/ui/components`. See ADR-010 for why.

## Colour

Dark first. Three themes share one token contract, so components are written
once.

| Token | Ink (default) | Dim | Paper |
|---|---|---|---|
| `--bg` | `#000000` | `#111113` | `#F7F4EE` |
| `--surface` | `#0E0E0E` | `#191A1D` | `#FFFDF9` |
| `--surface-2` | `#17171A` | `#212226` | `#EFEAE0` |
| `--surface-3` | `#232326` | `#2C2D32` | `#E2DBCD` |
| `--text` | `#F5F3EF` | `#F2F0EC` | `#16130F` |
| `--text-2` | `#9B9691` | `#A39F99` | `#635C51` |
| `--text-3` | `#5E5A56` | `#6B6762` | `#8F877A` |
| `--accent` | `#E8A33D` | inherits | `#94600F` |

Text is warm white, not `#FFF`. Amber darkens on Paper so it clears AA.

`--anchor` is the ORP pivot colour, set from settings. It is the only hue the
reader chooses. The neutral swatch resolves to `var(--text)` rather than a fixed
near-white, which would vanish on Paper.

## Type

Three voices, self-hosted:

- `--font-mono` — **JetBrains Mono.** Eyebrows, timecodes, counts, metadata,
  version stamps, onboarding body. Most of the personality is here.
- `--font-ui` — **Inter.** Controls, titles, list rows.
- `--font-read` — **Literata.** Reading, and the focus word.
- `--font-dyslexic` — **OpenDyslexic**, loaded only when selected.

| Step | Size | Notes |
|---|---|---|
| display | 40 | |
| title | 28 | `-0.02em` |
| heading | 19 | |
| body | 16 | |
| label | 13 | |
| eyebrow | 11 | mono, `0.14em`, uppercase |

Reading: 18 / 20 / 23px, line-height 1.62, measure 66ch.

## Space, radius, motion

Space `4 8 12 16 24 32 48 64`. Radius: control 10, card 18, sheet 24, pill 999.
Tap target 44.

Motion is 140ms in, 110ms out, `cubic-bezier(.32,.72,0,1)`. The focus word
changes by opacity only — sliding it would reintroduce the saccades RSVP exists
to remove. `prefers-reduced-motion` and `prefers-reduced-transparency` are both
honoured.

## Layout

- **< 700px** — one column, pill navigation bottom-centre.
- **700–1099px** — pill moves to the top, roomier reader.
- **≥ 1100px** — library becomes a grid, reader rails bleed the full viewport,
  the focus word scales to `clamp(56px, 5.6vw, 92px)`.

No sidebar at any width.


## Icons

One hairline set on a 24 grid at 1.6 stroke, round caps and joins, with ~2px of
optical padding. Two rules:

- **Letterforms are set, never drawn.** A hand-plotted "A" reads as a mistake
  beside real type, so glyph icons render `<text>` in the app's own faces —
  Inter for weight and size, Literata for the typeface picker.
- **One job, one icon.** Three separate letter icons for text size, text weight
  and reader appearance were the same drawing three times. There is now one of
  each.

Solid fills are reserved for shapes that would look thin stroked: the play
triangle, list bullets, the half of the contrast circle, the word held between
the guide rails.

## Reviewing it

`#specimen` renders the whole system on one page. Nothing joins the set without
appearing there.
