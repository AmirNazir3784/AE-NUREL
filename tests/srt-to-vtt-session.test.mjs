import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openSrtConversion } from "../src/lib/srt-to-vtt.ts";
import { parseVtt } from "../src/lib/subtitle-editor.ts";
import { conversionSessionReducer as reduce, initialConversionSession, serializeConversionSession } from "../src/features/srt-to-vtt/session.ts";

function conversion(name = "interview.srt", caption = "First caption.\n字幕 مرحبا 🎬", start = "00:00:05,250") {
  const bytes = new TextEncoder().encode(`12\n${start} --> 00:00:08,500\n${caption}\n`);
  return { conversion: openSrtConversion({ name, size: bytes.byteLength }, bytes.buffer), size: bytes.byteLength };
}
const ready = () => reduce(reduce(initialConversionSession, { type: "read", id: 1 }), { type: "ready", id: 1, ...conversion() });

describe("SRT converter session and download path", () => {
  it("starts empty without warnings, errors or stale output", () => {
    assert.equal(initialConversionSession.conversion, null);
    assert.equal(initialConversionSession.error, "");
    assert.equal(initialConversionSession.downloaded, false);
  });
  it("valid upload immediately provides a ready conversion without an extra action", () => {
    const state = ready(); assert.equal(state.busy, false); assert.equal(state.error, ""); assert.equal(state.conversion.filename, "interview.vtt");
  });
  it("uploaded source → session → serializer → Blob is the exact converted download", async () => {
    const state = ready();
    const blob = new Blob([serializeConversionSession(state)], { type: "text/vtt;charset=utf-8" });
    assert.equal(await blob.text(), "WEBVTT\n\n00:00:05.250 --> 00:00:08.500\nFirst caption.\n字幕 مرحبا 🎬\n");
    const cues = parseVtt(await blob.text()).cues;
    assert.equal(cues.length, 1); assert.equal(cues[0].start, 5250); assert.equal(cues[0].end, 8500); assert.equal(cues[0].identifier, "");
    assert.equal(cues[0].text, state.conversion.source.cues[0].text);
  });
  it("replacement clears the old source/output/size/success while reading", () => {
    const state = reduce(reduce(ready(), { type: "download" }), { type: "read", id: 2 });
    assert.equal(state.conversion, null); assert.equal(state.size, 0); assert.equal(state.downloaded, false); assert.equal(state.busy, true); assert.equal(state.error, "");
    assert.throws(() => serializeConversionSession(state), /valid SRT/);
  });
  it("replacement download Blob contains only the current file", async () => {
    const state = reduce(reduce(ready(), { type: "read", id: 2 }), { type: "ready", id: 2, ...conversion("replacement.srt", "New text", "00:00:02,001") });
    const content = await new Blob([serializeConversionSession(state)]).text();
    assert.equal(state.conversion.filename, "replacement.vtt");
    assert.ok(content.includes("00:00:02.001")); assert.ok(content.includes("New text")); assert.ok(!content.includes("First caption"));
  });
  it("replacement removes old metadata warnings", () => {
    const first = conversion(); first.conversion.warnings = ["Old warning"];
    const state = reduce(reduce(reduce(initialConversionSession, { type: "read", id: 1 }), { type: "ready", id: 1, ...first }), { type: "read", id: 2 });
    assert.deepEqual(reduce(state, { type: "ready", id: 2, ...conversion() }).conversion.warnings, []);
  });
  it("rejected replacement clears previous conversion and guards stale reads", () => {
    const state = reduce(ready(), { type: "rejected", id: 2, message: "Choose an .srt subtitle file." });
    assert.equal(state.conversion, null); assert.equal(state.busy, false); assert.match(state.error, /\.srt/);
    assert.equal(reduce(state, { type: "ready", id: 1, ...conversion() }), state);
  });
  it("malformed replacement never restores the previous output", () => {
    const state = reduce(reduce(ready(), { type: "read", id: 2 }), { type: "failed", id: 2, message: "broken.srt: Cue 1 has invalid timing." });
    assert.equal(state.conversion, null); assert.equal(state.size, 0); assert.equal(state.busy, false); assert.match(state.error, /broken.srt/);
  });
  it("Start Over resets source, preview, warnings, success, error and processing", () => assert.deepEqual(reduce(reduce(ready(), { type: "download" }), { type: "reset", id: 9 }), { ...initialConversionSession, requestId: 9 }));
  it("stale async successes and failures cannot restore replaced/reset state", () => {
    for (const state of [reduce(ready(), { type: "read", id: 2 }), reduce(ready(), { type: "reset", id: 3 })]) {
      assert.equal(reduce(state, { type: "ready", id: 1, ...conversion("old.srt") }), state);
      assert.equal(reduce(state, { type: "failed", id: 1, message: "Old failure" }), state);
    }
  });
  it("download cannot run in absent, busy or errored state", () => {
    for (const state of [initialConversionSession, reduce(ready(), { type: "read", id: 2 }), reduce(ready(), { type: "error", message: "Retry." })]) {
      assert.throws(() => serializeConversionSession(state), /valid SRT/);
      assert.equal(reduce(state, { type: "download" }), state);
    }
  });
  it("download serialization validates the current converted state", () => {
    const state = ready(); state.conversion.content = "Old uploaded source";
    assert.throws(() => serializeConversionSession(state), /download no longer matches/);
  });
});
