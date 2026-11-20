// Pure tests for sanitizeStoredProject (S5-33): the read-side whitelist
// service.project() runs over stored payloads before returning them.
// No database, no node_modules needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeStoredProject } from '../server/membership/service.mjs';

const validPayload = () => ({
  schemaVersion: 1,
  title: 'My project',
  source: { filename: 'video.mp4', durationSeconds: 10, width: 640, height: 360 },
  captions: { filename: 'c.srt', format: 'srt', cues: [{ id: '1', text: 'hi', start: 0, end: 1000 }] },
  style: { preset: 'Clean', font: 'Inter' },
  alignment: [{ id: '1', text: 'hi', start: 0, end: 1000, words: [{ from: 0, to: 2, start: 0, end: 1000 }] }],
});

describe('sanitizeStoredProject (S5-33)', () => {
  it('keeps a valid payload intact', () => {
    const out = sanitizeStoredProject(validPayload());
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.title, 'My project');
    assert.equal(out.source.filename, 'video.mp4');
    assert.equal(out.captions.cues[0].text, 'hi');
    assert.equal(out.style.preset, 'Clean');
    assert.equal(out.alignment[0].words[0].to, 2);
  });
  it('drops unknown top-level keys and nested objects', () => {
    const out = sanitizeStoredProject({ ...validPayload(), admin: true, secretKey: 'x', nested: { evil: 1 }, tags: ['a'] });
    assert.equal(out.admin, undefined);
    assert.equal(out.secretKey, undefined);
    assert.equal(out.nested, undefined);
    assert.equal(out.tags, undefined);
  });
  it('drops out-of-bounds and wrong-typed fields', () => {
    const payload = validPayload();
    payload.title = 'x'.repeat(500);
    payload.source.durationSeconds = 999;
    payload.source.width = 99999;
    const out = sanitizeStoredProject(payload);
    assert.equal(out.title.length, 100, 'oversized title is truncated to the bound');
    assert.equal(out.source, undefined, 'out-of-bounds source is dropped wholesale');
  });
  it('drops captions wholesale when any cue is invalid', () => {
    const payload = validPayload();
    payload.captions.cues.push({ id: '2', text: 'y'.repeat(5000), start: 0, end: 1000 });
    assert.equal(sanitizeStoredProject(payload).captions, undefined);
  });
  it('drops non-scalar style values but keeps scalar preset keys', () => {
    const payload = validPayload();
    payload.style.injected = { __proto__: 1 };
    payload.style.huge = 'x'.repeat(1000);
    const out = sanitizeStoredProject(payload);
    assert.equal(out.style.injected, undefined);
    assert.equal(out.style.huge, undefined);
    assert.equal(out.style.preset, 'Clean');
  });
  it('returns an empty object for non-objects', () => {
    assert.deepEqual(sanitizeStoredProject(null), {});
    assert.deepEqual(sanitizeStoredProject('nope'), {});
    assert.deepEqual(sanitizeStoredProject([1, 2]), {});
    assert.deepEqual(sanitizeStoredProject(42), {});
  });
});
