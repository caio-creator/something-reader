import { useCallback, useEffect, useState } from "react";
import { importInWorker } from "@core/importers/client";
import { ImportError, importPastedText, importUrl } from "@core/importers";
import { markdownImporter } from "@core/importers/markdown";
import { deleteDocument, listLibrary, saveDocument } from "@core/storage/idb";
import type { LibraryItem } from "@core/storage/types";
import type { SomethingDocument } from "@core/model/types";
import { SAMPLE_MARKDOWN } from "../sample";

export type ImportState = { busy: boolean; phase: string; ratio: number; error: string | null };

type Result = { doc: SomethingDocument; original?: ArrayBuffer };

const IDLE: ImportState = { busy: false, phase: "", ratio: 0, error: null };

export const useLibrary = (onImported: (doc: SomethingDocument) => void) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [state, setState] = useState<ImportState>(IDLE);

  const refresh = useCallback(async () => {
    setItems(await listLibrary());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (task: () => Promise<Result>) => {
      setState({ busy: true, phase: "reading", ratio: 0, error: null });
      try {
        const { doc, original } = await task();
        await saveDocument(doc, original);
        await refresh();
        setState(IDLE);
        onImported(doc);
      } catch (err) {
        setState({
          busy: false,
          phase: "",
          ratio: 0,
          error: err instanceof ImportError ? err.message : "Could not import that.",
        });
      }
    },
    [onImported, refresh],
  );

  const addFile = useCallback(
    (file: File) =>
      run(async () => {
        const bytes = await file.arrayBuffer();
        // The worker takes ownership of the buffer it is given, so keep a copy
        // to store as the original.
        const original = bytes.slice(0);
        const doc = await importInWorker(bytes, file.name, file.type, (phase, ratio) =>
          setState((current) => ({ ...current, phase, ratio })),
        );
        return { doc, original };
      }),
    [run],
  );

  const addText = useCallback(
    (text: string, title?: string) =>
      run(async () => ({ doc: await importPastedText(text, title) })),
    [run],
  );

  const addUrl = useCallback(
    (url: string) => run(async () => ({ doc: await importUrl(url) })),
    [run],
  );

  const addSample = useCallback(
    () =>
      run(async () => {
        const bytes = new TextEncoder().encode(SAMPLE_MARKDOWN);
        return { doc: await markdownImporter.importFile(bytes.buffer as ArrayBuffer, "sample.md") };
      }),
    [run],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      await refresh();
    },
    [refresh],
  );

  const dismissError = useCallback(() => setState(IDLE), []);

  return { items, state, refresh, addFile, addText, addUrl, addSample, remove, dismissError };
};
