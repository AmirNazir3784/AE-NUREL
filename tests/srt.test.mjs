import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adjustCue, adjustedFilename, decodeSrt, formatTimestamp, MAX_TIMESTAMP_MS, parseOffset, parseSrt, parseTimestamp, shiftSrt, validateSrtFile } from "../src/lib/srt.ts";

const sample = "1\n00:00:01,500 --> 00:00:03,000\nHello world\nSecond line\n\n07\n00:01:00,000 --> 00:01:02,250\n<i>Goodbye!</i>\n";

describe("SRT parsing and source preservation", () => {
  it("reads cue counts, original numbers, and multiline text", () => {
    const document = parseSrt(sample);
    assert.equal(document.cues.length, 2);
    assert.equal(document.cues[1].number, "07");
    assert.equal(document.cues[0].text, "Hello world\nSecond line");
    assert.equal(document.cues[0].start, 1500);
  });
  it("changes only timestamps, preserving LF text and numbering", () => {
    assert.equal(shiftSrt(parseSrt(sample), 1250).content, sample.replace("00:00:01,500", "00:00:02,750").replace("00:00:03,000", "00:00:04,250").replace("00:01:00,000", "00:01:01,250").replace("00:01:02,250", "00:01:03,500"));
  });
  it("preserves CRLF, BOM, whitespace separators, timing spaces and position settings", () => {
    const source = "\uFEFF001\r\n 00:00:01,500  -->  00:00:03,000 X1:10 X2:20 Y1:30 Y2:40\r\n  Keep spaces  \r\nNext line\r\n \t\r\n";
    const document = parseSrt(source);
    assert.equal(shiftSrt(document, 0).content, source);
    assert.equal(shiftSrt(document, 500).content, source.replace("00:00:01,500", "00:00:02,000").replace("00:00:03,000", "00:00:03,500"));
  });
  it("preserves mixed line endings and no trailing newline", () => {
    const source = sample.replace("1\n", "1\r\n").trimEnd();
    assert.equal(shiftSrt(parseSrt(source), 0).content, source);
  });
  it("accepts Unicode, literal markup, arrows, numeric text and overlapping cues", () => {
    const source = "9\n00:00:03,000 --> 00:00:05,000\nこんにちは <b>café</b> →\n42\n\n10\n00:00:04,000 --> 00:00:06,000\nOverlap";
    assert.equal(shiftSrt(parseSrt(source), 0).content, source);
  });
  it("rejects empty, non-SRT, and malformed or partially malformed files", () => {
    for (const source of ["", "\uFEFF \n", "plain text", "1\nwrong timestamp\ntext", "1\n00:99:00,000 --> 00:99:01,000\ntext", "1\n00:00:05,000 --> 00:00:01,000\ntext", "1\n00:00:00,000 --> 00:00:01,000", sample + "\nBAD", sample + "\n3\nbad time\ntext", "1\n00:00:00,000 --> 00:00:01,000\ntext\n2\n00:00:02,000 --> 00:00:03,000\nnext", sample + "\0"]) {
      assert.throws(() => parseSrt(source), Error, source);
    }
  });
});

describe("timing offsets", () => {
  it("accepts signed decimals and millisecond precision", () => {
    for (const [value, expected] of [["0", 0], ["0.5", 500], ["1.25", 1250], ["-2.5", -2500], [" +1.001 ", 1001], [".5", 500], ["-0.001", -1]]) assert.equal(parseOffset(value), expected);
  });
  it("rejects invalid, empty, excessive precision and huge offsets", () => {
    for (const value of ["", " ", "no", "NaN", "Infinity", "1e3", "1,25", "1.0001", "100000000000000000", "360000", "-360000"]) assert.throws(() => parseOffset(value));
  });
  it("clamps earlier timestamps to zero and reports affected cues", () => {
    const result = shiftSrt(parseSrt(sample), -2500);
    assert.equal(result.clampedCues, 1);
    assert.ok(result.content.includes("00:00:00,000 --> 00:00:00,500"));
    assert.ok(result.content.includes("00:00:57,500 --> 00:00:59,750"));
  });
  it("handles large negative offsets without negative timestamps", () => {
    const document = parseSrt(sample);
    assert.equal(shiftSrt(document, -MAX_TIMESTAMP_MS).clampedCues, 2);
    for (const cue of document.cues) assert.deepEqual(adjustCue(cue, -MAX_TIMESTAMP_MS), { start: 0, end: 0, clamped: true });
  });
  it("allows the timestamp limit and rejects overflow", () => {
    const document = parseSrt("1\n99:59:58,000 --> 99:59:59,000\nEnd");
    assert.ok(shiftSrt(document, 999).content.includes("99:59:59,999"));
    assert.throws(() => shiftSrt(document, 1000), /smaller positive offset/);
    assert.throws(() => shiftSrt(document, NaN));
  });
  it("carries milliseconds across seconds, minutes and hours", () => {
    assert.equal(formatTimestamp(parseTimestamp("00:59:59,750") + 500), "01:00:00,250");
    assert.equal(formatTimestamp(0), "00:00:00,000");
    assert.equal(formatTimestamp(MAX_TIMESTAMP_MS), "99:59:59,999");
    for (const value of [-1, Infinity, 1.5, MAX_TIMESTAMP_MS + 1]) assert.throws(() => formatTimestamp(value));
  });
  it("produces descriptive filenames", () => {
    assert.equal(adjustedFilename("movie.en.SRT", 1250), "movie.en-later-1.25s.srt");
    assert.equal(adjustedFilename("movie.srt", -2500), "movie-earlier-2.5s.srt");
    assert.equal(adjustedFilename("movie.srt", 0), "movie-adjusted.srt");
  });
});

describe("file validation and encoding", () => {
  it("validates extension, empty files and size without relying on unreliable SRT MIME types", () => {
    validateSrtFile({ name: "subtitles.SRT", size: 100 });
    for (const file of [{ name: "file.txt", size: 100 }, { name: "file.srt.exe", size: 100 }, { name: "file.srt", size: 0 }, { name: "file.srt", size: 10 * 1024 * 1024 + 1 }]) assert.throws(() => validateSrtFile(file));
  });
  it("decodes UTF-8 and BOM-marked UTF-16 LE and BE", () => {
    assert.equal(decodeSrt(new TextEncoder().encode(sample).buffer), sample);
    const le = Buffer.from("\uFEFF" + sample, "utf16le");
    const be = Buffer.from(le).swap16();
    for (const bytes of [le, be]) assert.equal(decodeSrt(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), "\uFEFF" + sample);
    assert.throws(() => decodeSrt(new Uint8Array([0xff, 0xfa, 0xfc]).buffer), /encoding/);
  });
});
