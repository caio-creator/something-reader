# Design system (MVP)

## Color

Paper / ink, not SaaS purple.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f4efe6` | `#161410` |
| `--bg-raised` | `#fffaf3` | `#1f1c16` |
| `--ink` | `#1a1712` | `#f3ecdf` |
| `--ink-dim` | `#6b6458` | `#a39a8c` |
| `--line` | `#e4d9c7` | `#2c2820` |
| `--accent` | `#8a4b12` | `#d4a574` |

Accent is ink-brown/amber, not ReadMaxx red. ORP uses `--accent`.

## Type

- UI: `"Source Sans 3", "Segoe UI", sans-serif`
- Reading: `"Source Serif 4", Iowan, Georgia, serif`
- Focus word: same serif, large
- Mono (code blocks): `"IBM Plex Mono", ui-monospace`

Measure: 62–68ch. Line height 1.5–1.65. Size steps 18 / 20 / 22 px.

## Space

4 / 8 / 12 / 16 / 24 / 40 / 64.

## Radius

Controls 8px. Sheets 16px. No pill tab bar copy of ReadMaxx — use a simple top bar + sidebar on desktop.

## Motion

150ms enter, 120ms exit, ease. Focus-mode words do not fade-slide; they replace, to avoid inducing saccades we just removed.
