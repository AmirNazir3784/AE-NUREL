import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyEditor, parseVtt } from "../src/lib/subtitle-editor.ts";
import { MAX_FILE_BYTES, MAX_TIMESTAMP_MS } from "../src/lib/srt.ts";
import { convertSrtDocument, openSrtConversion, serializeVttConversion, validateVttConversion, vttFilename, webVttText } from "../src/lib/srt-to-vtt.ts";

const one = "1\n00:00:05,250 --> 00:00:08,500\nWelcome to the video.\n";
const three = `${one}\n9\n00:00:09,001 --> 00:00:11,999\n字幕 · مرحبا · Café 🎬\nSecond line.\n\n9\n01:02:03,004 --> 01:02:04,005\n<i>Hello</i> <b>world</b> <u>again</u>.\n`;
function open(text = one, filename = "interview.srt") {
  const bytes = new TextEncoder().encode(text);
  return openSrtConversion({ name: filename, size: bytes.byteLength }, bytes.buffer);
}
const clone = (value) => structuredClone(value);

describe("SRT to WebVTT conversion", () => {
  it("converts one cue with an exact header, blank line and no cue number", () => {
    assert.equal(open().content, "WEBVTT\n\n00:00:05.250 --> 00:00:08.500\nWelcome to the video.\n");
  });
  it("represents every cue from a multi-cue source in source order", () => {
    const result = open(three), output = parseVtt(result.content);
    assert.equal(output.cues.length, 3);
    assert.deepEqual(output.cues.map((cue) => [cue.start, cue.end, cue.text]), result.source.cues.map((cue) => [cue.start, cue.end, cue.text]));
  });
  it("changes only timestamp punctuation, retaining exact milliseconds", () => {
    const output = open(three).content;
    assert.ok(output.includes("00:00:09.001 --> 00:00:11.999"));
    assert.ok(output.includes("01:02:03.004 --> 01:02:04.005"));
    assert.equal(output.split("\n").filter((line) => line.includes("-->")).some((line) => line.includes(",")), false);
  });
  it("omits unusual and duplicate numeric SRT sequence numbers", () => {
    const result = open(three.replace(/^1\n/, "00042\n"));
    assert.ok(parseVtt(result.content).cues.every((cue) => cue.identifier === ""));
    assert.ok(!/^\d+$/m.test(result.content));
  });
  for (const [name, text] of [["multiline", "First line.\nSecond line."], ["Unicode", "字幕 Español café"], ["RTL", "مرحبا بالعالم\nשלום עולם"], ["emoji", "👨‍👩‍👧‍👦 🎬 😀"], ["punctuation and spaces", "  Wait… really?!  "], ["long caption", "Caption ".repeat(20_000)]]) {
    it(`preserves ${name} text exactly`, () => {
      const result = open(one.replace("Welcome to the video.", text));
      assert.equal(parseVtt(result.content).cues[0].text, text);
    });
  }
  it("does not globally replace comma timestamps in caption wording", () => {
    const text = "Use 00:00:05,250 as the example.";
    assert.equal(parseVtt(open(one.replace("Welcome to the video.", text)).content).cues[0].text, text);
  });
  it("retains non-zero first time and hour values", () => {
    const result = open(one.replace("00:00:05,250", "12:34:56,789").replace("00:00:08,500", "12:35:01,001"));
    assert.ok(result.content.includes("12:34:56.789 --> 12:35:01.001"));
  });
  it("preserves overlaps instead of changing timing", () => {
    const result = open(`${one}\n2\n00:00:07,000 --> 00:00:10,000\nNext.\n`);
    assert.deepEqual(result.output.cues.map((cue) => [cue.start, cue.end]), [[5250, 8500], [7000, 10000]]);
  });
  it("allows equal source start times without reordering", () => {
    assert.equal(open(`${one}\n2\n00:00:05,250 --> 00:00:10,000\nNext.\n`).output.cues.length, 2);
  });
  it("never mutates the source document", () => {
    const source = open(three).source, snapshot = clone(source);
    convertSrtDocument(source);
    assert.deepEqual(source, snapshot);
  });
});

