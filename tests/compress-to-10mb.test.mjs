import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
const {VideoCompressor} = await import('../src/features/video-compressor/video-compressor.tsx');
import {compressionPlan,DEFAULT_COMPRESSION_SETTINGS} from '../src/features/video-compressor/compression-core.ts';

it('locks the dedicated workspace to 10 MB without exposing alternate budgets or presets',()=>{
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(VideoCompressor,{tenMB:true}))).window.document;
  assert.equal(doc.querySelector('[aria-label="Compression mode"]'),null);
  assert.equal(doc.querySelector('#compression-target'),null);
  assert.match(doc.body.textContent,/10,000,000 bytes/);
  assert.equal([...doc.querySelectorAll('button')].find(b=>b.textContent.includes('Compress to 10 MB')).disabled,true);
  assert.equal(doc.querySelector('[aria-label="Resolution"]').value,'720');
});
it('preserves the general compressor modes and editable target input',()=>{
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(VideoCompressor))).window.document;
  assert.equal(doc.querySelectorAll('[aria-label="Compression mode"] button').length,4);
  assert.ok([...doc.querySelectorAll('button')].some(b=>b.textContent.includes('Compress video')));
});
it('rejects a 10 MB audio budget that cannot fit a long clip, while allowing a silent alternative',()=>{
  const media={width:3840,height:2160,duration:1000,videoBitrate:12_000_000,audioBitrate:128_000,frameRate:30,audioTracks:1,videoCodec:'avc',audioCodec:'aac'};
  const settings={...DEFAULT_COMPRESSION_SETTINGS,mode:'target',targetMB:10};
  assert.throws(()=>compressionPlan(media,settings),/too small/);
  const silent=compressionPlan(media,{...settings,keepAudio:false});
  assert.equal(silent.targetBytes,10_000_000);assert.ok(silent.estimatedBytes<10_000_000);
});
