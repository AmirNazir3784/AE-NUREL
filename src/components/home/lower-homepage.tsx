import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { autoCaptionVisible } from "@/lib/caption-release";
import { EditingNotes } from "./editing-notes";
import styles from "./lower-homepage.module.css";

const questions = [
  ["Which tools can I use now?", "Edit, sync and convert subtitles, compress or crop a video, remove a green-screen background, or transcribe recorded speech. Each tool page lists its supported files and current limits."],
  ["Do I need an account for the subtitle tools?", "No. The current subtitle editing, timing and format-conversion tools are free to use without an account."],
  ["Which subtitle formats are supported?", "The editor, sync fixer and overlap fixer accept SRT and VTT. Other tools handle specific conversions, including ASS/SSA, SBV, TXT and JSON. Choose the tool for your input and the output you need."],
  ["Are my subtitle files uploaded?", "Your subtitle contents are not sent to AENural servers by the subtitle tools. Read the privacy policy for the details of each workflow."],
  ["Can I use Source Window yet?", "Source Window is still in development. Its product page explains what is coming; the available free tools can be used now."],
];

export function LowerHomepage() {
  return <div className={styles.lower} data-home-refinement>
    <section className={styles.subtitleSection} id="home-subtitles" aria-labelledby="home-subtitle-heading">
      <div className={styles.featureInner}>
        <div className={styles.featureCopy}>
          <span className={styles.eyebrow}><i />Free subtitle tools</span>
          <h2 id="home-subtitle-heading">Edit, sync<br />and <em>keep creating.</em></h2>
          <p>Fix a line, shift the timing or convert your subtitle file. Take care of the small details without starting your edit again.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/tools/srt-editor">Edit your subtitles <span aria-hidden="true">↗</span></Link><Link className={styles.secondary} href="/tools/subtitle-tools">All subtitle tools <span aria-hidden="true">→</span></Link></div>
          <p className={styles.smallNote}>SRT &amp; VTT editing. No account required.</p>
        </div>
        <figure className={styles.visual} aria-label="Illustrative subtitle timing example">
          <figcaption className={styles.visualLabel}><Icon name="subtitle" size={17} />A SMALL TIMING FIX</figcaption>
          <div className={styles.subtitleLine}><span>00:01</span><p>Let’s make the next edit</p></div>
          <div className={styles.subtitleLine}><span>00:03</span><p>a little easier.</p></div>
          <div className={styles.timeline} aria-hidden="true"><i /><i /><i /><b /><b /></div>
          <div className={styles.visualFoot}><span>Example subtitles</span><strong>Words + timing</strong></div>
        </figure>
      </div>
      <nav className={styles.quickLinks} aria-label="More subtitle tools"><Link href="/tools/srt-timing-adjuster">Adjust timing ↗</Link><Link href="/tools/srt-merger">Merge subtitles ↗</Link><Link href="/tools/srt-splitter">Split subtitles ↗</Link><Link href="/tools/srt-to-vtt">SRT to VTT ↗</Link></nav>
    </section>

    <section className={styles.audioSection} id="home-audio" aria-labelledby="home-audio-heading">
      <div className={`${styles.featureInner} ${styles.visualFirst}`}>
        <figure className={`${styles.visual} ${styles.audioVisual}`} aria-label="Illustrative audio-to-transcript workflow">
          <figcaption className={styles.visualLabel}><Icon name="audio" size={17} />AUDIO → TRANSCRIPT</figcaption>
          <div className={styles.wave} aria-hidden="true">{[18,30,22,46,60,38,70,48,24,52,68,40,58,32,18,44,28,16].map((height,index)=><i key={index} style={{height}} />)}</div>
          <div className={styles.transcript}><span>EXAMPLE TRANSCRIPT</span><p>“Let’s make the next edit a little easier.”</p></div>
          <div className={styles.files}><span>TXT</span><span>SRT</span><span>VTT</span></div>
        </figure>
        <div className={styles.featureCopy}>
          <span className={styles.eyebrow}><i />Audio to text</span>
          <h2 id="home-audio-heading">Turn audio<br />into <em>editable text.</em></h2>
          <p>Transcribe interviews, lessons and voice recordings. Review the draft, then download your transcript or timed subtitles.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/tools/free-audio-to-text-converter-online">Convert audio to text <span aria-hidden="true">↗</span></Link><Link className={styles.secondary} href="/blog/convert-audio-to-text-online-free">Read the guide <span aria-hidden="true">→</span></Link></div>
          <p className={styles.smallNote}>TXT for notes. SRT or VTT for captions.</p>
          {autoCaptionVisible() && <Link className={styles.previewLink} href="/tools/auto-caption-generator">Explore the Caption Studio preview <span aria-hidden="true">→</span></Link>}
        </div>
      </div>
    </section>

    <section className={styles.videoSection} id="home-video" aria-labelledby="home-video-heading">
      <div className={styles.featureInner}>
        <div className={styles.featureCopy}>
          <span className={styles.eyebrow}><i />Video tools</span>
          <h2 id="home-video-heading">A better frame.<br /><em>A smaller file.</em></h2>
          <p>Crop for your next post, reduce a large file or replace a green-screen background. Make the adjustment and get back to your video.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/tools/video-cropper">Crop your video <span aria-hidden="true">↗</span></Link><Link className={styles.secondary} href="/tools/video-compressor">Compress a video <span aria-hidden="true">→</span></Link></div>
          <Link className={styles.textLink} href="/tools/free-green-screen-remover">Remove a green screen <span aria-hidden="true">→</span></Link>
        </div>
        <figure className={styles.visual} aria-label="Illustration of a vertical crop within a landscape frame">
          <figcaption className={styles.visualLabel}><Icon name="video" size={17} />MAKE ROOM FOR YOUR FRAME</figcaption>
          <div className={styles.cropScene} aria-hidden="true"><div className={styles.sceneSun} /><div className={styles.sceneHill} /><div className={styles.cropFrame}><i /><i /><i /><i /><span>9:16</span></div></div>
          <div className={styles.visualFoot}><span>Example framing</span><strong>Landscape → portrait</strong></div>
        </figure>
      </div>
    </section>

    <div className={styles.wrap}>
      <EditingNotes />
      <section className={styles.workflow} aria-labelledby="home-workflow-heading">
        <header><span className={styles.eyebrow}>From file to finished</span><h2 id="home-workflow-heading">Three steps.<br /><em>Back to your edit.</em></h2></header>
        <ol>{[
          ["01", "Choose your tool", "Start with the task you need to finish."],
          ["02", "Make the adjustment", "Add your file, edit and review the result."],
          ["03", "Save your work", "Download the file for your next step."],
        ].map(([number,title,description])=><li key={number}><span className={styles.stepNumber}>{number}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
      </section>

      <section className={styles.guides} aria-labelledby="home-guides-heading">
        <header className={styles.compactHead}><div><span className={styles.eyebrow}>Practical guides</span><h2 id="home-guides-heading">Get unstuck.<br /><em>Keep editing.</em></h2></div><Link className={styles.textLink} href="/blog">All articles <span aria-hidden="true">→</span></Link></header>
        <div className={styles.guideList}>{[
          ["Formats", "SRT or VTT? Choose the format your player needs.", "/blog/srt-vs-vtt-subtitle-formats"],
          ["Troubleshooting", "Subtitles out of sync? Find the right fix.", "/blog/fix-subtitles-out-of-sync"],
          ["Transcription", "How to turn an audio recording into text.", "/blog/convert-audio-to-text-online-free"],
        ].map(([category,title,href],index)=><Link href={href} key={href}><span className={styles.guideNumber}>0{index+1}</span><div><span>{category}</span><h3>{title}</h3></div><span aria-hidden="true">↗</span></Link>)}</div>
      </section>

      <section className={styles.faq} id="faq" aria-labelledby="home-faq-heading"><header><span className={styles.eyebrow}>A few useful answers</span><h2 id="home-faq-heading">Before you get started.</h2><p>More questions? Visit <Link href="/help">Help</Link> or read our <Link href="/privacy">privacy policy</Link>.</p></header><div>{questions.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    </div>

    <section className={styles.finalCta} aria-labelledby="home-final-heading"><span className={styles.eyebrow}>Your next edit starts here</span><h2 id="home-final-heading">Less friction.<br /><em>More creating.</em></h2><p>Find the right tool for the job in front of you.</p><div className={styles.actions}><Link className={styles.primary} href="/tools">Explore the tools <span aria-hidden="true">↗</span></Link><Link className={styles.secondary} href="/source-window">Meet Source Window <span aria-hidden="true">→</span></Link></div></section>
  </div>;
}
