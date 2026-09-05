/**
 * The lexicon. Short, dry, lowercase-punctuated.
 * Nothing ↔ Something is the spine of it: see docs/product/lexicon.md.
 */
export const copy = {
  mark: "something.",
  tagline: "Read something.",

  // navigation
  things: "Things",
  now: "Read now",
  settings: "Settings",

  // import
  importLabel: "Add something",
  paste: "Paste",
  pasteTitle: "Paste something",
  pastePlaceholder: "Paste something worth reading.",
  link: "Web link",
  linkTitle: "Add a link",
  linkPlaceholder: "https://",
  openFile: "Open file",
  sample: "Try a sample",
  or: "or",
  drop: "Drop it anywhere.",
  hint: "EPUB, PDF, DOCX, Markdown, HTML or plain text. Nothing leaves this machine.",
  adding: "Adding something…",
  ready: "Something new is ready.",
  add: "Add",

  // library
  search: "Search your things",
  notFound: "Nothing found.",
  emptyTitle: "Nothing here.",
  emptyBody: "Add something.",
  finished: "Finished",
  remove: "Remove",
  removeTitle: "Remove this?",
  removeBody: "The file stays on your disk. Only what is stored here goes.",
  cancel: "Cancel",

  // reader
  close: "Close",
  pace: "Pace",
  paceTitle: "Your pace",
  play: "Play",
  pause: "Pause",
  text: "Text",
  focus: "Focus",
  focusHere: "Focus from here",
  tapTitle: "Tap to play",
  tapBody: "Tap anywhere in the reader to play.",
  done: "That is the end.",
  restart: "Start over",
  save: "Save",

  contents: "Contents",
  look: "Look",
  shortcuts: "Keyboard",

  // settings
  preview: "Preview",
  appearance: "Appearance",
  background: "Background",
  themeInk: "Ink",
  themeDim: "Dim",
  themePaper: "Paper",
  emphasis: "Text",
  emphasisProminent: "Prominent",
  emphasisNormal: "Normal",
  emphasisSubtle: "Subtle",
  anchor: "Anchor colour",
  guides: "Guides",
  guidesNormal: "Normal",
  guidesSubtle: "Subtle",
  guidesHidden: "Hidden",
  reading: "Reading",
  textSize: "Text size",
  sizeS: "Small",
  sizeM: "Normal",
  sizeL: "Large",
  font: "Font",
  fontSans: "Sans",
  fontSerif: "Serif",
  fontMono: "Mono",
  fontDyslexic: "OpenDyslexic",
  words: "Words at a time",
  presets: "Presets",
  presetsBody: "Not sure where to start? These are tuned and ready.",
  presetQuiet: "Quiet",
  presetPaper: "Paper",
  presetHighContrast: "Contrast",
  data: "Data",
  storageUsed: "Stored here",
  clearAll: "Delete everything",
  clearAllBody: "Every document, position and setting on this machine. There is no undo.",
  about: "About",
  license: "Apache 2.0",
  source: "Source",

  // onboarding
  skip: "Skip",
  next: "Next",
  start: "Start reading",
  onboarding: [
    {
      title: "You have things you never read.",
      body: "The report someone sent you. The book you bought. The paper you saved.\n\nThis is where you finish them.",
    },
    {
      title: "Anything in.",
      body: "EPUB, PDF, DOCX, Markdown, a web link, or something you just pasted.\n\nIt all becomes the same thing to read.",
    },
    {
      title: "One word at a time, if you want.",
      body: "Focus mode holds each word on the spot your eye already looks for.\n\nIt will not make you read three times faster. It will keep you moving.",
    },
    {
      title: "Nothing leaves this machine.",
      body: "No account. No cloud. No paywall on files you already own.\n\nClose the tab. Come back. You are where you left off.",
    },
  ],
} as const;
