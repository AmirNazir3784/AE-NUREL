import './helpers/auth-dom.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captionGenerationDisplay } from '../src/features/caption-studio/generation-progress.ts';
import { transcribeSpeech } from '../src/features/local-asr/speech-transcription.ts';

describe('honest caption generation progress', () => {
  it('remains indeterminate during preparation, initialization, detection and caption building', () => {
    for (const stage of ['preparing', 'loading', 'detecting', 'building'])
      assert.equal(captionGenerationDisplay({stage}).value, null);
    assert.match(captionGenerationDisplay({stage:'loading'}).detail, /first run/i);
  });
  it('shows measured model-file download bytes, without claiming whole-job completion', () => {
    assert.equal(captionGenerationDisplay({stage:'download', loaded:50, total:200}).value, 25);
    assert.equal(captionGenerationDisplay({stage:'download', loaded:50}).value, null);
    assert.match(captionGenerationDisplay({stage:'download', loaded:50, total:200}).detail, /current model file/i);
  });
  it('shows only fully completed contexts and never invents one-section progress', () => {
    assert.equal(captionGenerationDisplay({stage:'transcribing', completed:1, sections:4}).value, 25);
    assert.equal(captionGenerationDisplay({stage:'transcribing', completed:0, sections:4}).value, 0);
    assert.equal(captionGenerationDisplay({stage:'transcribing', completed:0, sections:1}).value, null);
    assert.equal(captionGenerationDisplay({stage:'transcribing', completed:5, sections:4}).value, null);
  });
  it('reports completed speech contexts after recognition, not beforehand', async () => {
    const changes = []; let calls = 0;
    const output = await transcribeSpeech(new Float32Array(16000 * 10), [{start:0,end:1},{start:5,end:6}], async () => {
      calls++;
      return {text:'Hello', chunks:[{text:'Hello',timestamp:[0.2,1.2]}]};
    }, true, (completed,total) => changes.push([completed,total]));
    assert.equal(calls, 2);
    assert.deepEqual(changes, [[0,2],[1,2],[2,2]]);
    assert.equal(output.chunks.length, 2);
  });
  it('has a visible same-file-repeatable change-video action while preserving validation and unsaved-edits confirmation', () => {
    const source = readFileSync(new URL('../src/features/caption-studio/caption-studio.tsx', import.meta.url), 'utf8');
    assert.match(source, /Change video/);
    assert.match(source, /videoInput\.current\?\.click\(\)/);
    assert.match(source, /event.target.value = ""/);
    assert.match(source, /validateStudioFile\(file\)/);
    // Native confirmation on the clean branch, accessible modal in Codex's local integration.
    assert.ok(source.includes('window.confirm("Replace this video and its captions') ||
      source.includes('ReplaceWorkDialog'), 'Replacing edits must request confirmation');
    assert.match(source, /setTranscriptionProgress\(null\); setQuery\("")/);
    assert.match(source, /dispatch\(\{ type: "scratch"/);
  });
});
