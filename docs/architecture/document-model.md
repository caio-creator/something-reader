# Document model

A document is format-agnostic.

```
SomethingDocument
  id: string
  sourceType: 'epub' | 'pdf' | 'markdown' | 'text' | 'html'
  sourceName: string
  sourceHash: string
  title: string
  authors: string[]
  language?: string
  importedAt: number
  wordCount: number
  sections: Section[]

Section
  id: string
  title: string
  order: number
  sourceAnchor: string
  blocks: Block[]

Block
  id: string
  kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'code'
  level?: number
  text: string
```

Tokens are derived, not stored. Anchors come from the source (EPUB href, PDF page, markdown heading slug) so a re-import can reconcile positions.

ReadingPosition: `{ documentId, sectionId, blockId, tokenIndex, updatedAt }`.
