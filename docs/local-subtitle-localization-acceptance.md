# Local subtitle localization acceptance

Updated 12 October 2026. **Semantic acceptance is not passed; production release hold remains.** These are actual local model outputs, not hand-edited success examples. Native-speaker review is still required. Structural tests cannot certify naturalness. The implementation remains a reviewable translation draft.

## Integrity repair: current 12-case rerun

Run `node scripts/local-subtitle-quality/integrity-benchmark.mjs repair` with the existing pinned M2M100 cache. This benchmark refuses network fallback and uses the same generation helper as the browser worker. The earlier baseline artifact was captured before code changes; running the repaired code cannot reproduce the old algorithm. Meaning notes in `cases.json` never enter inference. `|` separates independently translated sentence units, not generated dialogue. All 12 cases have structurally accounted source units and valid SRT/VTT pairs; none are thereby certified semantically.

| Pair / source concept | Actual repaired native M2M100 output | Meaning / omissions / roles / naturalness assessment |
| --- | --- | --- |
| English → Urdu, viewer decides | ہم دیکھیں گے، اور آخر میں، آپ کو قاضی بننے کے لئے جا رہے ہیں، نہیں؟ | **Fail:** courtroom judge and unnatural grammar remain. Complete structural unit does not establish correct meaning. |
| English → Spanish, viewer decides | Veremos, y al final, usted será el juez, ¿no? | Literal judge/formal address remain; contextual/native review needed. Not certified. |
| English → German, viewer decides | Wir werden sehen, und am Ende werden Sie der Richter sein, oder? | **Fail:** literal Richter and shifted formality remain. |
| English → Arabic, viewer decides | سوف نرى، وفي النهاية، سوف تكون القاضي، أليس كذلك؟ | **Fail:** literal judicial sense remains. |
| English → Japanese, viewer decides | 見て、結局、あなたは裁判官になるでしょうね。 | **Fail:** occupation and conversational-intent errors remain. |
| English → Spanish, secret/idiom | No te quedes los beanos. \| El lanzamiento sigue siendo un secreto. | **Fail:** idiom still wrong. The independent second sentence is now structurally protected and retains the secret. |
| English → German, technical facts/negative instruction | Maya nutzt Adobe Premiere Pro und After Effects. \| Löschen Sie nicht die 12 Clips von 2026-10-10. | This sample retains names, brands, number/date and negation. Capitalization improves over the old combined output. Native phrasing/general term preservation remains unverified. |
| Spanish → English, conversational decision | I’ll see you decide, right? | **Fail:** speaker/meaning change and omitted context remain. |
| German → Spanish, formal lack of obligation | Por favor, consulte el informe. \| No tienes que enviarlo hoy. | Lack of obligation survives, but formal→informal register now changes between sentences. **Regression in consistency**, despite correct independent alignment. |
| Japanese → English, first-person decision | I have not yet decided. \| You are the last one to judge. | First-person regression **fixed** by independent sentences; final-decision meaning still wrong. Overall semantic acceptance fails. |
| Arabic → French, gender/negative statement | Il est ingénieur et non médecin. \| Ils décideront demain. | **Fail:** she→he remains. Negation, plural future decision and tomorrow survive. |
| Urdu → English, conversational decision | You’re going to decide, right? | **Fail:** still omits “we'll see” and “in the end” inside a fluent single sentence. The structural ledger cannot detect this reliably. |

No native reviewer independently certified these outputs. The dimensions remain distinct: sentence identity/coverage, timing and file structure pass the checks; meaning, information completeness, negation/roles, naturalness and terminology require separate review. No weak target-length rule, pair-specific dictionary or expected-answer prompt was added.

Final engineering checks: **667 tests passed**, zero failures/skips; lint, typecheck and optimized production build passed. The compiled preview remains HTTP 404 in production, and registry/sitemap exclusion tests pass. These checks do not change semantic acceptance.

## Original six-cue failure: actual browser comparison

The old supplied Urdu starts with the A-roll question at **00:00:00.500**, omitting the experiment sentence. The repaired downloaded browser SRT starts at **00:00:00.500–00:00:03.000** with:

```text
آج کی ویڈیو میں،
ہم ایک تجربہ کرنے جا رہے ہیں.
```

The question now uses **00:00:03.180–00:00:07.600** in two cues; `اس نقطہ تک` stays together and `گا؟` is not a standalone line. “We'll see” occupies its own **00:00:07.940–00:00:08.600** interval. The decision sentence still returns `آخر میں آپ کو ایک قاضی بننے کے لئے جا رہے ہیں، نہیں؟` at **00:00:08.920–00:00:10.600**: timing fixed, meaning still wrong. The final advanced-techniques sentence stays at **00:00:10.980–00:00:19.100**, with two cues retaining the original 15.320 split; editing/techniques/mesmerizing errors persist. A compound still splits `تخلیق` / `کاروں` across those final cues. Layout is improved, not syntactically guaranteed.

