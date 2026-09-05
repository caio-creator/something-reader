import dns from "node:dns/promises";
import net from "node:net";
import type { Plugin } from "vite";

/**
 * Local article fetcher.
 *
 * The browser cannot fetch arbitrary origins (CORS), and routing personal
 * reading through a third-party reader service would contradict the whole
 * premise. So the local dev server does the fetch itself: nothing leaves this
 * machine except the request for the page the user asked for.
 *
 * A server that fetches user-supplied URLs is an SSRF primitive, so every hop
 * is re-validated against the resolved IP, not just the hostname.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;

const isBlockedIpv4 = (ip: string): boolean => {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
};

const isBlockedIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]!);
  return false;
};

const assertPublic = async (target: URL): Promise<void> => {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("Only http and https links can be imported.");
  }
  const literal = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(literal)
    ? [literal]
    : (await dns.lookup(literal, { all: true })).map((a) => a.address);
  if (addresses.length === 0) throw new Error("That host could not be resolved.");
  if (addresses.some(isBlockedIp)) throw new Error("That address is not reachable from here.");
};

const readCapped = async (response: Response): Promise<string> => {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("That page is larger than 5 MB.");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new Error("That page is larger than 5 MB.");
  const charset = response.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1]?.trim();
  try {
    return new TextDecoder(charset || "utf-8").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
};

const fetchArticle = async (raw: string): Promise<{ url: string; html: string }> => {
  let target = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublic(target);
    const response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "something-reader (local, personal use)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("That link redirected nowhere.");
      target = new URL(location, target);
      continue;
    }
    if (!response.ok) throw new Error(`That page answered ${response.status}.`);

    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) {
      throw new Error("That link is not a web page.");
    }
    return { url: target.toString(), html: await readCapped(response) };
  }
  throw new Error("That link redirected too many times.");
};

export const localFetchPlugin = (): Plugin => ({
  name: "something-local-fetch",
  configureServer(server) {
    server.middlewares.use("/api/fetch", (req, res) => {
      const send = (status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(body));
      };
      const raw = new URL(req.url ?? "", "http://localhost").searchParams.get("url");
      if (!raw) {
        send(400, { error: "Give me a link." });
        return;
      }
      fetchArticle(raw)
        .then((result) => send(200, result))
        .catch((err: unknown) => send(400, { error: err instanceof Error ? err.message : "Could not reach that link." }));
    });
  },
});
