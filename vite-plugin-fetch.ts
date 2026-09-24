import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleFetch, REPLY_HEADERS } from "./server/fetch-article";

/**
 * `/api/fetch` on the dev server — the same endpoint the public deployment
 * serves from `api/fetch.ts`. Everything that decides what it will fetch lives
 * in `server/fetch-article.ts`; this only adapts Node's request and response.
 */

export const localFetchPlugin = (): Plugin => ({
  name: "something-local-fetch",
  configureServer(server) {
    server.middlewares.use("/api/fetch", (req: IncomingMessage, res: ServerResponse) => {
      const header = (name: string) => {
        const value = req.headers[name];
        return Array.isArray(value) ? value[0] : value;
      };
      const target = new URL(req.url ?? "", "http://localhost").searchParams.get("url");

      void handleFetch({ method: req.method, header, target }).then(({ status, body }) => {
        res.statusCode = status;
        for (const [name, value] of Object.entries(REPLY_HEADERS)) res.setHeader(name, value);
        res.end(JSON.stringify(body));
      });
    });
  },
});
