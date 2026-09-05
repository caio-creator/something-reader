import { describe, expect, test } from "bun:test";
import { decodeEntities, htmlToBlocks } from "../src/core/importers/html";

describe("html extractor", () => {
  test("reads headings, paragraphs, lists, quotes and code", () => {
    const { title, blocks } = htmlToBlocks(`
      <h1>Real Title</h1>
      <p>Hello <em>world</em>.</p>
      <ul><li>One</li><li>Two</li></ul>
      <blockquote>Quoted.</blockquote>
      <pre>code  here</pre>
    `);
    expect(title).toBe("Real Title");
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading", "paragraph", "list", "list", "quote", "code",
    ]);
    expect(blocks[1]!.text).toBe("Hello world.");
    expect(blocks[2]!.text).toBe("• One");
  });

  test("falls back to the head title", () => {
    expect(htmlToBlocks("<title>Head</title><p>Body</p>").title).toBe("Head");
    expect(htmlToBlocks("<p>Body</p>").title).toBe("Document");
  });

  test("drops chrome and never reads markup out of a script", () => {
    const { blocks } = htmlToBlocks(`
      <nav>menu <p>nav para</p></nav>
      <script>var x = "<p>injected</p>";</script>
      <style>p { content: "<p>styled</p>" }</style>
      <p>Kept.</p>
    `);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe("Kept.");
  });

  test("handles nested skip tags without swallowing the rest", () => {
    const { blocks } = htmlToBlocks("<footer><footer>deep</footer>shallow</footer><p>Kept.</p>");
    expect(blocks.map((b) => b.text)).toEqual(["Kept."]);
  });

  test("an outer block wins over nested ones", () => {
    const { blocks } = htmlToBlocks("<blockquote><p>inner</p></blockquote>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.kind).toBe("quote");
  });

  test("void and self-closing tags do not open a block", () => {
    const { blocks } = htmlToBlocks("<p>a<img src=x/>b</p><hr/><p>c</p>");
    expect(blocks.map((b) => b.text)).toEqual(["ab", "c"]);
  });

  test("br becomes a space", () => {
    expect(htmlToBlocks("<p>Line<br>break</p>").blocks[0]!.text).toBe("Line break");
  });

  test("decodes named, decimal and hex entities and leaves unknown ones alone", () => {
    expect(decodeEntities("&lt;b&gt; &#65;&#x42; &hellip; &nope;")).toBe("<b> AB … &nope;");
  });

  test("ignores comments, including ones containing tags", () => {
    const { blocks } = htmlToBlocks("<!-- <p>ghost</p> --><p>real</p>");
    expect(blocks.map((b) => b.text)).toEqual(["real"]);
  });
});
