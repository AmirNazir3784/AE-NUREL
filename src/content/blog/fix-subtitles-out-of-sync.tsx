import shared from "@/components/blog/blog.module.css";
import styles from "./subtitle-sync-article.module.css";
import Image from "next/image";
import type { ReactNode } from "react";

export const articleIntroduction = "To fix subtitles that are out of sync, compare a clear line near the beginning, middle and end of your video. Shift every cue if the error stays constant. Use two reference points if it grows steadily. If timing suddenly jumps after an edit, correct that section instead of stretching the whole file.";

function GuideScreenshot({file,width,height,alt,markers,children}:{file:string;width:number;height:number;alt:string;markers:readonly [number,number,number][];children:ReactNode}) {
  return <figure className={styles.screenshot}>
    <div className={styles.screenshotScroll} role="region" aria-label={`${alt} — scroll sideways on a narrow screen`} tabIndex={0}>
      <div className={styles.screenshotCanvas}>
        <Image src={`/images/blog/subtitle-sync/${file}`} width={width} height={height} alt={alt} unoptimized />
        {markers.map(([number,left,top])=><span key={number} className={styles.marker} style={{left:`${left}%`,top:`${top}%`}} aria-hidden="true">{number}</span>)}
      </div>
    </div>
    <figcaption>{children}<a href={`/images/blog/subtitle-sync/${file}`}>Open the full-size screenshot</a></figcaption>
  </figure>;
}

