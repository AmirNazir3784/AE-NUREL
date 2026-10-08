import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TIMESTAMP_MS, parseSrt } from "../src/lib/srt.ts";
import { addEditorCue, analyzeEditor, canNudge, deleteEditorCue, editorExportErrors, editorFilename, editorPage, emptyEditor, exportEditor, filterEditorCues, formatEditorTime, nextEditorIssue, nudgeEditorCue, openSubtitle, parseEditorTime, parseVtt, replaceEditorText, shiftEditorCues, updateEditorCue, validateSubtitleFile, visibleCharacterCount } from "../src/lib/subtitle-editor.ts";

const srt = "91\n00:00:02,000 --> 00:00:04,000\nJon is here.\nSecond line.\n\n12\n00:00:06,000 --> 00:00:08,000\nHello 字幕 مرحبا\n";
const vtt = "WEBVTT Sample\n\nNOTE Kept note\n\nSTYLE\n::cue { color: white; }\n\nintro\n00:02.000 --> 00:04.000 align:start position:20%\nJon is here.\nSecond line.\n\n00:00:06.000 --> 00:00:08.000\nHello 字幕 مرحبا\n";
const bytes = (text) => new TextEncoder().encode(text).buffer;
const open = (text = srt, filename = "interview.srt") => openSubtitle({ name: filename, size: bytes(text).byteLength }, bytes(text));
const first = (doc) => doc.cues[0].id;
const times = (doc) => doc.cues.map(({ start, end }) => [start, end]);

describe("subtitle editor input", () => {
  it("opens SRT using the established parser and millisecond state", () => { const doc = open(); assert.equal(doc.format, "srt"); assert.deepEqual(times(doc), [[2000, 4000], [6000, 8000]]); });
  it("opens VTT with a header, identifiers, settings, comments and style blocks", () => { const doc = open(vtt, "interview.vtt"); assert.deepEqual(times(doc), [[2000, 4000], [6000, 8000]]); assert.equal(doc.cues[0].identifier, "intro"); assert.equal(doc.cues[0].vttSettings, "align:start position:20%"); assert.equal(doc.vttBlocks.length, 2); });
  it("rejects empty input", () => assert.throws(() => open(""), /empty/));
  it("rejects a malformed SRT by filename and cue", () => assert.throws(() => open("14\nBad time\nCaption"), /interview.srt: Cue 14/));
  it("rejects malformed VTT headers and timestamps", () => {
    for (const text of ["NOTVTT\n\n00:00:01.000 --> 00:00:02.000\nCaption", "WEBVTT\n00:00:01.000 --> 00:00:02.000\nCaption", "WEBVTT\n\n00:61.000 --> 00:62.000\nCaption", "WEBVTT\n\n00:01.000 --> 00:02,000\nCaption"]) assert.throws(() => open(text, "bad.vtt"), /bad.vtt:/);
  });
  it("never silently ignores a malformed later VTT cue", () => assert.throws(() => open(vtt + "\n\n00:bad --> 00:bad\nBroken", "bad.vtt"), /Cue 3/));
  it("rejects VTT with no cues or a missing blank line between cues", () => {
    assert.throws(() => open("WEBVTT\n\nNOTE No cues\n", "none.vtt"), /No subtitle cues/);
    assert.throws(() => open("WEBVTT\n\n00:01.000 --> 00:02.000\nFirst\n00:03.000 --> 00:04.000\nSecond", "bad.vtt"), /missing blank line/);
  });
  it("preserves Unicode and multiline text", () => assert.deepEqual(open(vtt, "unicode.vtt").cues.map((c) => c.text), open().cues.map((c) => c.text)));
  it("handles LF and CRLF output conventions", () => { for (const format of ["srt", "vtt"]) { const doc = open((format === "srt" ? srt : vtt).replace(/\n/g, "\r\n"), `file.${format}`); assert.equal(exportEditor(doc, format).replace(/\r\n/g, "").includes("\n"), false); } });
  it("handles UTF-8 BOM and UTF-16 LE/BE BOM", () => {
    assert.equal(open("\uFEFF" + srt).cues.length, 2);
    const le = Buffer.from("\uFEFF" + vtt, "utf16le");
    const be = Buffer.from(le); for (let i = 0; i < be.length; i += 2) { const temp = be[i]; be[i] = be[i + 1]; be[i + 1] = temp; }
    for (const data of [le, be]) assert.equal(openSubtitle({ name: "utf16.vtt", size: data.length }, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)).cues[1].text, "Hello 字幕 مرحبا");
  });
  it("rejects unreadable encoding, wrong extensions and oversized input", () => {
    assert.throws(() => openSubtitle({ name: "bad.srt", size: 2 }, Uint8Array.from([0xff, 0xff]).buffer), /encoding/);
    assert.throws(() => validateSubtitleFile({ name: "bad.txt", size: 10 }), /srt or .vtt/);
    assert.throws(() => validateSubtitleFile({ name: "big.srt", size: 10 * 1024 * 1024 + 1 }), /10 MB/);
  });
  it("rejects late STYLE blocks and invalid VTT cue settings", () => {
    assert.throws(() => open(vtt + "\n\nSTYLE\n::cue { color: red; }", "bad.vtt"), /before the first cue/);
    assert.throws(() => open(vtt.replace("align:start", "broken-setting"), "bad.vtt"), /invalid VTT cue setting/);
  });
  it("validates known VTT settings instead of preserving invalid values", () => { for (const invalid of ["align:banana", "size:101%", "position:-2%", "vertical:down", "align:start align:end"]) assert.throws(() => open(vtt.replace("align:start position:20%", invalid), "bad.vtt"), /invalid VTT cue setting/); });
  it("preserves valid VTT line and percentage alignment settings", () => { const settings = "vertical:rl line:-1,end position:20%,line-left size:80% align:center"; assert.equal(open(vtt.replace("align:start position:20%", settings), "file.vtt").cues[0].vttSettings, settings); });
  it("rejects files over the ten-thousand-cue editor limit", () => { const source = Array.from({length: 10001}, (_, i) => `${i + 1}\n00:00:01,000 --> 00:00:02,000\nCaption`).join("\n\n"); assert.throws(() => open(source), /10,000 cues/); });
});

