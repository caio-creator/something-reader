import { useMemo, useState } from "react";
import { ActionMenu, Button, EmptyState, Icon, Ring, Sheet } from "@ui/components";
import { copy } from "@ui/copy";
import type { LibraryItem } from "@core/storage/types";
import { estimateMs, timeLeft } from "../format";

export const Things = ({
  items,
  wpm,
  onOpen,
  onRemove,
  onAdd,
}: {
  items: LibraryItem[];
  wpm: number;
  onOpen: (id: string) => void;
  onRemove: (id: string, title: string) => void;
  onAdd: (kind: "paste" | "link" | "file" | "sample") => void;
}) => {
  const [query, setQuery] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<LibraryItem | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.sourceName, item.sourceType, ...item.authors]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  return (
    <main className="things" id="main">
      <header className="things-head">
        <div className="screen-bar">
          <h1>{copy.things}</h1>
          <ActionMenu
            label={copy.importLabel}
            trigger={<span className="add-button"><Icon name="close" size={20} className="add-glyph" /></span>}
            actions={[
              { id: "paste", label: copy.paste, icon: "paste", onSelect: () => onAdd("paste") },
              { id: "link", label: copy.link, icon: "link", onSelect: () => onAdd("link") },
              { id: "file", label: copy.openFile, icon: "file", onSelect: () => onAdd("file") },
              { id: "sample", label: copy.sample, icon: "bolt", onSelect: () => onAdd("sample") },
            ]}
          />
        </div>
        <div className="search">
          <Icon name="search" size={17} />
          <input
            className="field field-search"
            type="search"
            placeholder={copy.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={copy.search}
          />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="things-empty">
          <EmptyState icon="info" title={copy.emptyWhy} body={copy.emptyWhyBody} />
          <EmptyState
            icon="things"
            title={copy.emptyTitle}
            body={copy.emptyBody}
            action={<Button variant="primary" icon="bolt" onClick={() => onAdd("sample")}>{copy.sample}</Button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="things-empty">
          <EmptyState icon="search" title={copy.notFound} body={copy.notFoundBody} />
        </div>
      ) : (
        <ul className="thing-list">
          {filtered.map((item) => {
            const done = item.progress >= 0.98;
            const left = estimateMs(Math.max(0, item.tokenCount - item.tokenIndex), wpm);
            return (
              <li key={item.id} className="thing">
                <button type="button" className="thing-open" onClick={() => onOpen(item.id)}>
                  <Ring progress={item.progress} done={done} />
                  <span className="thing-copy">
                    <span className="thing-title">{item.title}</span>
                    <span className="thing-meta mono">
                      {done ? copy.finished : timeLeft(left)}
                      <i aria-hidden="true">·</i>
                      {item.sourceType}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  icon="trash"
                  aria-label={`${copy.remove}: ${item.title}`}
                  className="thing-remove"
                  onClick={() => setPendingRemoval(item)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {pendingRemoval && (
        <Sheet
          title={copy.removeTitle}
          onClose={() => setPendingRemoval(null)}
          footer={
            <div className="sheet-actions">
              <Button onClick={() => setPendingRemoval(null)}>{copy.cancel}</Button>
              <Button
                variant="primary"
                className="is-danger"
                onClick={() => {
                  onRemove(pendingRemoval.id, pendingRemoval.title);
                  setPendingRemoval(null);
                }}
              >
                {copy.remove}
              </Button>
            </div>
          }
        >
          <p className="sheet-text">
            <strong>{pendingRemoval.title}</strong>
            <span>{copy.removeBody}</span>
          </p>
        </Sheet>
      )}
    </main>
  );
};
