# System overview

```
Source → Importer → Normalizer → Document model
                                      ↓
                                  Storage
                                      ↓
                            Reader engine → UI
```

Dependencies point inward. `src/app` may import `src/core`. `src/core` must not import React or the DOM except inside importers that receive an already-parsed HTML document (those APIs are injected).

Apps today: one Vite SPA. Tomorrow: the same core behind Tauri or a native shell.