describe("text edits and plain-text find/replace", () => {
  it("edits text immediately without mutating the input", () => { const doc = open(); const next = updateEditorCue(doc, first(doc), "text", "John"); assert.equal(next.cues[0].text, "John"); assert.equal(doc.cues[0].text, "Jon is here.\nSecond line."); });
  it("preserves multiline edits on SRT and VTT export", () => { const doc = open(); const next = updateEditorCue(doc, first(doc), "text", "First\nSecond\nThird"); assert.equal(parseSrt(exportEditor(next, "srt")).cues[0].text, "First\nSecond\nThird"); assert.equal(parseVtt(exportEditor(next, "vtt")).cues[0].text, "First\nSecond\nThird"); });
  it("preserves Unicode and RTL edits", () => { const doc = open(); assert.equal(updateEditorCue(doc, first(doc), "text", "مرحبا 世界 café 🎬").cues[0].text, "مرحبا 世界 café 🎬"); });
  it("finds text case-insensitively without changing it", () => { const doc = open(); assert.deepEqual(filterEditorCues(doc.cues, analyzeEditor(doc.cues), "JON", false), [0]); });
  it("replaces only the first occurrence in source order", () => { const doc = open(srt.replaceAll("Hello", "Jon Jon")); const result = replaceEditorText(doc, "Jon", "John", false); assert.equal(result.count, 1); assert.equal(result.document.cues[1].text, "Jon Jon 字幕 مرحبا"); });
  it("replaces all occurrences across the complete file", () => { const result = replaceEditorText(open(srt.replace("Hello", "Jon Jon")), "Jon", "John", true); assert.equal(result.count, 3); assert.equal(result.document.cues[1].text, "John John 字幕 مرحبا"); });
  it("uses literal replacement strings rather than regex or dollar substitutions", () => { const result = replaceEditorText(open(), "Jon", "$&.*", true); assert.match(result.document.cues[0].text, /^\$&\.\*/); });
  it("replaces multiline and Unicode phrases exactly", () => { const doc = open(); const a = replaceEditorText(doc, "here.\nSecond", "there.\nAnother", true); assert.match(a.document.cues[0].text, /there.\nAnother/); assert.equal(replaceEditorText(doc, "字幕", "世界", true).document.cues[1].text, "Hello 世界 مرحبا"); });
  it("rejects empty find text and avoids no-op history documents", () => { const doc = open(); assert.throws(() => replaceEditorText(doc, "", "x", true), /find first/); assert.equal(replaceEditorText(doc, "absent", "x", true).document, doc); assert.equal(replaceEditorText(doc, "Jon", "Jon", true).document, doc); });
});

