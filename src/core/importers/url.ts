import { ImportError } from "./types";
import { importHtmlString } from "./html";
import type { SomethingDocument } from "../model/types";

/**
 * Article import.
 *
 * Readability and DOMPurify both need a real DOM, so this one step stays on the
 * main thread — an article is small enough that it does not block anything. The
 * network hop goes through Something's own `/api/fetch` (server/fetch-article.ts,
 * served by the dev server or the public deployment's function), so no
 * third-party service ever sees what is being read.
 */
export const importUrl = async (rawUrl: string): Promise<SomethingDocument> => {
  let target: URL;
  try {
    target = new URL(rawUrl.trim().match(/^https?:\/\//i) ? rawUrl.trim() : `https://${rawUrl.trim()}`);
  } catch {
    throw new ImportError("unsupported", "That does not look like a link.");
  }

  let payload: { url: string; html: string };
  try {
    const response = await fetch(`/api/fetch?url=${encodeURIComponent(target.toString())}`, {
      headers: { "x-something-reader": "1" },
    });
    const body = (await response.json()) as { url?: string; html?: string; error?: string };
    if (!response.ok || !body.html) {
      throw new ImportError("network", body.error ?? "Could not reach that link.");
    }
    payload = { url: body.url ?? target.toString(), html: body.html };
  } catch (err) {
    if (err instanceof ImportError) throw err;
    // Screens gate this on `capabilities.canImportUrl`, so reaching here means
    // the request itself failed, not that the feature is missing.
    throw new ImportError("network", "Could not reach that link. Check the address, or paste the text instead.");
  }

  const [{ Readability }, DOMPurify] = await Promise.all([
    import("@mozilla/readability"),
    import("dompurify").then((m) => m.default),
  ]);

  const parsed = new DOMParser().parseFromString(payload.html, "text/html");
  const base = parsed.createElement("base");
  base.href = payload.url;
  parsed.head.appendChild(base);

  const article = new Readability(parsed).parse();
  const host = new URL(payload.url).hostname.replace(/^www\./, "");
  const rawContent = article?.content ?? payload.html;
  const clean = DOMPurify.sanitize(rawContent, { USE_PROFILES: { html: true } });

  return importHtmlString(clean, host, {
    title: article?.title?.trim() || host,
    authors: article?.byline ? [article.byline.trim()] : [],
    sourceUrl: payload.url,
  });
};
