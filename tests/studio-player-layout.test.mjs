import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
describe("Caption Studio player + guidance visual structure",()=>{
  const ui = read("src/features/caption-studio/caption-studio.tsx");
  const controls = read("src/features/caption-studio/preview-audio-controls.tsx");
  const css = read("src/features/caption-studio/studio.module.css");
  const guidance = read("src/features/caption-studio/studio-guidance.tsx");
  const page = read("src/app/tools/auto-caption-generator/page.tsx");
  it("places volume, seek and fullscreen together inside the video player",()=>{
    const transport = ui.slice(ui.indexOf("<div className={styles.transport}>"),ui.indexOf("</div>",ui.indexOf("<div className={styles.transport}>")));
    assert.match(transport,/aria-label="Video timeline"/);
    assert.match(transport,/<PreviewAudioControls/);
    assert.match(transport,/Fullscreen preview/);
    assert.ok(transport.indexOf("Video timeline") < transport.indexOf("PreviewAudioControls"));
    assert.ok(transport.indexOf('<PreviewAudioControls') < transport.indexOf('Fullscreen preview'));
  });
  it("uses the site's orange action color for both player sliders",()=>{
    assert.match(css,/background:linear-gradient\(to right,var\(--action\)/);
    assert.match(css,/\.previewAudio input\[type=range\]/);
    assert.match(controls,/--range-fill/);
    assert.match(ui,/--range-fill/);
  });
  it("provides a larger, spacious and icon-free title",()=>{
    assert.match(ui,/<h1>Auto Caption Generator<\/h1>/);
    assert.ok(!ui.includes('<Icon name="subtitle"'));
    assert.match(css,/font-size:clamp\(31px,3\.8vw,48px\)/);
  });
  it("clips two readable lines per timeline row and avoids overflowing caption cards",()=>{
    assert.match(css,/-webkit-line-clamp:2/);
    assert.match(css,/\.cueList > button > div \{ min-width:0; flex:1; overflow:hidden/);
    assert.match(ui,/aria-label="Caption timeline"/);
  });
  it("adds directly relevant guidance, FAQ and privacy caveats beneath the tool",()=>{
    assert.match(page,/<StudioGuidance \/>/);
    assert.match(guidance,/Frequently asked questions/);
    assert.match(guidance,/Your video remains on your device/);
    assert.match(guidance,/Private server transcription mode/);
    assert.match(guidance,/supports videos up to 2 minutes/);
    assert.match(guidance,/captioned MP4 or WebM/);
  });
});
