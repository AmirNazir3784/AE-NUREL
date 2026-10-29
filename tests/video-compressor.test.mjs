import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COMPRESSION_LIMITS, DEFAULT_COMPRESSION_SETTINGS, compressionDimensions, compressionPlan,
  smallerTargetBitrate, validateCompressionFile, validateCompressionMedia, compressedFilename,
} from '../src/features/video-compressor/compression-core.ts';
import { directoryTools } from '../src/lib/tool-directory-catalog.ts';
import { tools } from '../src/lib/tools.ts';

const media = { width:1920, height:1080, duration:60, videoBitrate:5_000_000, audioBitrate:128_000, frameRate:30, audioTracks:1, videoCodec:'avc', audioCodec:'aac' };
const settings = { ...DEFAULT_COMPRESSION_SETTINGS };

describe('on-device video compression planning', () => {
  it('keeps landscape, portrait and odd-size outputs even without upscaling or cropping', () => {
    assert.deepEqual(compressionDimensions(media, '720'), {width:1280,height:720});
    assert.deepEqual(compressionDimensions({width:1080,height:1920}, '720'), {width:720,height:1280});
    assert.deepEqual(compressionDimensions({width:641,height:359}, '1080'), {width:640,height:358});
    assert.deepEqual(compressionDimensions({width:640,height:360}, 'original'), {width:640,height:360});
    assert.throws(()=>compressionDimensions(media,'bogus'));
  });

  it('budgets audio, video and overhead below an actual decimal-MB target', () => {
    const plan = compressionPlan(media, {...settings,mode:'target',targetMB:10});
    assert.equal(plan.targetBytes, 10_000_000);
    assert.ok(plan.estimatedBytes < 10_000_000);
    assert.equal(plan.audioBitrate,128_000);
    assert.ok(plan.videoBitrate > COMPRESSION_LIMITS.minimumBitrate);
  });

  it('detects impossible targets and supports intentional audio removal', () => {
    assert.throws(()=>compressionPlan(media,{...settings,mode:'target',targetMB:0.5}), /too small/);
    const muted = compressionPlan(media,{...settings,mode:'target',targetMB:0.8,keepAudio:false});
    assert.equal(muted.audioBitrate,0);
    assert.ok(muted.estimatedBytes <= 800_000);
    for(const targetMB of [NaN,Infinity,0,-1,251]) assert.throws(()=>compressionPlan(media,{...settings,mode:'target',targetMB}));
  });

  it('does not inflate source bitrate merely to fill a large size target', () => {
    const low = {...media,videoBitrate:400_000};
    const plan = compressionPlan(low,{...settings,mode:'target',targetMB:100});
    assert.ok(plan.videoBitrate < low.videoBitrate);
  });

  it('accounts for audio transcoding instead of assuming unsupported original audio can be copied', () => {
    const plan = compressionPlan({...media,audioCodec:'flac',audioBitrate:800_000}, settings);
    assert.equal(plan.audioBitrate,128_000);
    const copied = compressionPlan({...media,audioCodec:'opus',audioBitrate:96_000},{...settings,format:'webm'});
    assert.equal(copied.audioBitrate,96_000);
  });

  it('produces distinct quality choices and a smaller second-pass budget based on observed bytes', () => {
    const high = compressionPlan(media,{...settings,mode:'quality'});
    const balanced = compressionPlan(media,settings);
    const small = compressionPlan(media,{...settings,mode:'small'});
    assert.ok(high.videoBitrate > balanced.videoBitrate && balanced.videoBitrate > small.videoBitrate);
    const next = smallerTargetBitrate(1_000_000,12_000_000,10_000_000,1_000_000);
    assert.ok(next < 1_000_000 && next >= COMPRESSION_LIMITS.minimumBitrate);
    assert.throws(()=>smallerTargetBitrate(100_000,1_000_000,100_000,200_000),/audio/);
  });

  it('rejects empty, oversized, unsupported, corrupt and unsafe media before processing', () => {
    validateCompressionFile({name:'CLIP.MOV',size:100});
    for(const file of [{name:'clip.avi',size:100},{name:'clip.mp4',size:0},{name:'clip.mp4',size:Infinity},{name:'clip.mp4',size:COMPRESSION_LIMITS.inputBytes+1}]) assert.throws(()=>validateCompressionFile(file));
    for(const bad of [{duration:1201},{duration:0},{width:7680},{height:NaN},{audioTracks:2}]) assert.throws(()=>validateCompressionMedia({...media,...bad}));
    assert.throws(()=>compressionPlan(media,{...settings,format:'avi'}));
    assert.throws(()=>compressionPlan(media,{...settings,mode:'unknown'}));
  });

  it('preserves Unicode while producing safe descriptive download filenames', () => {
    assert.equal(compressedFilename('Café 日本語.MOV','mp4'),'Café 日本語-compressed.mp4');
    assert.equal(compressedFilename('bad:name?.mp4','webm'),'bad_name_-compressed.webm');
  });
});

describe('released video tool boundary', () => {
  it('appears in public discovery and is indexable without a QA flag', async () => {
    assert.ok(directoryTools('development').some(tool=>tool.href==='/tools/video-compressor'));
    for(const env of ['production','test',undefined]) assert.equal(directoryTools(env).some(tool=>tool.href==='/tools/video-compressor'),true);
    assert.equal(tools.some(tool=>tool.href==='/tools/video-compressor'),true);
    const page = await readFile(new URL('../src/app/tools/video-compressor/page.tsx',import.meta.url),'utf8');
    assert.match(page,/robots: \{ index: true, follow: true \}/);
    assert.doesNotMatch(page,/notFound|AENURAL_VIDEO_TOOLS_QA/);
    const engine = await readFile(new URL('../src/features/video-compressor/compression-media.ts',import.meta.url),'utf8');
    assert.doesNotMatch(engine,/\bfetch\(|XMLHttpRequest|FormData/);
  });
});
