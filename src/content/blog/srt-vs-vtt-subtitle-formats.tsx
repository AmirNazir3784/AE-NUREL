import shared from "@/components/blog/blog.module.css";
import styles from "./subtitle-formats-article.module.css";
import Link from "next/link";
import { ArticleFaqs } from "@/components/blog/editorial-draft";

export const articleIntroduction = "Choose SRT when your editor, client or upload form requests a SubRip file. Choose VTT for native HTML video tracks. YouTube accepts both, with formatting limits. Neither format makes the words more accurate: choose for the destination, then check the exported captions against the exact video you will publish.";

const srtExample = `1
00:00:01,250 --> 00:00:03,750
Keep the original subtitle file.

2
00:00:04,000 --> 00:00:06,500
Check the exported captions.`;
const vttExample = `WEBVTT

00:00:01.250 --> 00:00:03.750
Keep the original subtitle file.

00:00:04.000 --> 00:00:06.500
Check the exported captions.`;

export default function SubtitleFormatsArticle() {
  return <div data-blog-content="subtitle-formats" className={styles.article}>
    <section id="choose-for-the-destination" className={shared.section}>
      <h2>Start with where the captions will play</h2>
      <p>Check the receiver&apos;s accepted extension, encoding and styling requirements. A valid file can still be unsuitable for a particular upload form.</p>
      <div className={styles.choices}>
        <a href="#compare-the-files"><span>Native HTML video track</span><strong>Choose VTT</strong><small>The track element reads WebVTT.</small></a>
        <a href="#convert-without-surprises"><span>An SRT delivery request</span><strong>Choose SRT</strong><small>Match the requested deliverable.</small></a>
        <a href="#youtube-and-web-video"><span>YouTube upload</span><strong>Either, with limits</strong><small>Check the platform&apos;s supported features.</small></a>
      </div>
    </section>

    <section id="compare-the-files" className={shared.section}>
      <h2>The same two captions, written two ways</h2>
      <p>SRT means SubRip Subtitle; WebVTT means Web Video Text Tracks. Both original samples contain identical words and millisecond timings.</p>
      <div className={styles.samples}>
        <figure><figcaption><strong>SRT</strong><span>Numbered cue blocks</span></figcaption><pre tabIndex={0} aria-label="SRT subtitle example"><code>{srtExample}</code></pre><a href="/blog/srt-vs-vtt-subtitle-formats/sample.srt" download>Download sample SRT</a></figure>
        <figure><figcaption><strong>VTT</strong><span>Header and period timestamps</span></figcaption><pre tabIndex={0} aria-label="WebVTT subtitle example"><code>{vttExample}</code></pre><a href="/blog/srt-vs-vtt-subtitle-formats/sample.vtt" download>Download sample VTT</a></figure>
      </div>
      <p>WebVTT requires the <code>WEBVTT</code> signature and uses a period before milliseconds. Its cue identifiers are optional; a numeric identifier can be valid, so removing numbers is not the defining conversion step. The <a href="https://www.w3.org/TR/webvtt1/#syntax">W3C WebVTT syntax specification</a> defines these rules.</p>
      <p>SRT convention uses a number, a start/end timestamp line, the caption text and a blank separator. The <a href="https://loc.gov/preservation/digital/formats/fdd/fdd000569.shtml">Library of Congress SRT description</a> also notes that SRT is not well standardized. Keep conventional formatting when you need reliable interchange.</p>
    </section>

    <section id="practical-differences" className={shared.section}>
      <h2>SRT vs VTT: the differences that affect delivery</h2>
      <div className={styles.tableScroll} role="region" aria-label="Subtitle format comparison, scroll horizontally if needed" tabIndex={0}>
        <table><caption>Format capabilities and receiving-player limitations</caption><thead><tr><th scope="col">Check</th><th scope="col">SRT</th><th scope="col">VTT</th></tr></thead><tbody>
          <tr><th scope="row">File opening</th><td>Starts with the first numbered cue.</td><td>Starts with WEBVTT and a header separator.</td></tr>
          <tr><th scope="row">Timestamp</th><td><code>00:00:01,250</code></td><td><code>00:00:01.250</code></td></tr>
          <tr><th scope="row">Text encoding</th><td>No single format-wide standard; UTF-8 is a useful delivery choice.</td><td>UTF-8 is required.</td></tr>
          <tr><th scope="row">Appearance</th><td>Some readers support basic HTML-like tags; results vary.</td><td>Supports cue settings and CSS styling, subject to player support.</td></tr>
          <tr><th scope="row">Extra information</th><td>No equivalent general WebVTT block structure.</td><td>Can include NOTE comments, STYLE and REGION blocks.</td></tr>
          <tr><th scope="row">Native HTML track</th><td>Requires another import/conversion mechanism.</td><td>The expected timed-text file format.</td></tr>
        </tbody></table>
      </div>
    </section>

    <section id="youtube-and-web-video" className={shared.section}>
      <h2>What to choose for YouTube and your own website</h2>
      <h3>YouTube: basic SRT is a straightforward option</h3>
      <p><a href="https://support.google.com/youtube/answer/2734698?hl=en">YouTube&apos;s supported caption-file documentation</a> accepts basic SRT saved as plain UTF-8 and says SRT styling markup is not recognized. It also lists WebVTT, with positioning support and limited styling. These upload rules were checked on 4 November 2026.</p>
      <h3>Your own native HTML video: use VTT</h3>
      <p>The native HTML <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track">track element</a> references WebVTT. Serve the file as <code>text/vtt</code> at a reachable URL. Custom players may offer additional import mechanisms; follow the destination&apos;s requirements.</p>
    </section>

    <section id="convert-without-surprises" className={shared.section}>
      <h2>Convert without losing something you need</h2>
      <ol className={styles.checklist}>
        <li>Open <a href="/tools/srt-to-vtt">AENural&apos;s SRT to VTT converter</a>, select <strong>Choose SRT file</strong> and load sample.srt.</li>
        <li>Check <strong>VTT ready</strong> and the converted count: the sample contains two subtitles. Read any warning.</li>
        <li>Select <strong>Download VTT</strong>. Open the result and compare both cue times and sentences with the sample above.</li>
      </ol>
      <p>For the reverse direction, use <a href="/tools/vtt-to-srt">VTT to SRT</a>, choose your VTT and select <strong>Download SRT</strong> after conversion. Keep the original separately.</p>
      <aside className={styles.lossExample}>
        <h3>A positioning detail can disappear</h3>
        <p>An illustrative VTT timing line might end with <code>line:10%</code>. That setting carries layout information beyond the two times. A basic SRT export can keep the words and timings while dropping the position. The captions may then appear in the player&apos;s default location.</p>
      </aside>
    </section>

    <section id="check-your-delivery" className={shared.section}>
      <h2>A short delivery check beats guessing</h2>
      <ol className={styles.checklist}>
        <li><strong>Compare the contents.</strong> Check cue count, opening and closing times, line breaks and words against the original. Look at accented letters and non-Latin text too.</li>
        <li><strong>Inspect the receiving player.</strong> Confirm the captions are selectable, visible and readable. Check placement around names or other important graphics.</li>
        <li><strong>Use the final video.</strong> Replay the opening, middle and end. A valid file can still belong to an older edit.</li>
        <li><strong>Keep an editable master.</strong> Name exports clearly so later corrections come from one reviewed version rather than several diverging copies.</li>
      </ol>
      <p>An SRT converter is for changing formats; timing errors need a separate repair. Follow the separate <Link href="/blog/fix-subtitles-out-of-sync">guide to fixing subtitle delay, drift and cuts</Link> to identify the pattern before adjusting cues.</p>
    </section>

    <ArticleFaqs slug="srt-vs-vtt-subtitle-formats" id="format-questions" />
  </div>;
}
