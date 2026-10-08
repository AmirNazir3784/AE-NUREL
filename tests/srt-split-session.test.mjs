import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSrt } from "../src/lib/srt.ts";
import { splitSrt } from "../src/lib/srt-split.ts";
import { initialSplitSession, splitSessionReducer as reduce } from "../src/features/srt-splitter/session.ts";

const source = { name: "source.srt", size: 200, document: parseSrt("1\n00:00:02,000 --> 00:00:03,000\nOne\n\n2\n00:00:04,000 --> 00:00:05,000\nTwo\n\n3\n00:00:06,000 --> 00:00:07,000\nThree\n\n4\n00:00:08,000 --> 00:00:09,000\nFour\n") };
const ready = () => reduce(reduce(initialSplitSession, { type: "read", id: 1 }), { type: "ready", id: 1, source });
describe("splitter sessions", () => {
  it("starts a valid upload at two parts with original timestamps and no error", () => {
    const state = ready(); assert.equal(state.error, ""); assert.equal(state.method, "parts"); assert.equal(state.values.parts, "2"); assert.equal(state.timestamps, "original");
    assert.equal(splitSrt(state.source.document, state.source.name, { method: state.method, value: state.values.parts, timestamps: state.timestamps }).parts.length, 2);
  });
  it("replacement resets settings, success and errors and removes the old file during reading", () => {
    let state = reduce(ready(), { type: "timestamps", timestamps: "zero" });
    state = reduce(state, { type: "download", filename: "parts.zip", all: true });
    state = reduce(state, { type: "read", id: 2 }); assert.equal(state.source, null); assert.equal(state.message, "");
    state = reduce(state, { type: "ready", id: 2, source: { ...source, name: "replacement.srt" } });
    assert.equal(state.source.name, "replacement.srt"); assert.equal(state.timestamps, "original"); assert.equal(state.downloadedAll, false);
  });
  it("Start over restores every default and clears the entire session", () => {
    let state = reduce(ready(), { type: "method", method: "time" });
    state = reduce(state, { type: "value", value: "0.5" }); state = reduce(state, { type: "download", filename: "parts.zip", all: true });
    assert.deepEqual(reduce(state, { type: "reset", id: 9 }), { ...initialSplitSession, requestId: 9 });
  });
  it("ignores stale successes and failures after reset or replacement", () => {
    for (const state of [reduce(ready(), { type: "reset", id: 2 }), reduce(ready(), { type: "read", id: 2 })]) {
      assert.equal(reduce(state, { type: "ready", id: 1, source }), state);
      assert.equal(reduce(state, { type: "failed", id: 1, message: "old error" }), state);
    }
  });
  it("changing split method and value produces the right new outputs", () => {
    let state = reduce(ready(), { type: "method", method: "cues" }); state = reduce(state, { type: "value", value: "1" });
    const calculate = (s) => splitSrt(s.source.document, s.source.name, { method: s.method, value: s.values[s.method], timestamps: s.timestamps });
    assert.equal(calculate(state).parts.length, 4);
    state = reduce(state, { type: "method", method: "parts" }); assert.equal(calculate(state).parts.length, 2);
  });
  it("settings changes clear download success and errors", () => {
    const downloaded = reduce(ready(), { type: "download", filename: "parts.zip", all: true });
    for (const action of [{ type: "method", method: "cues" }, { type: "value", value: "3" }, { type: "timestamps", timestamps: "zero" }]) {
      const state = reduce(downloaded, action); assert.equal(state.message, ""); assert.equal(state.downloadedAll, false); assert.equal(state.error, "");
    }
  });
});