describe("timing editing and duration-preserving shifts", () => {
  it("edits start timestamps with normalized milliseconds", () => { const doc = open(); assert.equal(updateEditorCue(doc, first(doc), "start", "00:00:01,250").cues[0].start, 1250); });
  it("edits end timestamps in VTT representation", () => { const doc = open(vtt, "file.vtt"); assert.equal(updateEditorCue(doc, first(doc), "end", "00:00:04.500").cues[0].end, 4500); });
  it("retains malformed drafts for correction and blocks export", () => { const doc = open(); const next = updateEditorCue(doc, first(doc), "start", "oops"); assert.equal(next.cues[0].start, null); assert.equal(next.cues[0].startDraft, "oops"); assert.deepEqual(editorExportErrors(next), [1]); });
  it("flags end equal to or before start", () => { for (const time of ["00:00:02,000", "00:00:01,000"]) { const doc = open(); assert.match(analyzeEditor(updateEditorCue(doc, first(doc), "end", time).cues)[0].errors[0], /End must be later/); } });
  for (const offset of [1000, -1000, 500, -500]) it(`nudges one cue by ${offset / 1000}s without changing duration or other cues`, () => { const doc = open(); const next = nudgeEditorCue(doc, first(doc), offset); assert.deepEqual(times(next), [[2000 + offset, 4000 + offset], [6000, 8000]]); });
  it("disables negative nudges crossing zero instead of shortening the cue", () => { const doc = open(srt.replace("00:00:02,000", "00:00:00,250")); assert.equal(canNudge(doc.cues[0], -500), false); assert.throws(() => nudgeEditorCue(doc, first(doc), -500), /before zero/); });
  it("allows an exact-zero nudge and clears old drafts", () => { const doc = open(); const next = nudgeEditorCue(updateEditorCue(doc, first(doc), "start", "00:00:02,000"), first(doc), -2000); assert.equal(next.cues[0].start, 0); assert.equal(next.cues[0].end, 2000); assert.equal(next.cues[0].startDraft, undefined); });
  it("shifts all cues positively including decimals", () => assert.deepEqual(times(shiftEditorCues(open(), "1.25").document), [[3250, 5250], [7250, 9250]]));
  it("shifts all cues negatively and coherently stops each at zero", () => { const result = shiftEditorCues(open(), "-3"); assert.deepEqual(times(result.document), [[0, 2000], [3000, 5000]]); assert.equal(result.clamped, 1); });
  it("handles extreme negative shifts without negative or zero-duration cues", () => { const result = shiftEditorCues(open(), "-359999.999"); assert.deepEqual(times(result.document), [[0, 2000], [0, 2000]]); assert.equal(result.clamped, 2); });
  it("rejects shift overflow, invalid shift input, and invalid cue times", () => { assert.throws(() => shiftEditorCues(open(), "359999.999"), /beyond/); assert.throws(() => shiftEditorCues(open(), "oops")); const doc = open(); assert.throws(() => shiftEditorCues(updateEditorCue(doc, first(doc), "end", "00:00:00,000"), "1"), /Fix invalid/); });
  it("parses bounded timestamps and rejects negatives, malformed and overflowing values", () => { assert.equal(parseEditorTime("99:59:59,999", "srt"), MAX_TIMESTAMP_MS); assert.equal(formatEditorTime(1250, "vtt"), "00:00:01.250"); for (const time of ["-00:00:01,000", "100:00:00,000", "00:60:00,000", "00:00:99,000", "bad"]) assert.throws(() => parseEditorTime(time, "srt")); });
});