export default function SubtitleSyncArticle() {
  return <div data-blog-content="subtitle-sync">
    <section id="diagnose-the-pattern" className={shared.section}>
      <h2>Identify the timing pattern before changing anything</h2>
      <p>Keep an untouched copy of your subtitle file and use the exact video export you plan to deliver. A transcript timed against an earlier edit may no longer match the finished cut. You do not need to rewrite correct dialogue to repair its timestamps.</p>
      <p>Choose three short lines with an unmistakable beginning, preferably after a pause. Note the subtitle start time and when the corresponding speech actually starts. Avoid overlapping voices or a repeated phrase that could lead you to measure the wrong line.</p>
      <div className={styles.diagnosis} aria-label="Choose a subtitle timing correction">
        <a href="#fix-a-constant-delay"><span>Same error throughout</span><strong>Shift the timestamps</strong><small>Example: always 1.5 seconds early</small></a>
        <a href="#fix-gradual-drift"><span>Error grows steadily</span><strong>Use two reference points</strong><small>Example: aligned first, increasingly late</small></a>
        <a href="#fix-a-sudden-jump"><span>Error changes suddenly</span><strong>Repair the affected section</strong><small>Example: fine until a removed scene</small></a>
      </div>
      <p>A mixed pattern can contain both an initial delay and drift. Two measurements describe a straight-line correction; the middle checkpoint tests whether that model is appropriate. Matching two endpoints alone does not prove that everything between them is correct.</p>
    </section>

    <section id="fix-a-constant-delay" className={shared.section}>
      <h2>Fix subtitles that are always early or late</h2>
      <p>A constant offset moves every cue by the same amount. Both the start and end of each caption move together, preserving its duration. The <a href="https://aegisub.org/docs/latest/shift_times/">Aegisub shift-times documentation</a> describes the same basic operation, including applying a shift to selected lines.</p>
      <div className={styles.equation}><span>Calculate the correction</span><code>speech start − subtitle start = shift</code></div>
      <p>For an illustrative example, suppose speech begins at 12.000 seconds and its subtitle begins at 10.500 seconds. The correction is +1.500 seconds: move the subtitle later. If the subtitle begins at 13.500 seconds instead, move it 1.500 seconds earlier.</p>
      <ol className={styles.instructions}>
        <li>Open AENural&apos;s <a href="/tools/srt-timing-adjuster">SRT Timing Adjuster</a> and choose your SRT file.</li>
        <li>Select <strong>Later</strong> when captions appear before the speech, or <strong>Earlier</strong> when they appear after it.</li>
        <li>Enter the amount in <strong>Seconds</strong>. For the first example, choose Later and enter 1.5.</li>
        <li>Inspect the timing preview, download the adjusted SRT, and test it with your video.</li>
      </ol>
      <GuideScreenshot file="shift-controls.png" width={742} height={320} alt="AENural SRT Timing Adjuster with Later selected and 1.5 entered in Seconds" markers={[[1,36,30],[2,96,45]]}>
        <strong>Set a fixed delay</strong><p><b>1.</b> Choose Later for early captions. <b>2.</b> Enter 1.5 in Seconds to move every cue 1.5 seconds later. Choose Earlier for the opposite correction.</p>
      </GuideScreenshot>
      <p>Check direction labels rather than assuming every application uses the same sign convention. For VTT, AENural&apos;s <a href="/tools/subtitle-sync-fixer">Subtitle Sync Fixer</a> accepts VTT as well as SRT; setting two reference points to the same offset produces a constant shift.</p>
      <aside className={shared.example}><p><strong>Watch the beginning:</strong> moving captions earlier can push timestamps before zero. Inspect warnings and the first few cues instead of assuming every caption can retain its original duration.</p></aside>
    </section>

    <section id="fix-gradual-drift" className={shared.section}>
      <h2>Fix captions that gradually drift out of sync</h2>
      <p>If one shift fixes the opening but the ending remains wrong, measure two widely separated cues. A two-point correction changes the timing scale and offset together. It is useful when the error changes approximately steadily, but it cannot reliably repair missing scenes or irregularly mistimed lines.</p>
      <p>In AENural&apos;s Subtitle Sync Fixer, upload the subtitle file, then choose an <strong>Early reference</strong> and a <strong>Late reference</strong>. For each, enter the existing <strong>Subtitle time</strong> and when it <strong>Should appear at</strong> in your video. Select <strong>Fix sync</strong>, review the correction, and download the corrected file.</p>
      <p>The screenshots below use an illustrative three-cue SRT. Enter the same times to follow the worked example, or replace them with measurements from your own video. On a narrow screen, scroll the screenshots sideways to read the controls.</p>
      <GuideScreenshot file="early-reference.png" width={938} height={244} alt="Subtitle Sync Fixer early reference: subtitle time 00:00:20,000 and should appear at 00:00:22,000" markers={[[1,2,50],[2,50,50]]}>
        <strong>Step 1 — Match an early line</strong><p><b>1.</b> Keep the selected cue&apos;s original Subtitle time at 00:00:20,000. <b>2.</b> Enter 00:00:22,000 under Should appear at. This line needs to move two seconds later.</p>
      </GuideScreenshot>
      <GuideScreenshot file="late-reference.png" width={938} height={308} alt="Subtitle Sync Fixer late reference: subtitle time 00:10:20,000, should appear at 00:10:28,000, and Fix sync button" markers={[[3,2,40],[4,50,40],[5,23,89]]}>
        <strong>Step 2 — Match a later line and apply</strong><p><b>3.</b> Use the later cue&apos;s original time, 00:10:20,000. <b>4.</b> Set its correct video time to 00:10:28,000. <b>5.</b> Select Fix sync. This reference needs an eight-second correction, so one fixed shift cannot match both lines.</p>
      </GuideScreenshot>
      <GuideScreenshot file="correction-result.png" width={942} height={366} alt="Actual correction summary showing plus 2.0 seconds, plus 5.0 seconds and plus 8.0 seconds, with Download corrected SRT enabled" markers={[[6,97,11],[7,98,85]]}>
        <strong>Step 3 — Review, download and check playback</strong><p><b>6.</b> Review the early, middle and late correction amounts. <b>7.</b> Download corrected SRT. The summary confirms the applied calculation; replay the file with your video to judge actual synchronization.</p>
      </GuideScreenshot>
      <figure className={styles.workedExample}>
        <figcaption><strong>Illustrative timing worksheet</strong><span>These invented timestamps demonstrate the calculation; they are not a performance test.</span></figcaption>
        <div className={styles.tableScroll} role="region" aria-label="Timing worksheet" tabIndex={0}>
          <table><thead><tr><th scope="col">Checkpoint</th><th scope="col">Subtitle starts</th><th scope="col">Speech starts</th><th scope="col">Required shift</th></tr></thead><tbody>
            <tr><th scope="row">Early reference</th><td>00:00:20,000</td><td>00:00:22,000</td><td>+2 seconds</td></tr>
            <tr><th scope="row">Middle check</th><td>00:05:20,000</td><td>00:05:25,000</td><td>+5 seconds</td></tr>
            <tr><th scope="row">Late reference</th><td>00:10:20,000</td><td>00:10:28,000</td><td>+8 seconds</td></tr>
          </tbody></table>
        </div>
      </figure>
      <p>The subtitle reference interval is 600 seconds; the corresponding video interval is 606 seconds. Their ratio is 1.01. In this example, the mapping is <code>new time = old time × 1.01 + 1.8 seconds</code>. It maps 20 to 22, 320 to 325, and 620 to 628 seconds. A constant +2-second shift would fix only the first reference.</p>
      <p>You do not need to calculate the ratio to enter two reference points. The example explains why choosing the correct spoken moments matters. If the middle line fails after correction, recheck your measurements and whether the video contains an edit. For a separate editor with multiple sync points, see <a href="https://subtitleedit.github.io/subtitleedit/features/point-sync.html">Subtitle Edit&apos;s Point Sync documentation</a>.</p>
    </section>

    <section id="fix-a-sudden-jump" className={shared.section}>
      <h2>Fix a sudden timing jump after a cut</h2>
      <p>When subtitles match until one scene and then become consistently early or late, inspect the video around that transition. An inserted intro, removed passage or different cut can change the required offset for only part of the file. Do not stretch correct earlier captions to compensate.</p>
      <p>Find the first incorrect cue and compare it with the last correct one. If the dialogue still matches, shift only the affected range in an editor that supports selection-based timing changes. AENural&apos;s <a href="/tools/srt-editor">Subtitle Editor</a> lets you inspect and correct individual cue times. For a large selected range, Aegisub&apos;s documented shift operation is another option.</p>
      <p>If dialogue is missing, reordered or belongs to a different version, obtain subtitles for the matching cut or rebuild that section against your final video. Subtitle Edit&apos;s <a href="https://www.nikse.dk/se/">synchronization help</a> specifically discusses added or removed scenes and adjusting smaller parts. No single global offset can recreate missing dialogue.</p>
    </section>

    <section id="avoid-wrong-fixes" className={shared.section}>
      <h2>Avoid fixes that change the wrong thing</h2>
      <h3>Do not guess a frame-rate conversion</h3>
      <p>SRT stores clock timestamps, rather than a frame number for each cue. The <a href="https://www.loc.gov/preservation/digital/formats/fdd/fdd000569.shtml">Library of Congress SRT format description</a> documents its start/end time structure. A different frame-rate label alone does not tell you how much to retime subtitles. Measure the actual dialogue positions; investigate speed changes only when the timing evidence supports them.</p>
      <h3>Do not convert formats to repair timing</h3>
      <p>Changing SRT to VTT changes the file representation, not the relationship between dialogue and timestamps. Repair sync first, then use the delivery format your player or platform requires. Keep the corrected source file so you can compare later exports.</p>
      <h3>Do not edit the wrong caption track</h3>
      <p>Check whether you are viewing the corrected external subtitle file, an embedded track, or captions already burned into the picture. Editing an SRT cannot change text that is part of the video image. Reload your chosen track after saving, and disable any old player delay before judging the corrected file.</p>
    </section>

    <section id="check-the-result" className={shared.section}>
      <h2>Check the result before sharing</h2>
      <ul className={styles.checklist}>
        <li>Replay the opening, a middle passage and the ending with the corrected subtitle file.</li>
        <li>Check both caption starts and ends, including short replies and lines after silence.</li>
        <li>Inspect cues around cuts, timestamps near zero, and any timing warnings.</li>
        <li>Confirm the dialogue, punctuation and intended captions remain present.</li>
        <li>Test the actual delivery player or platform; keep the original and corrected files separately.</li>
      </ul>
      <p>If a problem appears only after seeking or in one player, test the same video and subtitle in another player before repeatedly changing the file. That comparison helps distinguish a playback issue from a repeatable timestamp error; it does not establish the cause by itself.</p>
      <aside className={styles.nextAction}><strong>Choose the smallest correction that fits</strong><p>Use a single shift for a fixed SRT delay, or two measured references for steady drift. Keep section-specific problems separate.</p><a className={shared.primaryAction} href="/tools/subtitle-sync-fixer">Open Subtitle Sync Fixer <span aria-hidden="true">→</span></a></aside>
    </section>

    <section id="subtitle-sync-questions" className={shared.section}>
      <h2>Subtitle sync questions</h2>
      <div className={shared.faq}>
        <details><summary><h3>Why do I keep changing the subtitle delay?</h3></summary><p>If the required delay grows as the video continues, a fixed shift is not enough. Measure separated cues and test a two-point correction. If the delay jumps after one scene, inspect that section instead. The pattern identifies an appropriate next step, not a guaranteed cause.</p></details>
        <details><summary><h3>Can I fix timing without transcribing again?</h3></summary><p>Yes, when the dialogue text already matches your video. A shift or two-point correction changes timestamps while retaining the words. Missing dialogue, rearranged scenes or inaccurate text still need editing. Keep a backup and check the corrected file against the final video.</p></details>
        <details><summary><h3>Why does the corrected file look wrong in my player?</h3></summary><p>Check that the player loaded the new file and has no extra delay applied. Then compare the same cue in another player. An old track, a playback setting or an incorrect timing correction can each produce a mismatch; changing the timestamps again before checking these can compound the error.</p></details>
      </div>
    </section>
  </div>;
}
