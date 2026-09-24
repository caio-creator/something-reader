# ADR-012 — The voice model's licence

Date: 2026-09-24 · Status: accepted · Concerns Something Voice (Supertonic 3).

## Context

Something Voice runs Supertone's Supertonic 3, fetched at runtime from Hugging
Face at a pinned revision (`src/core/voice/supertonic/pack.ts`). The app's own
code is Apache-2.0; the model is not. Its licence was never recorded in this
repository — the only trace was a comment in `system.ts` calling the system
voice "the only provider that can ship without a licence question".

At the pinned revision the model card says `openrail`, and the `LICENSE` file is
the **BigScience Open RAIL-M License, dated August 18, 2022**. It grants a
perpetual, royalty-free licence to use and distribute the model, commercially
included, on conditions (§4, §5):

- the use restrictions of Attachment A must bind anyone the model is handed to,
  and they must be told the model is subject to them;
- they must receive a copy of the licence;
- attribution notices must be kept.

Attachment A forbids, among others: unlawful use, harming minors, generating
false information to harm others, impersonation without consent, and
disseminating machine-generated content without saying it is machine-generated.

## Decision

- **The app does not host the model.** The browser downloads it from Hugging
  Face, where the licence and the model card sit beside the files.
- **The licence is stated where the download is offered**, before it starts:
  Settings → Voice → Natural names the model, its author and the licence, says
  that downloading means agreeing to the use restrictions, and links the
  `LICENSE` at the same pinned revision (`LICENSE_URL` in `pack.ts`).
- **Moving the revision means re-reading the licence**, as it means re-reading
  the file sizes.

## Consequences

- A public deploy can offer the voice without redistributing anything itself,
  and every reader who gets it has been shown the terms first.
- Narrating a document the reader chose, for that reader, is squarely within
  the licence. Features that publish generated audio (export, sharing) would
  touch restriction (e): they must label the audio as machine-generated.
- This is a reading of the licence, not legal advice. Before a store release
  (ADR-009), have it checked alongside the trademark clearance.
