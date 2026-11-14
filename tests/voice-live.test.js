import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseUtterance,reduceInputs,hasFacts,createVoiceLive} from '../dist/voice-live.js';

const base={farm:'Lahore example field',area:10,lat:31.5204,lon:74.3587,soil:'loam',organic:1.2,slope:2,irrigation:500,summer:'rice',winter:'wheat',priority:'balanced',ndvi:'',residue:true,dry:0,heat:0};

test('parses area, irrigation, crops and soil from plain English utterances',()=>{
 const a=parseUtterance('plant millet in summer and mustard in winter');
 assert.equal(a.summer,'millet');assert.equal(a.winter,'mustard');
 const b=parseUtterance('irrigation is 400 mm per year');
 assert.equal(b.irrigation,400);
 const c=parseUtterance('clay soil, organic matter 2.5 percent');
 assert.equal(c.soil,'clay');assert.equal(c.organic,2.5);
 const d=parseUtterance('my farm is 12 acres');
 assert.equal(d.area,12);assert.equal(d.areaUnit,'acres');
 assert.equal(parseUtterance('make it drier by 30').dry,30);
 assert.equal(parseUtterance('reduce rainfall by 30 percent').dry,30);
});

test('parses scenario stress, priority, residue and farm name',()=>{
 const a=parseUtterance('make it drier by 30 percent and hotter by 2 degrees C');
 assert.equal(a.dry,30);assert.equal(a.heat,2);
 const b=parseUtterance('priority is water');
 assert.equal(b.priority,'water');
 const c=parseUtterance('keep the crop residue');
 assert.equal(c.residue,true);
 const d=parseUtterance('clear residue');
 assert.equal(d.residue,false);
 const e=parseUtterance('call this North block');
 assert.equal(e.farm,'North block');
});

test('reduceInputs converts acres to hectares and clamps out-of-range values',()=>{
 const acres=reduceInputs(base,parseUtterance('the field is 5 acres'));
 assert.ok(Math.abs(acres.area-2.02)<0.05);
 assert.equal(reduceInputs(base,parseUtterance('dry by 99')).dry,0);
 assert.equal(reduceInputs(base,parseUtterance('heat by 99')).heat,0);
 assert.equal(reduceInputs(base,parseUtterance('organic matter 99')).organic,1.2);
});

test('fold is pure and idempotent for the same facts',()=>{
 const facts=parseUtterance('irrigation 250 and plant chickpea');
 const once=reduceInputs(base,facts);
 const twice=reduceInputs(once,facts);
 assert.deepEqual(once,twice);
 assert.equal(once.irrigation,250);
 assert.equal(once.winter,'chickpea');
 assert.equal(base.irrigation,500);
});

test('hasFacts rejects empty or irrelevant speech',()=>{
 assert.equal(hasFacts(parseUtterance('')),false);
 assert.equal(hasFacts(parseUtterance('hello there')),false);
 assert.equal(hasFacts(parseUtterance('wheat')),true);
});

test('createVoiceLive commits final phrases and applies interim folds',()=>{
 let committed=null,live=null,inst=null;
 class FakeRecognition{
  constructor(){inst=this;this.onresult=null;this.onerror=null;this.onend=null;this.onstart=null}
  start(){this.onstart?.()}
  abort(){this.onend?.()}
  stop(){this.onend?.()}
 }
 const bar={hidden:true,classList:{toggle(){},add(){},remove(){}},querySelector(){return null}};
 const doc={
  defaultView:{SpeechRecognition:FakeRecognition,webkitSpeechRecognition:FakeRecognition},
  createElement:()=>({className:'',textContent:'',setAttribute(){},append(){}}),
  getElementById:id=>id==='voice-live-bar'?bar:null
 };
 globalThis.__fieldshiftReadInputs=()=>({...base});
 const api=createVoiceLive({
  document:doc,
  Recognition:FakeRecognition,
  onLiveInputs:(inputs,meta)=>{live={inputs,meta}},
  onCommit:inputs=>{committed=inputs}
 });
 api.toggle();
 assert.equal(api.state().listening,true);
 assert.ok(inst);
 const results=(list,resultIndex=0)=>{
  inst.onresult({resultIndex,results:list.map(([t,final])=>({0:{transcript:t},is_final:final,isFinal:final}))});
 };
 results([['irrigation 3',false]]);
 assert.ok(live);
 assert.equal(live.inputs.irrigation,3);
 assert.equal(live.meta.live,true);
 // completed utterance: the full phrase arrives as a final result
 results([['irrigation 300',true]]);
 assert.ok(committed);
 assert.equal(committed.irrigation,300);
 assert.equal(api.state().listening,true);
 // stop → abort → onend; stopped flag prevents auto-restart
 api.stop();
 assert.equal(api.state().listening,false);
 assert.equal(api.state().status,'idle');
 delete globalThis.__fieldshiftReadInputs;
});
