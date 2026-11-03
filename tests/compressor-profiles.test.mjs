import './helpers/auth-dom.mjs';
import {it} from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {JSDOM} from 'jsdom';
import {compressorProfiles,validateProfileInput} from '../src/features/video-compressor/compressor-profiles.ts';
const {VideoCompressor}=await import('../src/features/video-compressor/video-compressor.tsx');
for(const [profile,preset] of Object.entries(compressorProfiles))it(profile+' exposes its declared controls and output format',()=>{const doc=new JSDOM(renderToStaticMarkup(React.createElement(VideoCompressor,{profile}))).window.document;assert.ok(doc.body.textContent.includes(preset.heading));const output=doc.querySelector('[aria-label="Output format"]');assert.equal(output.value,preset.initial.format);assert.equal(output.disabled,!!preset.format);assert.equal(doc.querySelector('input[type="file"]').accept,preset.accept);});
it('accepts supported MP4-tool input containers and rejects unsupported extensions',()=>{for(const name of ['clip.MP4','clip.mov','clip.webm'])assert.doesNotThrow(()=>validateProfileInput(name,'mp4'));assert.throws(()=>validateProfileInput('clip.exe','mp4'));});

it('MOV profile rejects other containers while allowing case-insensitive MOV',()=>{assert.doesNotThrow(()=>validateProfileInput('clip.MOV','mov'));assert.throws(()=>validateProfileInput('clip.mp4','mov'));assert.throws(()=>validateProfileInput('clip.qt','mov'));});
