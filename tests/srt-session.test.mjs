import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStepProgress, initialSession, sessionReducer } from "../src/features/srt-timing-adjuster/session.ts";
import { adjustedFilename, parseOffset, parseSrt, shiftSrt } from "../src/lib/srt.ts";

const first = {
  name: "first.srt",
  size: 95,
  document: parseSrt("7\n00:00:01,000 --> 00:00:03,000\nFirst file\nSecond line"),
};
const second = {
  name: "second.srt",
  size: 150,
  document: parseSrt("1\n00:00:10,000 --> 00:00:12,000\nNew file\n\n2\n00:00:13,000 --> 00:00:14,000\nNew second cue"),
};
const upload = (state, file) => sessionReducer(
  sessionReducer(state, { type: "upload-started" }),
  { type: "upload-succeeded", uploaded: file },
);
const output = (state) => shiftSrt(state.uploaded.document, parseOffset(state.value));
const progress = (state, outputReady = !!state.uploaded) => getStepProgress({
  hasFile: !!state.uploaded,
  busy: state.busy,
  outputReady,
  downloaded: !!state.downloadMessage,
});

describe("SRT tool session regressions", () => {
  it("starts with zero, no messages and only the upload step active", () => {
    assert.equal(initialSession.value, "0");
    assert.equal(initialSession.uploaded, null);
    assert.equal(initialSession.fileError, "");
    assert.equal(initialSession.downloadMessage, "");
    assert.deepEqual(progress(initialSession), ["active", "pending", "pending"]);
  });

  it("makes a fresh valid upload immediately valid at offset zero", () => {
    const state = upload(initialSession, first);
    assert.equal(state.value, "0");
    assert.equal(state.busy, false);
    assert.equal(state.fileError, "");
    assert.equal(parseOffset(state.value), 0);
    assert.equal(output(state).content, first.document.source);
    assert.equal(output(state).clampedCues, 0);
    assert.deepEqual(progress(state), ["complete", "complete", "active"]);
  });

  it("replaces an invalid offset atomically with a valid zero-offset new file", () => {
    const invalid = sessionReducer(upload(initialSession, first), { type: "offset-changed", value: "" });
    assert.throws(() => parseOffset(invalid.value));
    assert.deepEqual(progress(invalid, false), ["complete", "active", "pending"]);
    const replacement = upload(invalid, second);
    assert.equal(replacement.value, "0");
    assert.doesNotThrow(() => output(replacement));
    assert.equal(output(replacement).content, second.document.source);
    assert.equal(replacement.fileError, "");
  });

  it("replaces file metadata, preview source and output without old content or warnings", () => {
    let state = upload(initialSession, first);
    state = sessionReducer(state, { type: "offset-changed", value: "-5" });
    assert.equal(output(state).clampedCues, 1);
    state = sessionReducer(state, { type: "download-started", message: "Download started: first-earlier-5s.srt" });
    state = sessionReducer(state, { type: "error", message: "Previous error" });
    state = upload(state, second);
    assert.equal(state.uploaded.name, "second.srt");
    assert.equal(state.uploaded.size, 150);
    assert.equal(state.uploaded.document.cues.length, 2);
    assert.equal(state.uploaded.document.cues[0].text, "New file");
    assert.equal(state.value, "0");
    assert.equal(state.fileError, "");
    assert.equal(state.downloadMessage, "");
    assert.equal(output(state).clampedCues, 0);
    assert.doesNotMatch(output(state).content, /First file/);
    assert.equal(adjustedFilename(state.uploaded.name, parseOffset(state.value)), "second-adjusted.srt");
  });

  it("Start Over clears the complete session, including after a pending read", () => {
    let state = upload(initialSession, first);
    state = sessionReducer(state, { type: "offset-changed", value: "-5" });
    state = sessionReducer(state, { type: "download-started", message: "Download started" });
    state = sessionReducer(state, { type: "error", message: "Failed replacement" });
    state = sessionReducer(state, { type: "upload-started" });
    state = sessionReducer(state, { type: "reset" });
    assert.deepEqual(state, initialSession);
    assert.deepEqual(progress(state), ["active", "pending", "pending"]);
    assert.equal(state.uploaded, null);
  });

  it("marks download complete and clears completion when the offset changes", () => {
    let state = upload(initialSession, first);
    state = sessionReducer(state, { type: "download-started", message: "Download started" });
    assert.deepEqual(progress(state), ["complete", "complete", "complete"]);
    state = sessionReducer(state, { type: "offset-changed", value: "1.25" });
    assert.equal(state.downloadMessage, "");
    assert.deepEqual(progress(state), ["complete", "complete", "active"]);
    assert.match(output(state).content, /00:00:02,250 --> 00:00:04,250/);
  });

  it("does not report old output as ready during replacement processing", () => {
    const state = sessionReducer(upload(initialSession, first), { type: "upload-started" });
    assert.equal(state.busy, true);
    assert.deepEqual(progress(state), ["active", "pending", "pending"]);
    assert.equal(state.downloadMessage, "");
  });

  it("keeps the last good file and the specific error when a replacement fails", () => {
    const message = "Cue 3 has an invalid timestamp line.";
    let state = sessionReducer(upload(initialSession, first), { type: "upload-started" });
    state = sessionReducer(state, { type: "upload-failed", message });
    assert.equal(state.uploaded, first);
    assert.equal(state.busy, false);
    assert.equal(state.fileError, message);
    assert.equal(output(state).content, first.document.source);
  });
});
