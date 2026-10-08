import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialMergeSession, mergeSessionReducer as reduce } from "../src/features/srt-merger/session.ts";
import { parseSrt } from "../src/lib/srt.ts";

const row = (id, status = "reading") => ({ id, name: `part-${id}.srt`, size: 100, status, ...(status === "ready" ? { document: parseSrt("7\n00:00:00,000 --> 00:00:01,000\nText") } : status === "invalid" ? { error: "Invalid timestamp" } : {}) });
const added = () => reduce(initialMergeSession, { type: "add", files: [row(1), row(2), row(3)] });

describe("multi-file merge sessions", () => {
  it("starts with a valid zero gap and keeps selection order regardless of read order", () => {
    let state = added();
    for (const id of [3, 1, 2]) state = reduce(state, { type: "resolve", file: row(id, "ready") });
    assert.equal(state.gap, "0");
    assert.deepEqual(state.files.map((file) => file.id), [1, 2, 3]);
    assert.ok(state.files.every((file) => file.status === "ready"));
  });
  it("retains an invalid row among valid rows so a partial failure stays visible", () => {
    let state = added();
    for (const id of [1, 3]) state = reduce(state, { type: "resolve", file: row(id, "ready") });
    state = reduce(state, { type: "resolve", file: row(2, "invalid") });
    assert.deepEqual(state.files.map((file) => file.status), ["ready", "invalid", "ready"]);
  });
  it("supports up/down and drag order without mutating previous state", () => {
    const original = added();
    const moved = reduce(original, { type: "move", id: 3, direction: -1 });
    assert.deepEqual(moved.files.map((file) => file.id), [1, 3, 2]);
    assert.deepEqual(reduce(moved, { type: "reorder", source: 2, target: 1 }).files.map((file) => file.id), [2, 1, 3]);
    assert.deepEqual(original.files.map((file) => file.id), [1, 2, 3]);
    assert.equal(reduce(original, { type: "move", id: 1, direction: -1 }), original);
  });
  it("replacement changes only its slot and ignores a stale read for the old file", () => {
    const state = reduce(added(), { type: "replace", id: 2, file: row(4) });
    assert.deepEqual(state.files.map((file) => file.id), [1, 4, 3]);
    assert.equal(reduce(state, { type: "resolve", file: row(2, "ready") }), state);
  });
  it("removed files cannot reappear when their read finishes", () => {
    const state = reduce(added(), { type: "remove", id: 2 });
    assert.equal(reduce(state, { type: "resolve", file: row(2, "ready") }), state);
    assert.deepEqual(state.files.map((file) => file.id), [1, 3]);
  });
  it("reset clears files, gap, errors and download state and ignores pending reads", () => {
    let state = reduce(added(), { type: "gap", value: "1.25" });
    state = reduce(state, { type: "error", message: "Bad selection" });
    state = reduce(state, { type: "download" });
    state = reduce(state, { type: "reset" });
    assert.deepEqual(state, { files: [], gap: "0", error: "", downloaded: false });
    assert.equal(reduce(state, { type: "resolve", file: row(1, "ready") }), state);
  });
  it("a settings or ordering change clears the previous download success", () => {
    const state = reduce(added(), { type: "download" });
    for (const action of [{ type: "gap", value: "0.5" }, { type: "move", id: 2, direction: -1 }, { type: "remove", id: 3 }, { type: "replace", id: 2, file: row(4) }, { type: "add", files: [row(4)] }]) assert.equal(reduce(state, action).downloaded, false);
  });
});
