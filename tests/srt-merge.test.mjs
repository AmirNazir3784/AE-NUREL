import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TIMESTAMP_MS, parseSrt } from "../src/lib/srt.ts";
import { MAX_MERGE_BYTES, mergeSrt, parseMergeGap, parseMergeSource, serializeMergedSrt, validateMergeSelection } from "../src/lib/srt-merge.ts";

const source = (name, content) => ({ name, document: parseSrt(content) });
const first = source("part-1.srt", "27\n00:01:27,000 --> 00:01:30,000\nFirst part\n");
const second = source("part-2.srt", "009\n00:00:02,000 --> 00:00:05,000\nNext part\nSecond line\n\n42\n00:00:06,250 --> 00:00:08,500\nLast words\n");
const third = source("part-3.srt", "100\n00:00:01,000 --> 00:00:03,000\nFinal part\n");
const times = (result) => result.cues.map(({ start, end }) => [start, end]);
const bytes = (text) => new TextEncoder().encode(text).buffer;

describe("sequential SRT merging", () => {
  it("joins two files with zero gap and preserves the second file's non-zero lead-in", () => {
    const result = mergeSrt([first, second], 0);
    assert.deepEqual(times(result), [[87000, 90000], [92000, 95000], [96250, 98500]]);
    assert.deepEqual(result.parts.map((part) => part.offset), [0, 90000]);
    assert.equal(result.parts[1].first.start, 92000);
    assert.equal(result.parts[0].last.end, 90000);
  });
  it("chains three files from the cumulative merged end", () => {
    const result = mergeSrt([first, second, third], 0);
    assert.deepEqual(times(result), [[87000, 90000], [92000, 95000], [96250, 98500], [99500, 101500]]);
    assert.deepEqual(result.parts.map((part) => part.offset), [0, 90000, 98500]);
  });
  it("applies the same integer gap at every boundary", () => {
    assert.deepEqual(times(mergeSrt([first, second, third], parseMergeGap("2"))), [[87000, 90000], [94000, 97000], [98250, 100500], [103500, 105500]]);
  });
  it("uses exact decimal millisecond gaps without drift", () => {
    assert.deepEqual(times(mergeSrt([first, second, third], parseMergeGap("0.125"))), [[87000, 90000], [92125, 95125], [96375, 98625], [99750, 101750]]);
  });
  it("renumbers unusual and conflicting source cue numbers sequentially", () => {
    const result = mergeSrt([second, second], 0);
    assert.deepEqual(result.cues.map((cue) => cue.number), ["1", "2", "3", "4"]);
    assert.deepEqual(parseSrt(serializeMergedSrt(result)).cues.map((cue) => cue.number), ["1", "2", "3", "4"]);
  });
  it("preserves multiline captions and produces deterministic valid output", () => {
    assert.equal(serializeMergedSrt(mergeSrt([first, second], 0)), "1\n00:01:27,000 --> 00:01:30,000\nFirst part\n\n2\n00:01:32,000 --> 00:01:35,000\nNext part\nSecond line\n\n3\n00:01:36,250 --> 00:01:38,500\nLast words\n");
  });
  it("uses the maximum end, even when the last listed cue ends earlier", () => {
    const unordered = source("out-of-order.srt", first.document.source + "\n99\n00:00:10,000 --> 00:00:20,000\nEarlier\n");
    const result = mergeSrt([unordered, third], 0);
    assert.equal(result.parts[0].last.end, 90000);
    assert.equal(result.parts[1].first.start, 91000);
  });
  it("changing file order changes the resulting timing and text", () => {
    const result = mergeSrt([second, first], 0);
    assert.deepEqual(times(result), [[2000, 5000], [6250, 8500], [95500, 98500]]);
    assert.equal(result.cues[0].text, "Next part\nSecond line");
    assert.equal(result.cues[2].number, "3");
  });
  it("supports ten files and rejects fewer than two or more than ten", () => {
    const short = source("short.srt", "1\n00:00:00,000 --> 00:00:01,000\nShort\n");
    assert.equal(mergeSrt(Array(10).fill(short), 0).cues.at(-1).end, 10000);
    for (const count of [0, 1, 11]) assert.throws(() => mergeSrt(Array(count).fill(short), 0), /2 and 10/);
  });
  it("allows duplicate filenames as separate ordered sources", () => {
    const result = mergeSrt([first, { ...third, name: first.name }], 0);
    assert.equal(result.parts.length, 2);
    assert.deepEqual(result.cues.map((cue) => cue.text), ["First part", "Final part"]);
  });
  it("supports LF/CRLF, BOM and mixed source endings with a consistent output", () => {
    const crlf = source("windows.srt", "\uFEFF" + first.document.source.replace(/\n/g, "\r\n"));
    const output = serializeMergedSrt(mergeSrt([crlf, second], 0));
    assert.ok(output.includes("Next part\r\nSecond line"));
    assert.ok(!/(?<!\r)\n/.test(output));
    assert.deepEqual(times({ cues: parseSrt(output).cues }), times(mergeSrt([first, second], 0)));
    assert.ok(!serializeMergedSrt(mergeSrt([second, crlf], 0)).includes("\r"));
  });
  it("preserves Unicode, non-English text, literal markup and spaces", () => {
    const unicode = source("words.srt", "001\n00:00:00,250 --> 00:00:01,500\n  مرحبًا 世界 café <b>שלום</b>  \nहैलो\n");
    assert.equal(parseSrt(serializeMergedSrt(mergeSrt([first, unicode], 0))).cues[1].text, unicode.document.cues[0].text);
  });
  it("preserves optional cue-position settings", () => {
    const positioned = source("position.srt", "1\n00:00:00,000 --> 00:00:01,000 X1:10 X2:20 Y1:30 Y2:40\nPositioned\n");
    const output = serializeMergedSrt(mergeSrt([first, positioned], 0));
    assert.ok(output.includes("00:01:30,000 --> 00:01:31,000 X1:10 X2:20 Y1:30 Y2:40"));
    assert.equal(parseSrt(output).cues.length, 2);
  });
  it("rejects cumulative overflow with the responsible filename", () => {
    const long = source("long.srt", "1\n99:59:58,000 --> 99:59:59,000\nLong\n");
    const short = source("short.srt", "1\n00:00:00,000 --> 00:00:00,999\nShort\n");
    assert.equal(mergeSrt([long, short], 0).cues[1].end, MAX_TIMESTAMP_MS);
    assert.throws(() => mergeSrt([long, short], 1), /short.srt.*99:59:59,999/);
  });
  it("rejects invalid gaps, negatives, extreme values and excess precision", () => {
    for (const input of ["", " ", "abc", "-1", "NaN", "Infinity", "1e3", "1,5", "0.0001", "360000", "99999999999999999"]) assert.throws(() => parseMergeGap(input), /gap/);
    for (const gap of [-1, NaN, Infinity, 0.5, MAX_TIMESTAMP_MS + 1]) assert.throws(() => mergeSrt([first, second], gap), /gap/);
    assert.equal(parseMergeGap("0"), 0);
    assert.equal(parseMergeGap(" .5 "), 500);
  });
});

