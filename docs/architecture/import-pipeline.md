# Import pipeline

Each format is an `Importer`:

```
{ sniff(file): boolean, import(bytes, name): Promise<SomethingDocument> }
```

All importers return the same model. Failures are typed (`Unsupported`, `EmptyText`, `Corrupt`, `TooLarge`).

Workers: the UI posts `{ name, type, buffer }` and receives a document or an error. The main thread never parses PDF/EPUB.
