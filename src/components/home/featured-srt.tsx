import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";

export function FeaturedSrt() {
  return (
    <section className="homepage-section featured-section" aria-labelledby="featured-title">
      <div className="container featured-grid">
        <div className="featured-example" role="img" aria-label="Illustrative timing example: shifting subtitles one and a half seconds later changes 00:00:12,000 to 00:00:13,500.">
          <div className="example-top"><span><IconTile name="srt-timing" />Subtitle timing</span><span className="badge neutral">Illustrative example</span></div>
          <div className="example-offset"><span>Shift all subtitles by</span><strong>+1.5 <small>seconds</small></strong><span className="example-direction">A little later. Back in sync.</span></div>
          <div className="example-cue"><div className="example-times"><div><span>Original</span><strong>00:00:12,000</strong></div><Icon name="arrow" size={20} /><div><span>Adjusted</span><strong>00:00:13,500</strong></div></div><p>Right words. Right moment.</p></div>
          <div className="example-ready"><Icon name="check" size={16} />Ready for your next playback</div>
        </div>
        <div className="featured-copy"><span className="eyebrow">Featured tool</span><h2 id="featured-title">Good subtitles.<br />Better timing.</h2><p>When the words arrive before the voice—or a beat too late—one small adjustment makes a big difference.</p><ul className="feature-checks">{["Shift every subtitle timestamp at once", "Preview your changes before downloading", "Apply changes to the whole file at once"].map((benefit) => <li key={benefit}><Icon name="check" size={18} />{benefit}</li>)}</ul><Link href="/tools/srt-timing-adjuster" className="button button-primary">Open SRT Timing Adjuster<Icon name="arrow" size={18} /></Link></div>
      </div>
    </section>
  );
}