describe("converter input and encodings", () => {
  for (const eol of ["\n", "\r\n"]) it(`preserves ${eol === "\n" ? "LF" : "CRLF"} file line endings`, () => {
    const output = open(three.replace(/\n/g, eol)).content;
    assert.ok(output.startsWith(`WEBVTT${eol}${eol}`));
    if (eol === "\r\n") assert.equal(output.replace(/\r\n/g, "").includes("\n"), false);
    assert.equal(parseVtt(output).cues[1].text, "字幕 · مرحبا · Café 🎬\nSecond line.");
  });
  it("handles UTF-8 BOM without adding a BOM to the output", () => assert.ok(open("\uFEFF" + three).content.startsWith("WEBVTT\n\n")));
  for (const bigEndian of [false, true]) it(`accepts BOM-marked UTF-16 ${bigEndian ? "BE" : "LE"} and exports UTF-8 text`, () => {
    const utf16 = Buffer.alloc(three.length * 2 + 2);
    utf16[0] = bigEndian ? 0xfe : 0xff; utf16[1] = bigEndian ? 0xff : 0xfe;
    for (let i = 0; i < three.length; i++) utf16[bigEndian ? "writeUInt16BE" : "writeUInt16LE"](three.charCodeAt(i), i * 2 + 2);
    assert.equal(openSrtConversion({ name: "subtitles.srt", size: utf16.length }, utf16.buffer.slice(utf16.byteOffset, utf16.byteOffset + utf16.byteLength)).content, open(three).content);
  });
  const invalid = [
    ["empty", "", "empty"], ["whitespace", "  \n", "empty"], ["no cues", "Not subtitles", "No valid subtitles"],
    ["malformed timestamp", one.replace("00:00:05,250", "00:77:05,250"), "Cue 1"],
    ["wrong timestamp separator", one.replace("00:00:05,250", "00:00:05.250"), "timestamp line"],
    ["zero duration", one.replace("00:00:08,500", "00:00:05,250"), "end later"],
    ["reversed duration", one.replace("00:00:08,500", "00:00:04,000"), "ends before"],
    ["negative timestamp", one.replace("00:00:05,250", "-00:00:05,250"), "timestamp"],
    ["overflow hours", one.replace("00:00:08,500", "100:00:08,500"), "timestamp"],
    ["missing text", one.replace("Welcome to the video.", ""), "no subtitle text"],
    ["missing cue separator", one + "2\n00:00:09,000 --> 00:00:10,000\nNext.\n", "blank line"],
    ["out-of-order timing", one + "\n2\n00:00:01,000 --> 00:00:02,000\nNext.\n", "Cue 2 starts before"],
  ];
  for (const [name, source, error] of invalid) it(`rejects ${name} with filename and useful context`, () => assert.throws(() => open(source), (cause) => cause.message.startsWith("interview.srt:") && cause.message.includes(error)));
  it("rejects non-SRT input even when its contents look like SRT", () => assert.throws(() => open(one, "captions.vtt"), /Choose an .srt/));
  it("rejects files above the established 10 MB limit", () => assert.throws(() => openSrtConversion({ name: "huge.srt", size: MAX_FILE_BYTES + 1 }, new ArrayBuffer(0)), /too large/));
  it("rejects unreadable UTF-8 rather than replacing characters", () => assert.throws(() => openSrtConversion({ name: "bad.srt", size: 2 }, new Uint8Array([0xc3, 0x28]).buffer), /encoding/));
  it("rejects invalid internal timing and non-SRT documents", () => {
    const source = open().source;
    for (const [start, end] of [[null, 8500], [5250, MAX_TIMESTAMP_MS + 1], [-1, 8500], [5250.5, 8500]]) assert.throws(() => convertSrtDocument({ ...source, cues: [{ ...source.cues[0], start, end }] }), /Cue 1/);
    assert.throws(() => convertSrtDocument({ ...source, format: "vtt" }), /only accepts SRT/);
    assert.throws(() => convertSrtDocument(emptyEditor()), /No subtitle cues/);
  });
  it("enforces the established 10,000-cue limit", () => {
    const source = Array.from({ length: 10001 }, (_, i) => `${i + 1}\n00:00:05,000 --> 00:00:08,000\nCaption.`).join("\n\n");
    assert.throws(() => open(source), /10,000 cues/);
  });
});

