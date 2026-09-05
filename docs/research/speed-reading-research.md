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