Original media was not found among repository fixtures, but the existing Chrome tab still held `talking head 1.mp3` and the exact Accurate/English source transcript. QA selected Urdu, reused source recovery and processed **five actual sentence units** on WASM; progress showed 4/5 at 33 seconds and completed with seven editable cues, source references and a dense-layout warning. The first, middle and final downloaded SRT intervals were checked. Native rerun gives the same opening/decision outputs; its final sentence differs in wording and also fails meaning.

The browser download observer timed out after the SRT was saved. One reconnect attempt failed (`Debugger unattached`); browser testing then stopped. Therefore **browser VTT, a second target/script, edit/undo, screenshots and browser-wide network capture were not newly verified** in this repair. Their previous evidence below remains historical. Actual native SRT/VTT were read and validated for all 12 cases plus the six-cue fixture (26 files), and the actual browser SRT was read independently. This is not a claim of 26 browser downloads.

## Earlier quality-upgrade measurements (historical)

These historical outputs were captured before the integrity repair using the [12-case matrix](../scripts/local-subtitle-quality/cases.json) and `benchmark.mjs translation m2m` on native CPU. They cannot be reproduced unchanged with the repaired grouper; the current rerun above is authoritative. `|` below separates the old independently translated cues. The historical “new thought” column uses the previous combined-sentence grouper. No evaluation meaning notes entered model input.

## Retained M2M100: before and after

| Pair / source | Old isolated-cue output | New thought output | Assessment / reason |
| --- | --- | --- | --- |
| English → Urdu: “We'll see, and in the end, you're going to be the judge, right?” | ہم دیکھیں گے، \| اور آخر میں، \| آپ کو ایک قاضی بننا ہے، نہیں؟ | ہم دیکھیں گے، اور آخر میں، آپ کو قاضی بننے کے لئے جا رہے ہیں، نہیں؟ | **Fail.** Still courtroom “judge” and unnatural construction. Context did not solve this example. |
| English → Spanish: same source | Vamos a ver, \| Y al final, \| ¿Será el juez, ¿no? | Veremos, y al final, usted será el juez, ¿no? | More continuous sentence and consistent person, but “juez” and formality need contextual/native review. Not certified. |
| English → German: same source | Wir werden sehen, \| Und am Ende, \| Du wirst der Richter sein, oder? | Wir werden sehen, und am Ende werden Sie der Richter sein, oder? | **Fail.** Smoother sentence, but literal “Richter” and a change to formal address. |
| English → Arabic: same source | وسنرى، \| وفي نهاية المطاف، \| سوف تكون القاضي، أليس كذلك؟ | سوف نرى، وفي النهاية، سوف تكون القاضي، أليس كذلك؟ | **Fail.** The literal judicial meaning remains. |
| English → Japanese: same source | 見るだろう、 \| 最後に、 \| 裁判官になるんだよね? | 見て、結局、あなたは裁判官になるでしょうね。 | **Fail.** Courtroom occupation remains; “we'll see” is not natural in this context. |
| English → Spanish: “Don't spill the beans. The launch is still a secret.” | No te quedes los beanos. \| El lanzamiento sigue siendo un secreto. | No te quedes los bolos, el lanzamiento es un secreto. | **Fail.** Neither version conveys the idiom reliably. |
| German → Spanish: “Bitte prüfen Sie den Bericht. Sie müssen ihn nicht heute abschicken.” | Por favor, consulte el informe. \| No tienes que enviarlo hoy. | Por favor, consulte el informe. no tiene que enviarlo hoy. | Improvement: formal address stays consistent and lack of obligation survives. Capitalization still needs editing; report-review wording requires native review. |
| Japanese → English: “まだ決めていません。最後に判断するのはあなたです。” | I have not yet decided. \| You are the last one to judge. | You have not yet decided, you are the last one to judge. | **Fail/regression.** Changes the implied first-person subject and misconstrues “final decision.” |
| Arabic → French: “هي مهندسة، وليست طبيبة. سيقررون غدًا.” | Elle est ingénieur, \| Pas un médecin. \| Ils décideront demain. | Il est ingénieur et non médecin. Ils décideront demain. | **Fail/regression.** Preserves negation/tomorrow but changes she to he. Actual grouping translates two units, not all three cues together. |
| Urdu → English: “دیکھتے ہیں، آخر میں فیصلہ آپ ہی نے کرنا ہے، ہے نا؟” | and see, \| You've decided that, right? | You're going to decide, right? | Better decision tense and conversational tag; omits “we'll see” and “in the end.” **Fail for complete meaning preservation.** |

