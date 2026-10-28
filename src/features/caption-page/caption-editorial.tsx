import { Fragment, type ReactNode } from "react";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { accountPreviewAvailable } from "@/lib/account-preview";
import { captionCopy } from "./caption-copy";
import { CaptionScene } from "./caption-imagery";

function Copy({ text }: { text: string }) {
  return <>{text.split(/(\*\*.+?\*\*)/g).map((part, i) => <Fragment key={i}>{part.startsWith("**") ? <strong>{part.slice(2, -2)}</strong> : part}</Fragment>)}</>;
}
function Paragraphs({ items }: { items: readonly string[] }) { return <>{items.map(text => <p key={text}><Copy text={text} /></p>)}</>; }
function EditorialSection({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} className="cap-section cap-reveal"><div className="cap-content-inner">{children}</div></section>;
}
function SocialStudy() {
  return <figure className="cap-social-editorial" aria-hidden="true"><div className="cap-social-photo"><CaptionScene scene="reel" /><div className="cap-social-words">Stop.<br />Look.<br /><em>Connect.</em></div><span className="cap-scene-corner" /></div><figcaption><span><i />Your speech</span><span>Your style</span><span>Your story <Icon name="arrow" size={16} /></span></figcaption></figure>;
}
function VideoStoryStudy() {
  return <div className="cap-contact-study" aria-hidden="true"><div className="cap-contact-sheet"><span>THE VIDEO STORY</span><div><i /><i /><i /></div></div><figure className="cap-contact-print"><CaptionScene scene="coast" /><figcaption>A moment.<br /><strong>A meaning.</strong></figcaption></figure><div className="cap-contact-note"><Icon name="subtitle" size={18} /><span>SPEECH → TIMING → CAPTIONS</span></div></div>;
}
function FormatStories() {
  return <div className="cap-format-stories">{[{ name: "Spoken stories", text: "Let the conversation lead.", icon: "audio" }, { name: "Video posts", text: "Make the message readable.", icon: "subtitle" }, { name: "Reels", text: "Keep every line in time.", icon: "video" }].map(item => <div key={item.name}><Icon name={item.icon as "audio" | "subtitle" | "video"} size={25} /><div><span>{item.name}</span><strong>{item.text}</strong></div></div>)}</div>;
}
function WorkflowComparison() {
  return <div className="cap-workflow-pair"><figure><div className="cap-workflow-image"><CaptionScene scene="interview" /><span className="cap-workflow-kicker">ON THE VIDEO</span><div className="cap-workflow-subtitle" aria-hidden="true">Let every <em>word</em> be seen.</div><div className="cap-workflow-wave" aria-hidden="true">{Array.from({ length: 35 }, (_, i) => <i key={i} style={{ height: `${4 + i * 7 % 20}px` }} />)}</div></div><figcaption><div><span><Icon name="video" size={16} />Available in this tool</span><strong>Speech → timed text</strong></div><Icon name="check" size={24} /></figcaption></figure><figure><div className="cap-workflow-image"><CaptionScene scene="forest" /><span className="cap-workflow-kicker">UNDER THE POST</span></div><div className="cap-post-words" aria-hidden="true">A moment. A meaning.<span /></div><figcaption><div><span><Icon name="srt-editor" size={16} />Written separately by you</span><strong>Idea → social copy</strong></div><Icon name="srt-editor" size={24} /></figcaption></figure></div>;
}
function CaptionProof() {
  return <div className="cap-caption-proof" aria-hidden="true"><div className="cap-proof-signal">{Array.from({ length: 27 }, (_, i) => <i key={i} style={{ height: `${8 + (i * 13 % 39)}px`, animationDelay: `${i * .07}s` }} />)}</div><div className="cap-proof-line">Your voice.<br /><em>In the frame.</em></div><div className="cap-proof-cues"><span>Transcribe</span><Icon name="arrow" size={16} /><span>Refine</span><Icon name="arrow" size={16} /><span>Export</span></div></div>;
}
export function CaptionEditorial() {
  const [intro, method, instagram, platforms, video, difference, pricing, faq, finish] = captionCopy;
  const showPlans = accountPreviewAvailable();
  return <div className="cap-reading" id="caption-guide"><article className="cap-article">
    <header className="cap-overview cap-reveal"><div><h2>{intro.heading}</h2><Paragraphs items={intro.paragraphs} /><a className="aen-btn aen-btn-primary" href="#caption-studio">Caption your video <Icon name="arrow" size={17} /></a></div><CaptionProof /></header>
    <EditorialSection id="caption-method"><h2>{method.heading}</h2><div className="cap-method">{method.children.slice(0, 3).map((step, i) => <div className="cap-method-step" key={step.heading}><div className="cap-method-top"><Icon name={i === 0 ? "upload" : i === 1 ? "srt-editor" : "download"} size={27} /><span aria-hidden="true">0{i + 1}</span></div><h3>{step.heading}</h3><Paragraphs items={step.paragraphs} /><div className="cap-step-motif" aria-hidden="true"><i /><i /><i /></div></div>)}</div><aside className="cap-recording-note"><Icon name="audio" size={31} /><div><h3>{method.children[3].heading}</h3><Paragraphs items={method.children[3].paragraphs} /></div></aside></EditorialSection>
    <EditorialSection id="caption-instagram"><div className="cap-story-layout"><div><h2>{instagram.heading}</h2><Paragraphs items={instagram.paragraphs} /></div><SocialStudy /></div><FormatStories /></EditorialSection>
    <EditorialSection id="caption-platforms"><h2>{platforms.heading}</h2><div className="cap-platforms">{platforms.children.map((platform, i) => <div key={platform.heading}><div className="cap-platform-top"><Icon name={i === 0 ? "video" : i === 1 ? "grid" : "subtitle"} size={27} /><span className="cap-channel-art" aria-hidden="true"><i /><i /><i /><i /></span></div><h3>{platform.heading}</h3><Paragraphs items={platform.paragraphs} /></div>)}</div></EditorialSection>
    <EditorialSection id="caption-video-story"><div className="cap-story-layout cap-story-photo"><VideoStoryStudy /><div><h2>{video.heading}</h2><Paragraphs items={video.paragraphs} /></div></div></EditorialSection>
    <EditorialSection id="caption-difference"><h2>{difference.heading}</h2><WorkflowComparison /><div className="cap-comparison-copy"><Paragraphs items={difference.paragraphs} /></div></EditorialSection>
    <EditorialSection id="caption-pricing"><div className="cap-pricing-heading"><h2>{pricing.heading}</h2>{showPlans && <Link className="aen-btn aen-btn-primary" href="/pricing">View plans &amp; pricing <Icon name="arrow" size={17} /></Link>}</div><div className="cap-plan-pair"><div><Icon name="file" size={27} /><h3>Start with the free tools.</h3><p>Edit, convert, and retime subtitle files with the existing free utilities. No account or card needed.</p><Link href="/tools" className="cap-text-link">Explore free tools <Icon name="arrow" size={17} /></Link></div><div><Icon name="spark" size={27} /><h3>One purchase. More possibilities.</h3><p>The $20 Source Window package includes premium Auto Caption Generator features. Get the After Effects tool and expanded caption styling together, with no separate caption subscription.</p>{showPlans && <Link href="/pricing#plans" className="cap-text-link">Explore the $20 package <Icon name="arrow" size={17} /></Link>}</div></div><div className="cap-pricing-copy"><Paragraphs items={pricing.paragraphs} /></div></EditorialSection>
    <EditorialSection id="caption-faq"><div className="cap-faq-heading"><h2>{faq.heading}</h2></div><div className="cap-faq">{faq.children.map(item => <details key={item.heading}><summary>{item.heading}<span aria-hidden="true">+</span></summary><Paragraphs items={item.paragraphs} /></details>)}</div></EditorialSection>
    <footer className="cap-finish cap-reveal"><div className="cap-content-inner cap-finish-inner"><span className="cap-finish-arrow" aria-hidden="true">↗</span><h2>{finish.heading}</h2><Paragraphs items={finish.paragraphs} /><div className="cap-finish-actions"><a href="#caption-studio" className="aen-btn aen-btn-primary">Create video captions <Icon name="arrow" size={17} /></a>{showPlans && <Link href="/pricing" className="cap-text-link">Explore the plans <Icon name="arrow" size={17} /></Link>}</div></div></footer>
  </article></div>;
}
