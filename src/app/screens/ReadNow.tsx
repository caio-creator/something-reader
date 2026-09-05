import { useEffect, useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "@core/importers";
import { Button, FocusWord, Sheet } from "@ui/components";
import { copy } from "@ui/copy";
import type { ImportState } from "../hooks/useLibrary";
import { VERSION } from "../version";

type Props = {
  state: ImportState;
  dragging: boolean;
  /** An intent handed over from another screen's add menu. */
  pending?: "paste" | "link" | "file" | "sample" | null;
  onPendingHandled?: () => void;
  onFile: (file: File) => void;
  onText: (text: string) => void;
  onUrl: (url: string) => void;
  onSample: () => void;
  onDismissError: () => void;
};

export const ReadNow = ({
  state,
  dragging,
  pending,
  onPendingHandled,
  onFile,
  onText,
  onUrl,
  onSample,
  onDismissError,
}: Props) => {
  const [sheet, setSheet] = useState<"paste" | "link" | null>(null);
  const [draft, setDraft] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending) return;
    if (pending === "file") fileInput.current?.click();
    else if (pending === "paste" || pending === "link") setSheet(pending);
    onPendingHandled?.();
  }, [pending, onPendingHandled]);

  const submit = () => {
    if (!draft.trim()) return;
    if (sheet === "paste") onText(draft);
    else onUrl(draft);
    setDraft("");
    setSheet(null);
  };

  return (
    <main className="read-now" id="main">
      <div className="mark">
        <FocusWord text="something" trailing="." size="mark" />
      </div>

      <section className={`import-card ${dragging ? "is-over" : ""}`}>
        <p className="eyebrow">{state.busy ? copy.adding : copy.importLabel}</p>

        {state.busy ? (
          <div className="progress" role="progressbar" aria-valuenow={Math.round(state.ratio * 100)}>
            <span style={{ width: `${Math.max(6, state.ratio * 100)}%` }} />
          </div>
        ) : (
          <>
            <Button icon="paste" onClick={() => setSheet("paste")}>
              {copy.paste}
            </Button>
            <Button icon="link" onClick={() => setSheet("link")}>
              {copy.link}
            </Button>
            <Button icon="file" onClick={() => fileInput.current?.click()}>
              {copy.openFile}
            </Button>
            <p className="or mono">{copy.or}</p>
            <Button variant="primary" icon="bolt" onClick={onSample}>
              {copy.sample}
            </Button>
          </>
        )}

        {state.error && (
          <p className="banner" role="alert">
            {state.error}
            <button type="button" className="btn btn-quiet" onClick={onDismissError}>
              {copy.close}
            </button>
          </p>
        )}

        <footer className="card-foot">
          <span className="mono">{copy.mark}</span>
          <span className="mono">{VERSION}</span>
        </footer>
      </section>

      <p className="fine">{dragging ? copy.drop : copy.hint}</p>

      <input
        ref={fileInput}
        hidden
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />

      {sheet && (
        <Sheet
          title={sheet === "paste" ? copy.pasteTitle : copy.linkTitle}
          onClose={() => setSheet(null)}
          footer={
            <Button variant="primary" disabled={!draft.trim()} onClick={submit}>
              {copy.add}
            </Button>
          }
        >
          {sheet === "paste" ? (
            <textarea
              className="field field-area"
              autoFocus
              placeholder={copy.pastePlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <input
              className="field"
              autoFocus
              type="url"
              inputMode="url"
              placeholder={copy.linkPlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
            />
          )}
        </Sheet>
      )}
    </main>
  );
};