describe("converter markup and metadata", () => {
  it("preserves balanced bold/italic/underline markup without a warning", () => {
    const text = "<b>Bold <i>italic</i></b>\n<u>Underlined</u>";
    const result = open(one.replace("Welcome to the video.", text));
    assert.equal(parseVtt(result.content).cues[0].text, text);
    assert.deepEqual(result.warnings, []);
  });
  it("omits unsupported positioning, warns, and retains timing/text", () => {
    const result = open(one.replace("00:00:08,500", "00:00:08,500 X1:10 X2:30 Y1:20 Y2:40"));
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /positioning.*omitted/);
    assert.equal(result.content, open(one).content);
    assert.ok(result.source.cues[0].srtSettings);
    assert.equal(result.output.cues[0].vttSettings, "");
  });
  it("escapes unsupported tags instead of losing their text or emitting invalid markup", () => {
    const result = open(one.replace("Welcome to the video.", '<font color="red">Hello</font>'));
    assert.ok(result.content.includes('&lt;font color="red"&gt;Hello&lt;/font&gt;'));
    assert.match(result.warnings[0], /literal text/);
  });
  it("escapes unbalanced or incorrectly nested basic tags with a warning", () => {
    for (const text of ["<b>Hello", "<b><i>Hello</b></i>", "</u>Hello"]) {
      const result = open(one.replace("Welcome to the video.", text));
      assert.ok(!/<\/?[biu]>/.test(parseVtt(result.content).cues[0].text));
      assert.match(result.warnings[0], /literal text/);
    }
  });
  it("escapes literal reserved characters and arrows without rewriting words", () => assert.equal(webVttText("A & B < 3 > 2 --> next").text, "A &amp; B &lt; 3 &gt; 2 --&gt; next"));
  it("keeps valid HTML references and safely escapes unknown/invalid references", () => {
    assert.equal(webVttText("&amp; &copy; &#233; &#x1F600;").text, "&amp; &copy; &#233; &#x1F600;");
    assert.equal(webVttText("&#X1F600;").text, "&#X1F600;");
    assert.equal(webVttText("&unknown; &#0; &#xD800;").text, "&amp;unknown; &amp;#0; &amp;#xD800;");
  });
  it("warns when a character reference must be kept as literal text", () => {
    const result = open(one.replace("Welcome to the video.", "An &unknown; reference."));
    assert.match(result.warnings[0], /character references/);
    assert.ok(result.content.includes("An &amp;unknown; reference."));
  });
});

describe("converter output validation", () => {
  it("round-trips every cue and outputs no identifiers or SRT settings", () => {
    const result = open(three);
    validateVttConversion(result);
    assert.equal(serializeVttConversion(result), result.content);
    assert.equal(result.content.split("\n\n").length, 4);
    assert.ok(parseVtt(result.content).cues.every((cue) => !cue.identifier && !cue.vttSettings));
  });
  it("rejects a missing header, comma timing, omitted cues or changed download string", () => {
    for (const change of [(s) => s.replace("WEBVTT\n\n", ""), (s) => s.replace("05.250", "05,250"), (s) => s.split("\n\n").slice(0, 2).join("\n\n"), () => ""]) {
      const result = open(three); result.content = change(result.content);
      assert.throws(() => serializeVttConversion(result), /download no longer matches/);
    }
  });
  it("rejects changed timing, caption content, count, identifiers, settings or filename", () => {
    const changes = [(r) => r.output.cues[0].end++, (r) => r.output.cues[0].text = "Changed", (r) => r.output.cues.pop(), (r) => r.output.cues[0].identifier = "1", (r) => r.output.cues[0].vttSettings = "align:start", (r) => r.filename = "old.vtt"];
    for (const change of changes) { const result = clone(open(three)); change(result); assert.throws(() => serializeVttConversion(result), /no longer matches/); }
  });
  it("uses the original stem with only a new extension", () => {
    assert.equal(vttFilename("interview.srt"), "interview.vtt");
    assert.equal(vttFilename("My interview.SRT"), "My interview.vtt");
    assert.equal(vttFilename("movie.part-1.srt"), "movie.part-1.vtt");
    assert.equal(vttFilename(".srt"), "subtitles.vtt");
  });
});
