# Speed reading and RSVP

Something ships RSVP as **Focus mode**. Copy must match evidence.

## Evidence (real)

- Silent reading for English adults typically sits around **200–300 WPM** with good comprehension. Doubling that while keeping comprehension is not a demonstrated skill (Rayner, Schotter, Masson, Potter & Treiman, 2016, *Psychological Science in the Public Interest*).
- **Regressions** (re-reading) support comprehension. Blocking them — which RSVP does by design — hurts understanding (Schotter, Tran & Rayner, 2014, *Psychological Science*).
- Modern RSVP apps did not beat static text on comprehension; speed was the main driver of the deficit (Acklin & Papesh, 2017, *American Journal of Psychology*).
- **Optimal viewing position / recognition position** is real: word identification is fastest when the eye lands slightly left of center on the word (classic OVP literature; commercial “ORP” is a productization of this). Aligning a pivot letter reduces small saccades. That is not the same as tripling speed.
- RSVP at **normal** rates can match page reading on short material. Push the rate and comprehension falls. Sentence-boundary pauses help integration (older RSVP work: Potter; Juola; Cocklin et al. 1984 — chunks ~12 characters were often better than one huge dump or one letter).

## Reasonable hypotheses (use, label as design)

- Punctuation-aware delay (comma short, period longer) feels more like speech and may help parsing.
- Extra dwell on headings, numbers, and very long tokens.
- Slightly slower after paragraph breaks.
- Default WPM near natural reading (~240), not 500.
- Always allow jump-to-text (regression substitute).

## Marketing (do not repeat)

- “Up to 3× faster with no loss of comprehension.”
- “Backed by science” as a blanket.
- Spritz-style implications that saccades were the bottleneck. Rayner: the bottleneck is language processing, not eyeball mechanics.

## Product rules

1. Traditional reader is default.
2. Focus mode uses ORP, rAF timing, punctuation/sentence/paragraph delays — never `setInterval(word, 200)`.
3. User can drop to the full text at the current token.
4. UI copy: *Focus. Your pace.* Not *Read 3× faster.*
5. Document this file in the README if anyone asks why we are modest.

---

# Why the word is not centred

The **anchor letter** is centred, not the word. Every word slides so that one
particular letter arrives under the same point on screen, which is why long
words hang further right and short ones sit nearly centred. Measured in the
running app, the anchor lands at 0px drift from the rail centre across every
word — that is the feature, not a layout bug.

## The finding it rests on

When the eye lands on a word during ordinary reading, recognition is fastest
and most accurate at a point **slightly left of the word's centre** — roughly a
quarter to a third of the way in. This is the **Optimal Viewing Position**.

- O'Regan & Lévy-Schoen (1987); **O'Regan & Jacobs (1992)**, *Optimal viewing
  position effect in word recognition*, J. Exp. Psychol. HPP 18(1), 185–197.
- **Nazir, O'Regan & Jacobs (1991)**, *On words and their letters*, Bulletin of
  the Psychonomic Society — the effect falls out of acuity dropping away from
  the fovea plus lateral masking, with a word's opening letters carrying more
  identifying information than its middle.
- **Rayner (1979)** on the *preferred viewing location*: where readers actually
  land, between a word's beginning and its middle.

Our step function — index 0 / 1 / 2 / 3 / 4 as length crosses 1, 5, 9, 13 —
puts the anchor at ~33% for short words settling to ~23% for long ones, which
is the shape the OVP data describes.

## Where the extrapolation begins, and it does

OVP was measured for **saccadic landing positions in natural reading**. RSVP
inverts it: the eye no longer moves, so each word is pre-shifted to deliver its
OVP to a fixed point. That is a reasonable hypothesis. It is **not** a finding.
No study we found tests whether pre-aligning the OVP improves RSVP reading over
simply centring the word. The product should not claim otherwise, and the
onboarding does not.

## How fast the brain actually reads

- **Brysbaert (2019)**, *How many words do we read per minute?*, J. Memory &
  Language 109 — meta-analysis: silent reading of non-fiction ≈ **238 wpm**,
  fiction ≈ 260 wpm, reading aloud ≈ 183 wpm.
- Fixations last ~200–250 ms; saccades span ~7–9 characters; **10–15% of eye
  movements are regressions** back to earlier text.
- The **perceptual span** is asymmetric — about 3–4 characters left of fixation
  and 14–15 to the right (**McConkie & Rayner 1975**). Only ~3–4 characters
  fall in the fovea and are truly sharp.

Our default of 300 wpm therefore already sits above ordinary silent reading.
That is a deliberate nudge, not a claim about capacity.

## What RSVP costs

- **Rayner, Schotter, Masson, Potter & Treiman (2016)**, *So Much to Read, So
  Little Time*, Psych. Science in the Public Interest 17(1), 4–34 — the
  standard review. Speed gains trade against comprehension.
- **Schotter, Tran & Rayner (2014)**, *Don't Believe What You Read (Only
  Once)*, Psychological Science 25(6) — blocking regressions measurably hurt
  comprehension. RSVP blocks them structurally.
- **Acklin & Papesh (2017)**, *Modern Speed-Reading Apps Do Not Foster Reading
  Comprehension*, Am. J. Psychology 130(4) — tested RSVP apps directly and
  found no comprehension advantage.
- RSVP also removes **parafoveal preview** — in ordinary reading the next word
  is partly processed before it is fixated. A word-at-a-time presentation gives
  none of it back.

## What this obliges the product to do

1. **Never claim a multiple.** No "3× faster, with science".
2. **Traditional reading is always one tap away**, and shares one position.
3. **Give regressions back.** Since RSVP removes the thing that repairs
   comprehension, stepping back a word or a sentence is not a convenience — it
   is compensation for a known cost. Currently `←` / `k` steps back a chunk;
   sentence-level regression is the obvious next step.
4. **Restoring some parafoveal preview** — a faint next word in the periphery —
   is the most scientifically motivated improvement available to this reader,
   because it addresses RSVP's clearest deficit rather than decorating it.
