import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act,useReducer,useState} from 'react';
import {emptyEditor} from '../src/lib/subtitle-editor.ts';
import {buildStudioAlignment,currentStudioAlignment} from '../src/features/caption-studio/studio-alignment.ts';
import {editorSessionReducer,initialEditorSession} from '../src/features/srt-editor/editor-session.ts';
const {ProductivityControls}=await import('../src/features/caption-studio/productivity-controls.tsx');
it('regrouping is usable through the control and one Undo restores document and measured alignment',async()=>{
 const dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));
 const source={...emptyEditor(),cues:[{id:'a',start:0,end:2000,text:'One two three four.',identifier:'',srtSettings:'',vttSettings:''}]};
 const initial=buildStudioAlignment(source,[{text:'One',timestamp:[0,.4]},{text:'two',timestamp:[.5,.9]},{text:'three',timestamp:[1,1.4]},{text:'four.',timestamp:[1.5,2]}]);let nextId=0;
 function Harness(){const [state,dispatch]=useReducer(editorSessionReducer,{...initialEditorSession,document:source,saved:source});const [alignment,setAlignment]=useState(initial);return React.createElement(React.Fragment,null,React.createElement('output',{'data-state':true},`${state.document.cues.length}/${currentStudioAlignment(state.document,alignment).length}`),React.createElement('button',{onClick:()=>dispatch({type:'undo'})},'Undo test edit'),React.createElement(ProductivityControls,{document:state.document,alignment,busy:false,makeId:()=>`new-${++nextId}`,onSelect:()=>{},onApply:(document,extra)=>{dispatch({type:'apply',document});if(extra)setAlignment(prev=>[...prev,...extra]);}}));}
 try{await act(()=>root.render(React.createElement(Harness)));const select=document.querySelector('select');await act(()=>{select.value='2';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});const regroup=[...document.querySelectorAll('button')].find(b=>b.textContent==='Regroup captions');assert.equal(regroup.disabled,false);await act(()=>regroup.click());assert.equal(document.querySelector('output').textContent,'2/2');await act(()=>document.querySelector('button').click());assert.equal(document.querySelector('output').textContent,'1/1');}
 finally{await act(()=>root.unmount());dom.window.close();}
});