describe("cue creation, deletion and numbering", () => {
  it("adds a sensible first cue with empty text", () => { const doc = addEditorCue(emptyEditor(), "first"); assert.deepEqual(times(doc), [[0, 2000]]); assert.equal(doc.cues[0].text, ""); });
  it("adds below a cue without overlapping either neighbor", () => { const doc = open(); const next = addEditorCue(doc, "new", first(doc)); assert.deepEqual(times(next), [[2000, 4000], [4000, 6000], [6000, 8000]]); });
  it("uses the available shorter gap if two seconds do not fit", () => { const doc = open(srt.replace("00:00:06,000", "00:00:04,500")); assert.deepEqual(times(addEditorCue(doc, "new", first(doc)))[1], [4000, 4500]); });
  it("refuses insertion where no gap exists", () => { const doc = open(srt.replace("00:00:06,000", "00:00:04,000")); assert.throws(() => addEditorCue(doc, "new", first(doc)), /no room/); });
  it("appends a two-second cue after the last end", () => assert.deepEqual(times(addEditorCue(open(), "new")).at(-1), [8000, 10000]));
  it("deletes a cue without retiming the remaining cues", () => { const doc = open(); const next = deleteEditorCue(doc, first(doc)); assert.deepEqual(times(next), [[6000, 8000]]); assert.equal(doc.cues.length, 2); });
  it("renumbers SRT after both deletion and insertion", () => { const doc = open(); let next = addEditorCue(deleteEditorCue(doc, first(doc)), "new"); next = updateEditorCue(next, "new", "text", "Added"); assert.deepEqual(parseSrt(exportEditor(next, "srt")).cues.map((c) => c.number), ["1", "2"]); });
  it("supports an empty editor but blocks empty export", () => { assert.deepEqual(emptyEditor().cues, []); assert.throws(() => exportEditor(emptyEditor(), "srt"), /at least one/); assert.throws(() => shiftEditorCues(emptyEditor(), "1"), /Add a cue/); });
});

describe("issues and readability", () => {
  it("detects overlaps on both affected cues", () => { const issues = analyzeEditor(open(srt.replace("00:00:06,000", "00:00:03,500")).cues); assert.ok(issues[0].warnings.some((s) => s.includes("Overlaps next cue by 0.5s"))); assert.ok(issues[1].warnings.some((s) => s.includes("Overlaps previous cue by 0.5s"))); });
  it("does not flag adjacent cues or ordinary gaps as overlaps", () => { for (const time of ["00:00:04,000", "00:00:06,000"]) assert.ok(analyzeEditor(open(srt.replace("00:00:06,000", time)).cues).every((issue) => !issue.warnings.some((s) => s.includes("Overlaps")))); });
  it("counts visible Unicode characters, removes tags and normalizes whitespace", () => { assert.equal(visibleCharacterCount("<i>A &amp; B</i>\n  🎬"), 7); assert.equal(visibleCharacterCount("&#x1F3AC; &#65; &nbsp;"), 3); });
  it("marks high CPS as fast without treating it as a structural error", () => { const doc = open(); const fast = updateEditorCue(doc, first(doc), "text", "x".repeat(50)); const issue = analyzeEditor(fast.cues)[0]; assert.equal(issue.cps, 25); assert.equal(issue.speed, "fast"); assert.equal(issue.errors.length, 0); });
  it("distinguishes normal and caution CPS", () => { const doc = open(); assert.equal(analyzeEditor(updateEditorCue(doc, first(doc), "text", "x".repeat(34)).cues)[0].speed, "normal"); assert.equal(analyzeEditor(updateEditorCue(doc, first(doc), "text", "x".repeat(38)).cues)[0].speed, "caution"); });
  it("warns about out-of-order times without reordering text", () => { const doc = open(srt.replace("00:00:06,000", "00:00:01,000")); assert.ok(analyzeEditor(doc.cues)[1].warnings.some((s) => s.includes("Starts before"))); assert.equal(doc.cues[0].text, "Jon is here.\nSecond line."); });
  it("structural errors block export and identify the affected cue", () => { const doc = open(); assert.throws(() => exportEditor(updateEditorCue(doc, first(doc), "end", "00:00:01,000"), "srt"), /Fix cue 1/); });
  it("overlap and speed warnings do not block export", () => { const doc = open(srt.replace("00:00:06,000", "00:00:03,500")); assert.equal(parseSrt(exportEditor(updateEditorCue(doc, first(doc), "text", "x".repeat(50)), "srt")).cues.length, 2); });
  it("rejects blank captions, embedded empty lines and nested cue-like text", () => { const doc = open(); for (const text of ["", "One\n\nTwo", "12\n00:00:01,000 --> 00:00:02,000\nOther"]) assert.throws(() => exportEditor(updateEditorCue(doc, first(doc), "text", text), "srt"), /Fix cue 1/); });
});

