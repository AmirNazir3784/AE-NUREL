const faqs = [
  ["What is AENural?", "AENural is the home of Source Window, our flagship product, and free online tools for editors."],
  ["How is Source Window different from the free tools?", "Source Window is AENural’s flagship product for After Effects. The free online tools are separate utilities you can use with straightforward controls."],
  ["Are the online tools really free?", "Yes. All current subtitle tools are free to use, with no account required."],
  ["Are my subtitle files uploaded?", "No. Your subtitle contents are not sent to AENural servers. See the privacy policy for details."],
  ["Which subtitle formats can I use?", "The editor, sync fixer, and overlap fixer support SRT and VTT. Timing adjustment, merging, and splitting use SRT. Format converters support SRT, VTT, ASS/SSA and SBV inputs, transcript text and JSON outputs, and silent MP4 caption videos. Each tool lists its supported formats and limits."],
];
export function HomeFaq() {
  return <section className="aen-band" id="faq"><div className="aen-wrap"><header className="aen-section-head"><span className="aen-eyebrow"><i />FAQ</span><h2>Questions, answered</h2></header><div className="aen-faq">{faqs.map(([question, answer]) => <details key={question} className="aen-faq-item"><summary>{question}<span className="aen-faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>;
}