describe("merge file validation", () => {
  it("identifies the filename and cue when a source is malformed", () => {
    const text = "14\n00:00:xx,000 --> 00:00:03,000\nBad\n";
    assert.throws(() => parseMergeSource({ name: "part-2.srt", size: 100 }, bytes(text)), /part-2.srt: Cue 14.*invalid timestamp/);
  });
  it("rejects wrong type, empty, oversized, no-cue and partially malformed files", () => {
    for (const [name, size, text] of [["wrong.txt", 100, first.document.source], ["empty.srt", 0, ""], ["blank.srt", 3, " \n"], ["large.srt", 10 * 1024 * 1024 + 1, first.document.source], ["plain.srt", 10, "not subtitles"], ["partial.srt", 100, first.document.source + "\n4\nbad time\nText"]]) {
      assert.throws(() => parseMergeSource({ name, size }, bytes(text)), (error) => error.message.startsWith(name + ":"));
    }
  });
  it("decodes UTF-8 BOM and BOM-marked UTF-16 without damaging text", () => {
    const text = "\uFEFF" + first.document.source.replace("First part", "你好 مرحبًا");
    for (const buffer of [Buffer.from(text, "utf8"), Buffer.from(text, "utf16le"), Buffer.from(text, "utf16le").swap16()]) {
      const parsed = parseMergeSource({ name: "unicode.srt", size: buffer.length }, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      assert.equal(parsed.document.cues[0].text, "你好 مرحبًا");
    }
  });
  it("enforces the count and total size before reading files", () => {
    validateMergeSelection(Array(9).fill({ size: 1 }), [{ size: 1 }]);
    validateMergeSelection([{ size: MAX_MERGE_BYTES - 1 }], [{ size: 1 }]);
    assert.throws(() => validateMergeSelection(Array(10).fill({ size: 1 }), [{ size: 1 }]), /No files were added/);
    assert.throws(() => validateMergeSelection([{ size: MAX_MERGE_BYTES }], [{ size: 1 }]), /50 MB/);
  });
});
