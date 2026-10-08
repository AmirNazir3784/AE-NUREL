import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSrt, formatTimestamp, MAX_FILE_BYTES } from "../src/lib/srt.ts";
import { parseSplitSource, parseSplitValue, splitFilename, splitSrt } from "../src/lib/srt-split.ts";
import { createSplitZip, splitArchiveFilename } from "../src/lib/srt-split-zip.ts";
import { unzipSync, strFromU8 } from "fflate";

const source = (times, text = (i) => `Caption ${i + 1}`, eol = "\n") => parseSrt(times.map(([start, end], i) => `${91 + i}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${text(i)}\n`).join("\n").replace(/\n/g, eol));
const document = (count) => source(Array.from({ length: count }, (_, i) => [i * 2000 + 5000, i * 2000 + 6000]));
const split = (doc, method = "parts", value = "2", timestamps = "original", name = "interview.srt") => splitSrt(doc, name, { method, value, timestamps });
const counts = (result) => result.parts.map((part) => part.cues.length);
const bytes = (text) => new TextEncoder().encode(text).buffer;

describe("balanced parts", () => {
  it("splits ten cues into two groups of five", () => assert.deepEqual(counts(split(document(10))), [5, 5]));
  it("splits ten cues into three balanced groups", () => assert.deepEqual(counts(split(document(10), "parts", "3")), [4, 3, 3]));
  it("distributes the remainder to the earliest groups", () => assert.deepEqual(counts(split(document(11), "parts", "4")), [3, 3, 3, 2]));
  it("rejects more parts than cues", () => assert.throws(() => split(document(3), "parts", "4"), /no more than 3/));
  it("allows one hundred parts, but never more", () => {
    assert.equal(split(document(100), "parts", "100").parts.length, 100);
    assert.throws(() => split(document(101), "parts", "101"), /2 and 100/);
  });
});

describe("cues per file", () => {
  it("splits exact divisions without a trailing empty part", () => assert.deepEqual(counts(split(document(10), "cues", "5")), [5, 5]));
  it("retains a final partial group", () => assert.deepEqual(counts(split(document(245), "cues", "100")), [100, 100, 45]));
  it("supports one cue per output", () => assert.deepEqual(counts(split(document(3), "cues", "1")), [1, 1, 1]));
  it("rejects zero", () => assert.throws(() => split(document(10), "cues", "0"), /1 and 1,000,000/));
  it("rejects more than one hundred outputs", () => assert.throws(() => split(document(101), "cues", "1"), /more than 100/));
  it("rejects a configuration that would simply recreate the source", () => assert.throws(() => split(document(10), "cues", "10"), /every cue in one file/));
});

const intervalSource = source([[0, 1000], [598000, 604000], [600000, 603000], [603000, 607000], [1803000, 1805000]]);
describe("time interval assignment", () => {
  it("groups by ten-minute windows and skips an empty middle window", () => {
    const result = split(intervalSource, "time", "10");
    assert.deepEqual(counts(result), [2, 2, 1]);
    assert.deepEqual(result.parts.map((part) => part.boundary), [0, 600000, 1800000]);
    assert.equal(result.skippedWindows, 1);
  });
  it("assigns a cue immediately before the boundary to the earlier window", () => {
    const result = split(source([[599999, 600100], [600000, 603000]]), "time", "10");
    assert.equal(result.parts[0].cues[0].start, 599999);
  });
  it("assigns a cue exactly on the boundary to the next window", () => assert.equal(split(intervalSource, "time", "10").parts[1].cues[0].start, 600000));
  it("does not cut or duplicate a boundary-crossing cue", () => {
    const result = split(intervalSource, "time", "10");
    assert.equal(result.parts[0].cues[1].end, 604000);
    assert.equal(result.parts.flatMap((part) => part.cues).filter((cue) => cue.text === "Caption 2").length, 1);
  });
  it("skips multiple empty windows and rebases against actual window boundaries", () => {
    const result = split(source([[603000, 605000], [2403000, 2405000]]), "time", "10", "zero");
    assert.deepEqual(result.parts.map((part) => part.start), [3000, 3000]);
    assert.equal(result.skippedWindows, 3);
  });
  it("rejects excessively small intervals producing more than one hundred files", () => assert.throws(() => split(document(101), "time", "0.001"), /more than 100/));
  it("accepts decimal minutes", () => assert.deepEqual(counts(split(source([[0, 1000], [30000, 31000]]), "time", "0.5")), [1, 1]));
  it("rejects a single occupied window", () => assert.throws(() => split(document(10), "time", "10"), /one interval/));
});

