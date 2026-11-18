import {it} from 'node:test';import assert from'node:assert/strict';
import {assertMusicTiming,UnreliableMusicRecognition}from'../src/features/local-asr/music-quality.ts';
it('rejects collapsed multi-word spans rather than declaring their timestamps usable',()=>{assert.throws(()=>assertMusicTiming([{text:'one two three four five six seven eight nine ten',timestamp:[12,12.18]}]),UnreliableMusicRecognition);});
it('retains actual repeated choruses, brief words, word groups and sustained notes',()=>{assert.doesNotThrow(()=>assertMusicTiming([{text:'repeat this line',timestamp:[1,3]},{text:'repeat this line',timestamp:[4,6]},{text:'one',timestamp:[7,7.08]},{text:'held',timestamp:[8,15]},{text:'one two three four five six seven eight',timestamp:[16,18]}]));});
