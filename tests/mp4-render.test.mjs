import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rendererHarness } from "./mp4-render-harness.mjs";
import { prepareSubtitleVideo, activeCaption } from "../src/lib/subtitle-video.ts";
import { fixture } from "./conversion-helpers.mjs";
const settings = { resolution: "480", background: "black" };
const plan = prepareSubtitleVideo(fixture("video.srt"));
describe("MP4 rendering lifecycle (mock canvas/encoder, not playback evidence)", () => {
  it("preserves every exact interval, blank gaps and the final caption, reserving front metadata", async () => {
    const h = rendererHarness(), progress = [];
    await h.render(plan, settings, new AbortController().signal, value => progress.push(value));
    assert.equal(h.frames.length, plan.boundaries.length - 1);
    for (const [i, frame] of h.frames.entries()) {
      assert.equal(frame.start * 1000, plan.boundaries[i]);
      assert.ok(Math.abs(frame.duration * 1000 - (plan.boundaries[i + 1] - plan.boundaries[i])) < 1e-8);
      assert.equal(frame.text, activeCaption(plan, plan.boundaries[i]));
    }
    assert.match(h.frames.at(-1).text, /Second line stays readable/);
    assert.equal(h.outputs[0].config.format.fastStart, "reserve");
    assert.equal(h.outputs[0].metadata.maximumPacketCount, h.frames.length);
    assert.equal(progress.at(-1), 100);
    assert.deepEqual([h.canvases[0].width, h.canvases[0].height], [0, 0]);
  });
  it("releases a canvas after a failed fit, before creating an encoder", async () => {
    const h = rendererHarness({ impossibleFit: true });
    await assert.rejects(h.render(plan, settings, new AbortController().signal, () => {}), /fit/);
    assert.equal(h.outputs.length, 0);
    assert.deepEqual([h.canvases[0].width, h.canvases[0].height], [0, 0]);
  });
  it("allows cancellation during a large preflight and a subsequent successful render", async () => {
    const controller = new AbortController(); let cancel = true;
    const h = rendererHarness({ onYield: () => { if (cancel) controller.abort(); } });
    const large = prepareSubtitleVideo(fixture("video-limit.srt"));
    await assert.rejects(h.render(large, settings, controller.signal, () => {}), { name: "AbortError" });
    assert.equal(h.outputs.length, 0);
    assert.equal(h.canvases[0].width, 0);
    cancel = false;
    await h.render(plan, settings, new AbortController().signal, () => {});
    assert.equal(h.outputs[0].state, "finalized");
  });
  it("cancels the muxer, clears the canvas and renders again after encoding cancellation", async () => {
    const controller = new AbortController();
    const h = rendererHarness({ onAdd: count => { if (count === 2) controller.abort(); } });
    await assert.rejects(h.render(plan, settings, controller.signal, () => {}), { name: "AbortError" });
    assert.equal(h.outputs[0].state, "canceled");
    assert.equal(h.canvases[0].width, 0);
    await h.render(plan, settings, new AbortController().signal, () => {});
    assert.equal(h.outputs[1].state, "finalized");
  });
  it("clears an allocated canvas when its context cannot be created", async () => {
    const h = rendererHarness({ noContext: true });
    await assert.rejects(h.render(plan, settings, new AbortController().signal, () => {}), /canvas/);
    assert.equal(h.canvases[0].width, 0);
  });
});
