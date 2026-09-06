import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchArticle, resolvePublic, type Fetched, type Pin } from "../vite-plugin-fetch";

/**
 * The importer's rules, against a server that actually answers.
 *
 * A03 was a unit-level bug found by a probe, and unit tests alone could not
 * show the guard sitting in front of the transport. Two seams do: a resolver
 * that lets a controlled local server stand in for a public host, and a
 * transport that records whether it was ever reached.
 *
 * Nothing here talks to a real network, to cloud metadata, or to anything on
 * this machine other than the server started below.
 */

let server: http.Server;
let port = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const path = req.url ?? "/";
    if (path === "/article") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>An article</h1><p>Body text.</p></body></html>");
      return;
    }
    if (path === "/moved") {
      res.writeHead(302, { location: "/article" });
      res.end();
      return;
    }
    if (path === "/loop") {
      res.writeHead(302, { location: "/loop" });
      res.end();
      return;
    }
    if (path === "/nowhere") {
      res.writeHead(302);
      res.end();
      return;
    }
    if (path === "/image") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      return;
    }
    if (path === "/huge") {
      res.writeHead(200, { "content-type": "text/html", "content-length": String(6 * 1024 * 1024) });
      res.end("x".repeat(1024));
      return;
    }
    res.writeHead(404, { "content-type": "text/html" });
    res.end("<html>no</html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => { server.close(); });

/** Stands in for DNS: the controlled server plays the part of a public host. */
const toTestServer = async (): Promise<Pin> => ({ address: "127.0.0.1", family: 4 });
const url = (path: string) => `http://127.0.0.1:${port}${path}`;

describe("fetching an article, against a real server", () => {
  test("reads a page", async () => {
    const result = await fetchArticle(url("/article"), { resolve: toTestServer });
    expect(result.html).toContain("An article");
  });

  test("follows a redirect and reports where it ended up", async () => {
    const result = await fetchArticle(url("/moved"), { resolve: toTestServer });
    expect(result.url).toContain("/article");
    expect(result.html).toContain("An article");
  });

  test("gives up on a redirect that never lands", async () => {
    await expect(fetchArticle(url("/loop"), { resolve: toTestServer })).rejects.toThrow(/too many times/);
  });

  test("refuses a redirect with no destination", async () => {
    await expect(fetchArticle(url("/nowhere"), { resolve: toTestServer })).rejects.toThrow(/redirected nowhere/);
  });

  test("refuses something that is not a web page", async () => {
    await expect(fetchArticle(url("/image"), { resolve: toTestServer })).rejects.toThrow(/not a web page/);
  });

  test("refuses a page that declares itself larger than the cap", async () => {
    await expect(fetchArticle(url("/huge"), { resolve: toTestServer })).rejects.toThrow(/larger than 5 MB/);
  });

  test("refuses a page that did not come back 200", async () => {
    await expect(fetchArticle(url("/missing"), { resolve: toTestServer })).rejects.toThrow(/could not be read/);
  });
});

describe("the address guard sits in front of the transport", () => {
  /** Records whether it was reached at all. Reaching it is the failure. */
  const spy = () => {
    const calls: URL[] = [];
    const request = async (target: URL): Promise<Fetched> => {
      calls.push(target);
      return { status: 200, type: "text/html", body: Buffer.from("<html></html>") };
    };
    return { calls, request };
  };

  test("a private address is refused before anything is sent", async () => {
    for (const target of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://192.168.1.1/",
      "http://10.0.0.1/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:169.254.169.254]/",
    ]) {
      const { calls, request } = spy();
      await expect(fetchArticle(target, { request })).rejects.toThrow(/not reachable from here/);
      expect(calls).toHaveLength(0);
    }
  });

  test("a non-web scheme is refused before anything is sent", async () => {
    const { calls, request } = spy();
    await expect(fetchArticle("file:///etc/passwd", { request })).rejects.toThrow(/http and https/);
    expect(calls).toHaveLength(0);
  });

  test("every hop is checked, not only the first", async () => {
    // The redirect target is private; the first hop is not.
    const seen: URL[] = [];
    const request = async (target: URL): Promise<Fetched> => {
      seen.push(target);
      return { status: 302, location: "http://[::ffff:169.254.169.254]/", type: "text/html", body: Buffer.alloc(0) };
    };
    let hop = 0;
    const resolve = async (target: URL): Promise<Pin> => {
      hop += 1;
      // First hop stands in for a public host; after that, the real guard.
      return hop === 1 ? { address: "93.184.216.34", family: 4 } : resolvePublic(target);
    };
    await expect(fetchArticle("http://example.com/", { resolve, request })).rejects.toThrow(/not reachable from here/);
    expect(seen).toHaveLength(1);
  });
});
