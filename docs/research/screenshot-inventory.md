# Screenshot inventory

Source: local `references/readmaxx/` (gitignored). Captured from ReadMaxx iOS ~1.15.0 (June 2026) plus App Store macOS screenshots and official store assets (~1.19). Used only for internal research.

Do not copy assets, copy, or trade dress into the public product.

| File | Screen | Context | Function | Components | Nav | Interaction | Feature | Notes | Reusable pattern | Improve |
|---|---|---|---|---|---|---|---|---|---|---|
| IMG_2245.PNG | Onboarding 1/4 | First launch | Promise | Card, CTA Continuar, dots, version | Back to App Store | Continue | Positioning | “Sua velocidade de leitura não é fixa.” Dark red wash. v1.15.0 | Short onboarding cards | Drop miracle-speed claim |
| IMG_2246.PNG | Onboarding 2/4 | After 1 | Explain RSVP | Card, eye icon, CTA Experimentar | Dots | Try demo | RSVP science claim | “Leia até 3x mais rápido, com ciência.” | Demo after claim | Claim is marketing |
| IMG_2247.PNG | RSVP demo | Onboarding | Teach ORP | Centered letter, guides, CTA Vamos lá | Dots 3/4 | Continue | ORP | Red “A”, vertical/horizontal guides | ORP alignment | Own accent color |
| IMG_2248.PNG | RSVP demo | Onboarding | Teach ORP in word | “seu” with e in accent | Dots | Continuar | ORP inside word | Pivot letter highlighted | Pivot letter | — |
| IMG_2249.PNG | Onboarding 4/4 | End | Import promise | Card, CTA Começar a ler | Dots last | Start | Import formats | EPUB, PDF, links, paste | Format list in one card | Include MD/DOCX later |
| IMG_2250.PNG | Aparência | Settings | Theme | Preview, presets, fundo, cor do texto | Biblioteca / Ler agora / Ajustes | Segmented controls | Reader look | Cinza + Normal | Live preview | Keep preview |
| IMG_2251.PNG | Aparência | Settings | Gradient preset | Same | Same | Toggle Gradiente / Sutil | Background | Purple-blue gradient preview | Presets Clássico/Gradiente | Fewer, better presets |
| IMG_2252.PNG | Aparência | Settings | High contrast | Same | Same | Principal + Proeminente | Contrast | Black + bright text | Contrast steps | — |
| IMG_2253.PNG | Aparência scrolled | Settings | ORP + guide + size | Swatches, segmented | Tab bar overlaps | Color, guide, size | ORP color, guide, type size | Red selected | ORP as setting | Don’t copy red default |
| IMG_2254.PNG | Aparência lower | Settings | Font row | Font picker closed | Tab bar | Open font | Font | Normal, size Pequeno, guide Sutil | Compact font row | — |
| IMG_2255.PNG | Font menu | Settings | Choose font | Popover | — | Select | Fonts | Normal, Serif, Serif condensed, OpenDyslexic | Dyslexia option | Keep OpenDyslexic |
| IMG_2256.PNG | Font menu | Settings | Serif selected | Popover | — | Select | Font | Check on Serifada | Immediate preview | — |
| IMG_2257.PNG | Aparência | Settings | Orange ORP + serif | Swatches follow chrome | Tab bar | Color | Theming follows ORP | Header/back tinted orange | Accent drives chrome | Subtle, not whole chrome |
| IMG_2258.PNG | Ler agora empty | Home | Import | Four actions + sample | Tab bar, Ler agora selected | Import | Empty import | Colar, Link, EPUB ou PDF, Experimentar amostra | 3 imports + sample | Sample is good |
| IMG_2259.PNG | Reader paused | Sample | RSVP | ORP, toast, scrubber, Explorador, Reproduzir | Close, WPM | Tap to play | Reader chrome | Time 00:00:00 / 00:00:31 | Play/pause + explorer | Progress as %/chapter, not clock |
| IMG_2260.PNG | Ritmo sheet | Reader | Set WPM | Wheel 260–340, 300 PPM, Salvar | Close | Pick + save | WPM | PPM = WPM | Dedicated pace picker | Also allow while playing |
| IMG_2261.PNG | Explorador | Reader | Traditional text | Scroll text, ORP letter in flow, Ir para cá | Close | Jump | Content explorer | Fade at edges, current line marked | Jump from scroll to RSVP | Make this the primary reader |
| IMG_2262.PNG | Explorador | Same | Duplicate | Same | Same | Same | Same | Near-identical to 2261 | — | — |
| IMG_2263.PNG | Explorador | Same | Duplicate | Same | Same | Same | Same | Near-identical | — | — |
| Captura 22.49.34 | App Store | iPad marketing | Hero | Device mock | Store | — | Positioning | “Leia mais rápido. Retenha mais.” | Device-aware marketing | Don’t copy retention claim |
| Captura 22.49.40 | App Store | Library + web | Formats | Saved Documents list, progress | Library / Read Now / Settings | — | Library | In progress vs Finished dots | Simple progress list | Keep this simple |
| Captura 22.49.47 | App Store | iPad RSVP | Customization | Tablets, gradient, play | — | — | iPad | “Desenvolvido com ciência.” | Large-canvas RSVP | Science copy: no |
| Captura 22.49.54 | App Store | WPM | Pace | Wheel on iPad | — | — | WPM | “Você escolhe o ritmo.” | User-owned pace | Keep |
| 314x680bb.webp | Store asset | Import | v1.19 tabs | Colar / Link / EPUB PDF | Biblioteca, Ler, **Resumir**, Ajustes | — | AI tab added | Summarize is a fourth tab | Don’t add Resumir to MVP | — |
| 314x680bb-2.webp | Store asset | Gradient RSVP | Look | Word “padrões” + d ORP | — | — | Gradient bg | Marketing crop | Optional gradient | Not default |
| 314x680bb-3.webp | Store asset | AI summary | Wikipedia | Resumo breve, pontos-chave, Importar | — | Import after summary | Summaries | Palácio da Alvorada | AI as optional later | Not now |
| 314x680bb-4.webp | Store asset | WPM | Pace | 300 PPM | — | — | WPM | Same as in-app | — | — |
| 314x680bb-5.webp | Store asset | Haptics | Sensação | Palavra / Fim da frase intensity | — | — | Tactile | Word-start and sentence-end | Interesting on iOS | Skip on web/desktop |
| 314x680sr.webp | Store asset | RSVP playing | Word | “Significa” red s, Pausar | Explorador / Pausar | Pause | ORP | Time scrubber | Pause control | Own ORP color |
| 400x400bb-75.webp | App icon | Brand | Icon | Red bookmark on white | — | — | Identity | Do not reproduce | — | Own mark: `something.` |

## Screen map

```
Onboarding (4 + RSVP demo)
        ↓
Tab shell
  Things (Biblioteca) ── list + progress + finished
  Read now ── empty import (paste / url / file / sample)
  Settings ── appearance, timing, (haptics), (summaries later)
        ↓
Reader (RSVP)
  play/pause, scrub, WPM, explorer, close
        ↓
Content explorer (traditional scroll) ── jump back to RSVP
```

v1.19 inserts a **Resumir** tab. Treat as a later product fork, not core IA.
