/**
 * The lexicon. Short, dry, lowercase-punctuated.
 * Nothing ↔ Something is the spine of it: see docs/product/lexicon.md.
 */
export const copy = {
  mark: "something.",
  tagline: "Read something.",

  // navigation
  things: "Library",
  now: "Add",
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
  sample: "Try something",
  or: "or",
  drop: "Drop it anywhere.",
  hint: "EPUB, PDF, DOCX, Markdown, HTML or plain text. Files are read on this device.",
  adding: "Adding something…",
  ready: "Something new is ready.",
  add: "Add",

  // library
  search: "Search your things",
  notFound: "Nothing found.",
  emptyTitle: "Nothing here.",
  emptyBody: "Add something and it will wait for you here.",
  emptyWhy: "Progress survives the tab closing.",
  emptyWhyBody: "Anything you add keeps its place. Come back tomorrow and you are where you left off.",
  notFoundBody: "Nothing matches that. Try fewer words.",
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
  stop: "Pause",
  /* Typed one character at a time in the dock, so the three dots are three
     characters and not one ellipsis glyph. */
  readingNow: "reading...",
  /*
   * The two shapes a document can take. `Read` rather than `Text` because the
   * lexicon has said Read since the start and the code had drifted.
   */
  read: "Text",
  focus: "Focus",
  /* Toggles say what they do. Two buttons in one dock cannot both be "Read". */
  toRead: "Switch to Text",
  toFocus: "Switch to Focus",
  focusHere: "Focus from here",
  tapTitle: "Tap to play",
  tapBody: "Tap anywhere in the reader to play.",
  done: "That is the end.",
  restart: "Start over",
  save: "Save",

  // voice
  listen: "Listen",
  listenOff: "Stop listening",
  listenNone: "No voice on this device",
  voice: "Voice",
  voiceBody: "Read out loud, using the voices already on this device. Nothing is downloaded and nothing is sent anywhere.",
  voiceNone: "This device has no speech voices installed.",
  voiceDefault: "Default voice",
  voiceRate: "Voice pace",
  voiceEngine: "Engine",
  voiceNatural: "Natural",
  voiceSystem: "System",
  voiceNaturalBody:
    "Something Voice runs here, on this machine. One download of about 400 MB, then it works with the network off and nothing you read is ever sent anywhere.",
  voiceSystemBody: "Local voices for the document language. Text is never sent to a speech service.",
  voiceDownload: "Download",
  voiceInstalled: "Installed",
  voiceRemove: "Remove voice",
  voiceRemoveBody: "The voice downloads again next time you use it.",
  voiceGetting: "Getting the voice",

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
      title: "Files are read on this device.",
      body: "No account. No cloud. No paywall on files you already own.\n\nClose the tab. Come back. You are where you left off.",
    },
  ],
} as const;