describe("output timestamps and source order", () => {
  it("keeps original timestamps exactly", () => assert.deepEqual(split(document(4)).parts.flatMap((p) => p.cues).map((c) => [c.start, c.end]), document(4).cues.map((c) => [c.start, c.end])));
  it("rebases cue-count parts against their first start", () => assert.deepEqual(split(document(4), "cues", "2", "zero").parts.map((p) => p.cues.map((c) => [c.start, c.end])), [[[0, 1000], [2000, 3000]], [[0, 1000], [2000, 3000]]]));
  it("rebases balanced parts independently", () => assert.deepEqual(split(document(4), "parts", "2", "zero").parts.map((p) => p.start), [0, 0]));
  it("time rebasing keeps the three-second lead-in after the boundary", () => {
    const result = split(source([[0, 1000], [603000, 607000]]), "time", "10", "zero");
    assert.deepEqual(result.parts[1].cues.map((c) => [c.start, c.end]), [[3000, 7000]]);
  });
  it("never generates negative timestamps", () => assert.ok(split(intervalSource, "time", "10", "zero").parts.flatMap((p) => p.cues).every((c) => c.start >= 0 && c.end >= c.start)));
  it("retains unsorted source order without sorting captions", () => {
    const doc = source([[9000, 10000], [2000, 4000], [8000, 11000], [1000, 2000]]);
    assert.deepEqual(split(doc).parts.flatMap((p) => p.cues).map((c) => c.text), doc.cues.map((c) => c.text));
    assert.equal(split(doc).timeline, 11000);
  });
  it("retains source order inside time windows", () => assert.deepEqual(split(source([[603000, 605000], [600000, 602000], [0, 1000]]), "time", "10").parts[1].cues.map((c) => c.start), [603000, 600000]));
  it("explains unsorted cues that cannot rebase from their first start safely", () => assert.throws(() => split(source([[9000, 10000], [1000, 2000], [15000, 16000]]), "parts", "2", "zero"), /out of time order/));
});