describe("editor exports", () => {
  it("exports valid sequential SRT with exact times and text", () => { const out = parseSrt(exportEditor(open(), "srt")); assert.deepEqual(out.cues.map((c) => c.number), ["1", "2"]); assert.deepEqual(out.cues.map(({ start, end, text }) => ({ start, end, text })), open().cues.map(({ start, end, text }) => ({ start, end, text }))); });
  it("exports valid VTT with WEBVTT header and dot timestamps", () => { const output = exportEditor(open(), "vtt"); assert.match(output, /^WEBVTT\n\n00:00:02\.000 --> 00:00:04\.000/); assert.deepEqual(times(parseVtt(output)), times(open())); });
  it("preserves VTT identifiers, settings, header and metadata when exporting VTT", () => { const doc = open(vtt, "file.vtt"); const out = parseVtt(exportEditor(doc, "vtt")); assert.equal(out.vttHeader, "WEBVTT Sample"); assert.deepEqual(out.vttBlocks, doc.vttBlocks); assert.equal(out.cues[0].identifier, "intro"); assert.equal(out.cues[0].vttSettings, doc.cues[0].vttSettings); });
  it("preserves SRT positioning on SRT export without leaking it into VTT", () => { const doc = open(srt.replace("00:00:04,000", "00:00:04,000 X1:10 X2:20 Y1:30 Y2:40")); assert.match(exportEditor(doc, "srt"), /X1:10 X2:20 Y1:30 Y2:40/); assert.doesNotMatch(exportEditor(doc, "vtt"), /X1:/); });
  it("does not emit VTT layout settings in SRT timestamps", () => assert.doesNotMatch(exportEditor(open(vtt, "file.vtt"), "srt"), /align:|WEBVTT|NOTE/));
  it("blocks forbidden arrows in VTT payload while allowing literal text in SRT", () => { const doc = open(); const next = updateEditorCue(doc, first(doc), "text", "A --> B"); assert.throws(() => exportEditor(next, "vtt"), /text without -->/); assert.equal(parseSrt(exportEditor(next, "srt")).cues[0].text, "A --> B"); });
  it("blocks out-of-order VTT export without silently reordering SRT", () => { const doc = open(srt.replace("00:00:06,000", "00:00:01,000")); assert.deepEqual(editorExportErrors(doc, "vtt"), [2]); assert.throws(() => exportEditor(doc, "vtt"), /start-time order/); assert.deepEqual(times({ cues: parseSrt(exportEditor(doc, "srt")).cues }), times(doc)); });
  it("creates sensible filenames for opened files and scratch sessions", () => { assert.equal(editorFilename(open(), "srt"), "interview-edited.srt"); assert.equal(editorFilename(open(vtt, "file.VTT"), "srt"), "file-edited.srt"); assert.equal(editorFilename(emptyEditor(), "vtt"), "subtitles-edited.vtt"); });
});

describe("large-file navigation", () => {
  const cues = Array.from({ length: 121 }, (_, index) => ({ id: `cue-${index}`, start: index * 3000, end: index * 3000 + 2000, text: index === 110 ? "Find this name" : "Short", srtSettings: "", vttSettings: "", identifier: "" }));
  it("paginates fifty cues and clamps after removals", () => { const indices = cues.map((_, i) => i); assert.equal(editorPage(indices, 0).indices.length, 50); assert.deepEqual(editorPage(indices, 2).indices, indices.slice(100)); assert.equal(editorPage(indices.slice(0, 40), 9).page, 0); });
  it("searches across non-visible pages", () => assert.deepEqual(filterEditorCues(cues, analyzeEditor(cues), "this name", false), [110]));
  it("finds issues on a non-visible page", () => { const changed = cues.map((cue, i) => i === 110 ? { ...cue, end: cue.start } : cue); assert.deepEqual(filterEditorCues(changed, analyzeEditor(changed), "", true), [110]); });
  it("keeps a focused cue visible while its issue or search match is edited away", () => { assert.deepEqual(filterEditorCues(cues, analyzeEditor(cues), "missing", true, "cue-110"), [110]); assert.deepEqual(filterEditorCues(cues, analyzeEditor(cues), "missing", true), []); });
  it("navigates and wraps through all issue indices", () => { assert.equal(nextEditorIssue([2, 110], -1, 1), 2); assert.equal(nextEditorIssue([2, 110], 2, 1), 110); assert.equal(nextEditorIssue([2, 110], 110, 1), 2); assert.equal(nextEditorIssue([2, 110], 2, -1), 110); assert.equal(nextEditorIssue([], 0, 1), undefined); });
});