Technical preservation case: “Maya uses Adobe Premiere Pro and After Effects. Do not delete the 12 clips dated 2026-10-10.” English → German old: “Maya nutzt Adobe Premiere Pro und After Effects. | Löschen Sie nicht die 12 Clips von 2026-10-10.” New: “Maya nutzt Adobe Premiere Pro und After Effects. löschen Sie nicht die 12 Clips von 2026-10-10.” Names, products, number, numeric date and negative instruction survive; capitalization remains wrong. This is a narrow fact-preservation result, not proof that arbitrary names/numbers always survive.

Spanish → English “Ya veremos, al final tú decides, ¿no?” also failed: old “We will see, | At the end you decide, | not?”; new “I'll see you decide, right?” changes pronouns/meaning.

The user's desired Urdu reference is **human supplied, not generated**:

> دیکھتے ہیں، آخر میں فیصلہ تو آپ ہی نے کرنا ہے، ہے نا؟

The current model does not reliably reach that standard. No phrase replacement was added to make this test appear to pass.

## Larger local candidate experiments

Qwen3.5 0.8B q4 returned Arabic for an Urdu target. Rejected. Qwen3.5 2B q4 was tested twice: basic semantic-unit translation, then a generic semantic/negation prompt with adjacent source context. These are native CPU experiments, not production/browser adoption.

| Pair / case | 2B basic output | 2B context output | Assessment |
| --- | --- | --- | --- |
| Spanish → English conversational case | We'll see, in the end you decide, won't we? | We'll see, in the end, you decide, right? | Context improves the rhetorical tag. |
| Japanese → English decision case | I haven't decided yet. The final judgment is yours. | I haven't decided yet. You make the final call. | More idiomatic and meaning-preserving in this example. |
| Arabic → French gender/negative case | Elle est une ingénieure, pas une médecin. Ils vont décider demain. | Elle est ingénieure, pas médecin. Ils décideront demain. | Better gender, negation and flow than M2M100. |
| German → Spanish lack of obligation | Por favor, revise el informe. No lo envíe hoy. | Por favor, revise el informe. No es necesario enviarlo hoy. | Basic output reverses modality; context prompt fixes this case. The initial error is a material reliability concern. |
| English → Urdu judge case | ہم دیکھیں گے، اور آخر میں آپ کا فیصلہ کرنا ہوگا، بالکل؟ | ہم دیکھیں گے، اور آخر میں آپ کا حکم دینا ہوگا، بالکل؟ | Basic recognizes decision better, but grammar is awkward; context experiment regresses toward giving orders. **Fail.** |
| English → Japanese judge case | 「そうか、結局はあなたは裁判官になるわけだろ？」 | 「そうでしょう。結局は、あなたは裁判官になりますよ？」 | Still courtroom judge and added quotation marks. **Fail.** |
| English → Spanish idiom | No te acabo de revelar. La presentación sigue siendo un secreto. | No se acierte a soltar la información. La presentación sigue siendo un secreto. | Neither reliably gives a natural negative instruction. **Fail.** |

The larger model improves several pairs but fails critical cases, with about 1.55 GB of static assets and unknown browser peak memory. It was not made the default or exposed as a “Natural” mode.

## Earlier timing, files and privacy acceptance (historical)

- Automated tests cover complete-thought input, bounds, distinct source/target languages, Unicode, protected segmentation, original timing retention where practical, resegmentation inside the immutable thought envelope, dense-text flags, malformed output rejection, per-thought retry/checkpoints, and valid SRT/VTT.
- Actual browser Urdu/Spanish/Japanese runs use the page and local WASM M2M100, with actual local SRT/VTT downloads checked independently. Their structural acceptance does not imply semantic acceptance.
- Workers permit only bodyless static asset downloads at pinned model/runtime URLs. Test text and audio never enter a request. Warm speech/localization audits and restrictive network-policy tests supplement this code-path check; no machine-wide packet capture was performed.

## Workspace finishing — 12 October 2026

[The finishing record](subtitle-workspace-finishing.md) documents real before/after cue boundaries, attached Urdu compounds, desktop/narrow review UI and actual matching Urdu SRT/VTT downloads. All five source sentence intervals remain covered. Routine advice is now contextual and nonblocking; missing text/timing failures still block export. **691 tests pass**, with lint, typecheck, build and production 404/directory/sitemap checks passing.

The 12-case saved M2M100 matrix was replayed for text/timing/layout preservation, not rerun or certified semantically. Existing judge/idiom/negation/pronoun/terminology failures remain. No native-language acceptance or production release is granted by this UI/segmentation pass.

## Manual release checklist

Have native reviewers independently judge meaning, idioms, register, omissions, pronouns/gender, negation and subtitle readability for **all 12 cases** plus unseen conversational recordings. Preserve actual model output alongside corrections and reasons. Include more voices, accents, noise and technical speech in Fast/Accurate ASR evaluation. Do not declare the standalone translator ready for natural-localization release until the failed semantics are resolved; the reusable grouping/resegmentation/checkpoint engine is in place.