describe("serialization, encoding and filenames", () => {
  it("renumbers every file from one, regardless of source cue numbers", () => assert.deepEqual(split(document(4)).parts.map((p) => parseSrt(p.content).cues.map((c) => c.number)), [["1", "2"], ["1", "2"]]));
  it("preserves multiline text, spaces and literal subtitle markup", () => {
    const doc = source([[0, 1000], [2000, 3000]], () => "  <i>First line</i>\nSecond line  ");
    assert.deepEqual(split(doc).parts.map((p) => parseSrt(p.content).cues[0].text), doc.cues.map((c) => c.text));
  });
  it("preserves Unicode and non-English captions", () => assert.equal(parseSrt(split(source([[0, 1000], [2000, 3000]], () => "字幕 مرحبا café 🎬")).parts[1].content).cues[0].text, "字幕 مرحبا café 🎬"));
  for (const eol of ["\n", "\r\n"]) it(`serializes all parts using ${eol === "\n" ? "LF" : "CRLF"}`, () => {
    for (const part of split(source([[0, 1000], [2000, 3000]], undefined, eol)).parts) {
      assert.equal(part.content.includes("\r\n"), eol === "\r\n");
      assert.equal(parseSrt(part.content).cues.length, 1);
    }
  });
  it("reads UTF-8 BOM without damaging captions", () => {
    const text = "\uFEFF" + document(2).source;
    assert.equal(split(parseSplitSource({ name: "bom.srt", size: bytes(text).byteLength }, bytes(text))).parts.length, 2);
  });
  it("reuses BOM-aware UTF-16 decoding", () => {
    const data = Buffer.from("\uFEFF" + document(2).source, "utf16le");
    assert.equal(split(parseSplitSource({ name: "utf16.srt", size: data.length }, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))).parts.length, 2);
  });
  it("preserves valid positioning settings", () => {
    const doc = parseSrt(document(2).source.replace(/(--> \S+)/g, "$1 X1:10 X2:20 Y1:30 Y2:40"));
    for (const part of split(doc).parts) assert.match(part.content, /X1:10 X2:20 Y1:30 Y2:40/);
  });
  it("creates padded filenames and safe archive names", () => {
    assert.deepEqual(split(document(3), "parts", "3").parts.map((p) => p.filename), ["interview-part-01.srt", "interview-part-02.srt", "interview-part-03.srt"]);
    assert.equal(splitFilename("字幕.SRT", 1, 100), "字幕-part-001.srt");
    assert.equal(splitFilename("../interview.srt", 1, 2), "interview-part-01.srt");
    assert.equal(splitArchiveFilename("interview.srt"), "interview-parts.zip");
  });
  it("serializes every output to exactly its calculated cues and timestamps", () => {
    for (const method of ["parts", "cues", "time"]) {
      const result = split(intervalSource, method, method === "time" ? "10" : "2", "zero");
      for (const part of result.parts) assert.deepEqual(parseSrt(part.content).cues.map(({ start, end, text }) => ({ start, end, text })), part.cues.map(({ start, end, text }) => ({ start, end, text })));
    }
  });
});

describe("plain-language validation", () => {
  it("identifies malformed source by filename and cue", () => assert.throws(() => parseSplitSource({ name: "broken.srt", size: 40 }, bytes("14\ninvalid time\nSubtitle\n")), /broken.srt: Cue 14/));
  it("rejects empty and no-cue sources", () => {
    assert.throws(() => parseSplitSource({ name: "empty.srt", size: 0 }, bytes("")), /empty/);
    assert.throws(() => parseSplitSource({ name: "none.srt", size: 12 }, bytes("No subtitles")), /No valid subtitles/);
  });
  it("rejects wrong type and oversized input", () => {
    assert.throws(() => parseSplitSource({ name: "video.mp4", size: 50 }, bytes("")), /\.srt/);
    assert.throws(() => parseSplitSource({ name: "large.srt", size: MAX_FILE_BYTES + 1 }, bytes("")), /10 MB/);
  });
  it("explains a one-cue source", () => assert.throws(() => split(document(1)), /only one subtitle cue/));
  it("rejects invalid parts, counts and intervals", () => {
    for (const method of ["parts", "cues", "time"]) for (const value of ["", "abc", "-1", "0", "Infinity", "1e5", "999999999999999999999"]) assert.throws(() => parseSplitValue(method, value));
    assert.throws(() => parseSplitValue("parts", "1"));
    for (const method of ["parts", "cues"]) assert.throws(() => parseSplitValue(method, "2.5"), /whole number/);
    assert.throws(() => parseSplitValue("time", "0.0001"), /three decimal/);
    assert.throws(() => parseSplitValue("time", "6000"), /5999.999/);
  });
  it("does not mutate the document or options", () => {
    const doc = document(4), options = { method: "parts", value: "2", timestamps: "zero" };
    const before = JSON.stringify({ doc, options }); splitSrt(doc, "file.srt", options);
    assert.equal(JSON.stringify({ doc, options }), before);
  });
});

describe("real ZIP output", () => {
  it("contains every expected filename with exactly the serialized part contents", () => {
    for (const method of ["parts", "cues", "time"]) {
      const result = split(intervalSource, method, method === "time" ? "10" : "2", "zero", "字幕.srt");
      const files = unzipSync(new Uint8Array(createSplitZip(result)));
      assert.deepEqual(Object.keys(files), result.parts.map((p) => p.filename));
      for (const part of result.parts) assert.equal(strFromU8(files[part.filename]), part.content);
    }
  });
});
