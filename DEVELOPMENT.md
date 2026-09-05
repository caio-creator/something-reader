# Development

```bash
bun install
bun run dev
bun test
bun run build
```

Core code is in `src/core` and must stay UI-free. Import EPUB/PDF on a machine with a real browser; unit tests cover text, markdown, tokenization, and the engine.
