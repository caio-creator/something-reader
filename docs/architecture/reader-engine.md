# Reader engine

Pure TypeScript. No React.

Responsibilities: tokenize a document (lazy by section), map a position, compute progress, schedule Focus-mode frames.

Timing for a token:

```
ms = 60000 / wpm
ms *= lengthFactor          # longer words linger
ms *= punctuationFactor     # , . ; : — ? !
ms *= structureFactor       # heading, paragraph start
```

Clock: `requestAnimationFrame` in the app adapter; tests inject `now()`.

API sketch: `createEngine(doc)`, `play()`, `pause()`, `seek(position)`, `setWpm(n)`, `getToken()`, `subscribe(listener)`.
