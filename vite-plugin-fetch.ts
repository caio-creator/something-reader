import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/**
 * Local article fetcher.
 *
 * The browser cannot fetch arbitrary origins (CORS), and routing personal
 * reading through a third-party reader service would contradict the premise of
 * the app. So the local dev server does the fetch itself: nothing leaves this
 * machine except the request for the page the user asked for.
 *
 * An endpoint that fetches user-supplied URLs is an SSRF primitive sitting on
 * localhost, so it is treated as hostile input end to end:
 *
 *   - only same-origin callers, enforced with a header a cross-origin page
 *     cannot set without a preflight this server never answers;
 *   - every hop is validated against its *resolved address*, and the socket is
 *     then pinned to that exact address, so DNS cannot rebind between the check
 *     and the connection;
 *   - redirects are followed by hand, re-validating each time;
 *   - responses are capped, timed out, and must look like a web page.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;

const isBlockedIpv4 = (ip: string): boolean => {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast and reserved
  return false;
};

export const isBlockedIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  const lower = ip.toLowerCase().split("%")[0]!;
  if (lower === "::1" || lower === "::") return true;
  if (/^f[cd]/.test(lower)) return true; // unique local
  if (/^fe[89ab]/.test(lower)) return true; // link-local
  const mapped = lower.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]!);
  return false;
};

/** Resolve once and return the address we will actually connect to. */
const resolvePublic = async (target: URL): Promise<{ address: string; family: number }> => {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("Only http and https links can be imported.");
  }
  const literal = target.hostname.replace(/^\[|\]$/g, "");
  const candidates = net.isIP(literal)
    ? [{ address: literal, family: net.isIPv6(literal) ? 6 : 4 }]
    : await dns.lookup(literal, { all: true }).catch(() => []);

  if (candidates.length === 0) throw new Error("That host could not be resolved.");
  // Every answer must be public: accepting one good address out of a mixed set
  // would let an attacker win the race by ordering.
  if (candidates.some((c) => isBlockedIp(c.address))) {
    throw new Error("That address is not reachable from here.");
  }
  return candidates[0]!;
};

type Fetched = { status: number; location?: string; type: string; body: Buffer };

/** One request, pinned to a pre-validated address so DNS cannot rebind. */
const requestPinned = (target: URL, pin: { address: string; family: number }): Promise<Fetched> =>
  new Promise((resolve, reject) => {
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(
      target,
      {
        // The socket goes to the address we checked, while SNI and the Host
        // header still carry the real hostname. Node asks with `all: true`, and
        // then wants an array back rather than positional arguments.
        lookup: ((
          _hostname: string,
          options: { all?: boolean },
          callback: (err: null, address: unknown, family?: number) => void,
        ) =>
          options.all
            ? callback(null, [{ address: pin.address, family: pin.family }])
            : callback(null, pin.address, pin.family)) as never,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "identity",
          "user-agent": "something-reader (local, personal use)",
        },
        timeout: TIMEOUT_MS,
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > MAX_BYTES) {
          res.destroy();
          reject(new Error("That page is larger than 5 MB."));
          return;
        }
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            reject(new Error("That page is larger than 5 MB."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location,
            type: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks),
          }),
        );
        res.on("error", () => reject(new Error("Could not read that page.")));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("That link took too long."));
    });
    // Deliberately generic: a precise connection error turns this endpoint into
    // a probe for what is reachable from this machine.
    req.on("error", () => reject(new Error("Could not reach that link.")));
    req.end();
  });

const decode = (body: Buffer, type: string): string => {
  const charset = type.match(/charset=["']?([^;"']+)/i)?.[1]?.trim();
  try {
    return new TextDecoder(charset || "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
};

const fetchArticle = async (raw: string): Promise<{ url: string; html: string }> => {
  let target = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const pin = await resolvePublic(target);
    const response = await requestPinned(target, pin);

    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new Error("That link redirected nowhere.");
      target = new URL(response.location, target);
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error("That page could not be read.");
    }
    if (!/text\/html|application\/xhtml|text\/plain/i.test(response.type)) {
      throw new Error("That link is not a web page.");
    }
    return { url: target.toString(), html: decode(response.body, response.type) };
  }
  throw new Error("That link redirected too many times.");
};

/**
 * Only this app may call the endpoint. `x-something-reader` is not a CORS-safe
 * header, so a cross-origin page cannot set it on a simple request, and the
 * preflight it would need is never answered. `Sec-Fetch-Site` backs it up.
 */
const isSameOrigin = (req: IncomingMessage): boolean => {
  if (req.headers["x-something-reader"] !== "1") return false;
  const site = req.headers["sec-fetch-site"];
  return site === undefined || site === "same-origin" || site === "none";
};

export const localFetchPlugin = (): Plugin => ({
  name: "something-local-fetch",
  configureServer(server) {
    server.middlewares.use("/api/fetch", (req: IncomingMessage, res: ServerResponse) => {
      const send = (status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.setHeader("vary", "origin");
        res.end(JSON.stringify(body));
      };

      if (req.method !== "GET") {
        send(405, { error: "Use GET." });
        return;
      }
      if (!isSameOrigin(req)) {
        send(403, { error: "That request did not come from the app." });
        return;
      }

      const raw = new URL(req.url ?? "", "http://localhost").searchParams.get("url");
      if (!raw) {
        send(400, { error: "Give me a link." });
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        send(400, { error: "That does not look like a link." });
        return;
      }

      fetchArticle(parsed.toString())
        .then((result) => send(200, result))
        .catch((err: unknown) =>
          send(400, { error: err instanceof Error ? err.message : "Could not reach that link." }),
        );
    });
  },
});
