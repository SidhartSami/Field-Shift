import {icon,cropIllustration} from './icons.js';
import {waterBudgetGraphic} from './visuals.js';
import {buildDecisionBrief,rotationCheckKey,LOCAL_CHECKS} from './decision-brief.js';
import {createUrduDictation} from './stt.js';
import {createVoiceHelp} from './voice.js';
import {createVoiceLive} from './voice-live.js';
import {compareOutcomes,screenEconomics} from './outcomes.js';
import {createGeoWorkspace} from './geo.js';
import {crops,summarize,evaluate} from './model.js';
const $=id=>document.getElementById(id),KEY='fieldshift-workspace-v2';
const fields=['farm','area','lat','lon','soil','organic','slope','irrigation','summer','winter','priority','ndvi','residue','dry','heat'];
const defaults={farm:'Lahore example field',area:10,lat:31.5204,lon:74.3587,soil:'loam',organic:1.2,slope:2,irrigation:500,summer:'rice',winter:'wheat',priority:'balanced',ndvi:'',residue:true,dry:0,heat:0};
const defaultEconomics={currency:'PKR',pumpingCost:'',marginChange:'',transitionCost:''};
let economics={...defaultEconomics},localChecks={};
const locale={language:'en',translate:text=>text};
let voiceView=null,dictation=null,voiceLive=null;
let geoView=null;
let state={version:2,active:'field-1',fields:[],plans:[]},raw,climate,results=[],observed={lat:31.5204,lon:74.3587},source='saved NASA snapshot',url='',fetchTime='2026-11-14',year=2024,selected='water',customSequence=null,ready=false,toastTimer,requestId=0,month=6;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.round(v).toLocaleString(),id=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const api=(lat,lon)=>`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG&longitude=${lon}&latitude=${lat}&start=2023&end=2024&format=JSON`;
function toast(message,undo){clearTimeout(toastTimer);$('toast-message').textContent=message;$('toast-undo').hidden=!undo;$('toast-undo').onclick=()=>{undo?.();hideToast()};$('toast').classList.add('visible');toastTimer=setTimeout(hideToast,undo?10000:6000)}
function hideToast(){$('toast').classList.remove('visible')}
$('toast-close').onclick=hideToast;
function input(){return Object.fromEntries(fields.map(k=>[k,$(k).type==='checkbox'?$(k).checked:$(k).type==='number'||$(k).type==='range'?($(k).value===''&&k==='ndvi'?'':Number($(k).value)):$(k).value]));}
function setInputs(i){for(const k of fields){const value=i[k]??defaults[k];if($(k).type==='checkbox')$(k).checked=value;else $(k).value=value}}
// Live voice: expose a reader so voice-live can fold facts without importing state.
globalThis.__fieldshiftReadInputs=()=>input();
const LIVE_FIELD_IDS=['farm','area','soil','organic','slope','irrigation','summer','winter','priority','ndvi','residue','dry','heat'];
const VOICE_CHANGE_KEYS=[...LIVE_FIELD_IDS,'lat','lon'];
function flashLiveFocus(ids){
 for(const el of document.querySelectorAll('.live-focus'))el.classList.remove('live-focus');
 const list=(ids||[]).filter(id=>$(id));
 for(const id of list){const el=$(id);el.classList.add('live-focus');el.scrollIntoView?.({block:'nearest',behavior:'smooth'})}
 if(!list.length)return;
 clearTimeout(flashLiveFocus._t);
 flashLiveFocus._t=setTimeout(()=>{for(const el of document.querySelectorAll('.live-focus'))el.classList.remove('live-focus')},2200);
}
let voicePlanAdded=new Set();
function planKeyFor(id){
 if(id==='lat'||id==='lon')return 'place';
 if(id==='farm')return 'field';
 if(id==='dry'||id==='heat')return 'stress';
 return id;
}
function applyLiveInputs(next,{live=false,ids=[]}={}){
 if(!ready)return;
 setInputs(next);
 draw();
 for(const id of ids)voicePlanAdded.add(planKeyFor(id));
 renderVoiceStage(ids);
 if(!live){
  stash();
  flashLiveFocus(ids);
 }
}
function matches(){const i=input();return i.lat===observed.lat&&i.lon===observed.lon}
function geoContext(){const i=input();return {inputs:i,year,customSequence,selected,selectedName:results.find(r=>r.id===selected)?.name,valid:ready&&$('farm-form').checkValidity()&&matches(),fields:state.fields.map(f=>{const d=f.id===state.active?{inputs:i,observations:{coordinates:observed}}:f.draft;return {id:f.id,name:d.inputs.farm,area:d.inputs.area,lat:Number(d.inputs.lat),lon:Number(d.inputs.lon),active:f.id===state.active,matched:Number(d.inputs.lat)===d.observations.coordinates.lat&&Number(d.inputs.lon)===d.observations.coordinates.lon}})}}
function ensureGeo(){if(!geoView)geoView=createGeoWorkspace({document,fetcher:(...args)=>fetch(...args),getContext:geoContext,onError:toast,onSelectField:fid=>{$('field-list').querySelector(`[data-field="${fid}"]`)?.click()},onUseLocation:point=>openFieldSetup({point})});return geoView}
function currentField(){return state.fields.find(f=>f.id===state.active)}
function snapshot(){return {inputs:input(),rawNASA:raw,observations:{source,url,fetchedAt:fetchTime,coordinates:{...observed},year},customSequence:customSequence?[...customSequence]:null,selected,economics:{...economics},localChecks:structuredClone(localChecks)};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('save-state').textContent='Draft saved on device';return true}catch{$('save-state').textContent='Draft not saved';toast('Device storage is unavailable or full. Export your plan to keep a copy.');return false}}
function stash(){if(!ready)return;const f=currentField();if(f)f.draft=snapshot();persist();renderFields();geoView?.update();voiceView?.contextChanged()}
function validate(){if(!ready)throw Error('Wait for the observations to load.');if(!$('farm-form').reportValidity())throw Error('Correct the highlighted field inputs.');if(!matches())throw Error('Refresh NASA observations for these coordinates before saving or exporting.');evaluate({...input(),customSequence},climate)}
function report(){validate();return {project:'FasalPath',version:'2.4.0',createdAt:new Date().toISOString(),outcomeComparison:compareOutcomes(results.find(r=>r.id==='baseline'),results.find(r=>r.id===selected),input().area),financialScreen:economicAnalysis(),decisionBrief:currentDecisionBrief(),fieldId:state.active,mapEvidence:geoView?.evidence(),...snapshot(),climate,results,selectedRotation:results.find(r=>r.id===selected),limitations:'Illustrative, uncalibrated decision proxies. Regional crop set for the irrigated plains of Punjab, Pakistan; not an agronomic prescription.'}}
function openDialog(name,keyboard=false){const d=$(name);d.classList.toggle('instant',keyboard);if(d.showModal)d.showModal();else d.setAttribute('open','');d.querySelector('input,button')?.focus()}
function closeDialog(name){if(name==='field-dialog')fieldSetupVersion++;const d=$(name);if(d.close)d.close();else d.removeAttribute('open')}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>closeDialog(b.dataset.close);
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d.id)}});
const viewInfo={voice:['Plan by voice','Speak to update field inputs and the comparison in real time.'],map:['Where could your water plan come under pressure?','Read regional rainfall and heat signals before choosing what to plant.'],planner:['Should you change your next crop rotation?','Start with your current crops. Check water limits, first-year costs and the local facts that could rule out a switch.'],observations:['Read the season before planning the next','Use past rainfall and heat to question the assumptions behind your crop choice.'],plans:['Plans for your next farm discussion','Keep the expected benefits, costs and unanswered questions together for local review.'],evidence:['Know what supports your decision','Separate NASA observations, model assumptions and the local checks still needed.']};

function syncVoiceFields(next,{changed=[]}={}){
 for(const el of document.querySelectorAll('[data-live-field]')){
  const key=el.dataset.liveField;
  const row=el.closest('li')||el;row.classList.toggle('is-changed',changed.includes(key));
  if(el===document.activeElement)continue;
  const value=next[key];
  if(el.type==='checkbox')el.checked=value;
  else el.value=value??'';
 }
 const dryOut=$('voice-dry-out'),heatOut=$('voice-heat-out');
 if(dryOut)dryOut.textContent=`${next.dry??0}%`;
 if(heatOut)heatOut.textContent=`+${next.heat??0}°C`;
}
function planGlyph(kind,i){
 if(kind==='summer'||kind==='winter'){
  const c=kind==='summer'?i.summer:i.winter;
  return `<span class="crop-icon ${crops[c]?.legume?'legume':''} crop-${c}">${cropIllustration(c)}</span>`;
 }
 if(kind==='soil')return i.soil==='sand'?'▨':i.soil==='clay'?'▦':'⊞';
 if(kind==='priority')return i.priority==='water'?'≋':i.priority==='soil'?'◍':'◎';
 if(kind==='place')return '⌖';
 if(kind==='field')return '⬡';
 if(kind==='area')return '▦';
 if(kind==='irrigation')return '≋';
 if(kind==='stress')return '☀';
 return '•';
}
function planCardData(kind,i){
 const crop=(season,c)=>({label:crops[c]?.name||c,rows:[
  [season,season==='summer'?'Summer season':'Winter season'],
  ['water',`~${n(crops[c]?.water||0)} mm demand`],
  ['family',crops[c]?.legume?'Legume · family break':crops[c]?.family==='brassica'?'Oilseed · brassica':'Cereal · grass family']
 ]});
 if(kind==='summer')return {title:crops[i.summer]?.name||'Summer crop',...crop('Summer',i.summer)};
 if(kind==='winter')return {title:crops[i.winter]?.name||'Winter crop',...crop('Winter',i.winter)};
 if(kind==='soil')return {title:i.soil==='sand'?'Sandy soil':i.soil==='clay'?'Clay soil':'Loam soil',rows:[
  ['type',i.soil==='sand'?'Sandy':i.soil==='clay'?'Clay':'Loam'],
  ['rain',`Effective rain ${i.soil==='sand'?45:i.soil==='clay'?55:65}%`]
 ]};
 if(kind==='priority')return {title:i.priority==='water'?'Conserve water':i.priority==='soil'?'Soil health':'Balanced',rows:[
  ['goal',i.priority==='water'?'Water-first weights':i.priority==='soil'?'Soil-first weights':'Balanced weights'],
  ['focus',i.priority==='water'?'60% water':i.priority==='soil'?'45% soil':'35% water / 30% soil']
 ]};
 if(kind==='place'){
  const place=Object.values(LOCATION_PRESETS).find(p=>p.lat===i.lat&&p.lon===i.lon);
  return {title:place?.name.split(',')[0]||`${i.lat.toFixed(2)}°, ${i.lon.toFixed(2)}°`,rows:[
   ['coords',`${i.lat.toFixed(4)}°, ${i.lon.toFixed(4)}°`],
   ['nasa',matches()?'Observations matched':'Refresh NASA observations']
  ]};
 }
 if(kind==='field')return {title:i.farm||'Your field',rows:[
  ['name',i.farm||'Unnamed field'],
  ['area',`${i.area} ha · ${(i.area*2.47105381).toFixed(1)} acres`]
 ]};
 if(kind==='area')return {title:`${i.area} ha`,rows:[
  ['area',`${i.area} hectares`],
  ['acres',`${(i.area*2.47105381).toFixed(2)} acres`]
 ]};
 if(kind==='irrigation')return {title:`${n(i.irrigation)} mm irrigation`,rows:[
  ['irrigation',`${n(i.irrigation)} mm / year`],
  ['source','Your assumed availability']
 ]};
 if(kind==='stress')return {title:i.dry||i.heat?'Stressed scenario':'Observed baseline',rows:[
  ['dry',`Rain ${i.dry}% below observed`],
  ['heat',`+${i.heat}°C`]
 ]};
 return {title:kind,rows:[]};
}
function renderVoicePlanCards(i,changed=[]){
 const box=$('voice-option-cards'),empty=$('voice-plan-empty');
 if(!box)return;
 const kinds=['field','area','place','summer','winter','soil','irrigation','priority','stress']
  .filter(k=>voicePlanAdded.has(k));
 box.innerHTML=kinds.map(kind=>{
  const d=planCardData(kind,i);
  const rows=d.rows.map(([g,text])=>`<li><span class="voice-opt-glyph" aria-hidden="true">${g==='water'||g==='rain'||g==='irrigation'?'≋':g==='family'||g==='type'?'◍':g==='name'||g==='area'||g==='acres'?'▦':g==='coords'||g==='nasa'?'⌖':g==='goal'||g==='focus'?'◎':g==='dry'||g==='heat'?'☀':'·'}</span><span class="voice-opt-label">${esc(text)}</span></li>`).join('');
  return `<article class="voice-opt-card ${changed.some(c=>planKeyFor(c)===kind)?'is-changed':''}" role="listitem" data-plan-kind="${kind}">
   <button type="button" class="voice-opt-remove" data-plan-remove="${kind}" aria-label="Remove ${esc(d.title)}">×</button>
   <div class="voice-opt-art">${planGlyph(kind,i)}</div>
   <h3>${esc(d.title)}</h3>
   <ul class="voice-opt-rows">${rows}</ul>
  </article>`;
 }).join('');
 if(empty)empty.hidden=kinds.length>0;
}
function renderVoiceStage(changedIds){
 const section=$('voice');
 if(!section||section.hidden||!ready)return;
 const i=input();
 const baseline=results.find(r=>r.id==='baseline'),chosen=results.find(r=>r.id===selected);
 renderVoicePlanCards(i,changedIds||[]);
 const art=$('voice-card-art');
 if(art)art.innerHTML=`<span class="crop-icon ${crops[i.summer]?.legume?'legume':''} crop-${i.summer}">${cropIllustration(i.summer)}</span>`;
 const title=$('voice-card-title');
 if(title)title.textContent=i.farm||'Your field';
 const sIcon=$('voice-summer-icon'),wIcon=$('voice-winter-icon');
 if(sIcon)sIcon.innerHTML=cropIllustration(i.summer);
 if(wIcon)wIcon.innerHTML=cropIllustration(i.winter);
 syncVoiceFields(i,{changed:changedIds||[]});
 const metrics=$('voice-live-metrics');
 if(metrics&&baseline&&chosen){
  metrics.innerHTML=[
   ['Score',chosen.score,'/100'],
   ['Demand',n(chosen.demand),'mm/yr'],
   ['Water gap',n(chosen.deficit),'mm/yr'],
   ['Rain',n(climate.rain*(1-i.dry/100)),'mm']
  ].map(([l,v,u])=>`<div><span>${l}</span><strong>${v} <small>${u}</small></strong></div>`).join('');
 }
 const budget=$('voice-live-budget');
 if(budget&&baseline&&chosen)budget.innerHTML=waterBudgetGraphic(baseline,chosen);
 const strategies=$('voice-live-strategies');
 if(strategies&&results.length){
  strategies.innerHTML=results.map(r=>`<button type="button" data-select="${r.id}" class="voice-strategy ${r.id===selected?'is-selected':''}" aria-pressed="${r.id===selected}"><span>${r.name}</span><strong>${r.score}</strong></button>`).join('');
 }
}

function route(){const target=location.hash.slice(1)||'planner',view=viewInfo[target]?target:'planner';for(const s of document.querySelectorAll('.view'))s.hidden=s.id!==view;for(const a of document.querySelectorAll('nav [data-view]')){const active=a.dataset.view===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}$('page-title').textContent=viewInfo[view][0];$('page-description').textContent=viewInfo[view][1];$('breadcrumb-name').textContent=viewInfo[view][0];if(view==='plans')renderPlans();if(view==='voice')renderVoiceStage();if(view==='map'&&ready){ensureGeo().show()}else geoView?.hide()}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-add-plan]');
 if(add&&ready){
  voicePlanAdded.add(add.dataset.addPlan);
  renderVoiceStage();
  return;
 }
 const rm=e.target.closest('[data-plan-remove]');
 if(rm&&ready){
  voicePlanAdded.delete(rm.dataset.planRemove);
  renderVoiceStage();
  return;
 }
 const b=e.target.closest('#voice-live-strategies [data-select]');if(!b)return;selected=b.dataset.select;renderComparison();renderTimeline();renderVoiceStage();stash()});
document.getElementById('voice')?.addEventListener('input',e=>{
  const el=e.target.closest('[data-live-field]');if(!el||!ready)return;
  const next={...input(),[el.dataset.liveField]:el.type==='number'||el.type==='range'?Number(el.value):el.value};
  applyLiveInputs(next,{live:true,ids:[el.dataset.liveField]});
 });
 document.getElementById('voice')?.addEventListener('change',e=>{
  const el=e.target.closest('[data-live-field]');if(!el||!ready)return;
  const next={...input(),[el.dataset.liveField]:el.type==='number'||el.type==='range'?Number(el.value):el.value};
  applyLiveInputs(next,{live:false,ids:[el.dataset.liveField]});
 });
 window.addEventListener('hashchange',route);
function renderFields(){$('field-list').innerHTML=state.fields.map(f=>`<button class="field-item ${f.id===state.active?'active':''}" data-field="${esc(f.id)}" ${f.id===state.active?'aria-current="true"':''}><span class="field-square"></span><span>${esc(f.draft.inputs.farm||'Unnamed field')}<small>${n(f.draft.inputs.area)} ha</small></span><span class="field-indicator">${f.id===state.active?'●':''}</span></button>`).join('');$('plan-count').textContent=state.plans.length;}
function loadDraft(d){localChecks=structuredClone(d.localChecks||{});economics={...defaultEconomics,...d.economics};setEconomicsInputs();const c=summarize(d.rawNASA,d.observations.year||2024);setInputs(d.inputs);raw=d.rawNASA;climate=c;observed={...d.observations.coordinates};source=d.observations.source;url=d.observations.url;fetchTime=d.observations.fetchedAt;year=d.observations.year||2024;customSequence=d.customSequence||null;selected=d.selected||'water';$('observation-year').value=year;$('fetch-status').textContent=`Loaded NASA observations at ${observed.lat}°, ${observed.lon}°. Coordinate changes require a refresh.`;draw();}
$('field-list').onclick=e=>{const b=e.target.closest('[data-field]');if(!b||b.dataset.field===state.active)return;stash();requestId++;state.active=b.dataset.field;loadDraft(currentField().draft);persist();renderFields();$('field-list').querySelector(`[data-field="${state.active}"]`)?.focus();toast('Field workspace switched.')};
const LOCATION_PRESETS={lahore:{name:'Lahore, Punjab, Pakistan',lat:31.5204,lon:74.3587},islamabad:{name:'Islamabad, Pakistan',lat:33.6844,lon:73.0479},faisalabad:{name:'Faisalabad, Punjab, Pakistan',lat:31.4504,lon:73.135},multan:{name:'Multan, Punjab, Pakistan',lat:30.1575,lon:71.5249},karachi:{name:'Karachi, Sindh, Pakistan',lat:24.8607,lon:67.0011},peshawar:{name:'Peshawar, Pakistan',lat:34.0151,lon:71.5249},quetta:{name:'Quetta, Pakistan',lat:30.1798,lon:66.975},rawalpindi:{name:'Rawalpindi, Punjab, Pakistan',lat:33.5651,lon:73.0169}};
let fieldSetup={},fieldSetupVersion=0;
function setupBusy(busy){fieldSetup.busy=busy;for(const el of $('new-field-form').querySelectorAll('input,select'))el.disabled=busy;$('field-setup-submit').disabled=busy;$('field-setup-submit').textContent=busy?'Retrieving location evidence…':'Save field & location'}
function setupPreset(){const lat=Number($('setup-lat').value),lon=Number($('setup-lon').value);$('setup-preset').value=Object.entries(LOCATION_PRESETS).find(([,p])=>p.lat===lat&&p.lon===lon)?.[0]||'custom'}
function openFieldSetup({mode='add',point=null}={}){
 if(!ready)return;fieldSetupVersion++;fieldSetup={mode,fieldId:state.active,year:point?.year||year};setupBusy(false);const i=input();$('field-dialog-title').textContent=mode==='edit'?'Edit saved field location':'Add a field';$('new-field-name').value=mode==='edit'?i.farm:point?'Map location field':'';$('new-field-area').value=mode==='edit'?i.area:10;$('setup-lat').value=point?.lat??(mode==='edit'?i.lat:defaults.lat);$('setup-lon').value=point?.lon??(mode==='edit'?i.lon:defaults.lon);setupPreset();$('field-setup-status').textContent='Save this location once. Matching NASA observations are required before it becomes the active planning context.';openDialog('field-dialog');$(mode==='edit'?'setup-lat':'new-field-name').focus();
}
$('setup-preset').onchange=()=>{const p=LOCATION_PRESETS[$('setup-preset').value];if(p){$('setup-lat').value=p.lat;$('setup-lon').value=p.lon}};
$('setup-lat').oninput=setupPreset;$('setup-lon').oninput=setupPreset;
$('add-field').onclick=()=>openFieldSetup();$('add-field-location').onclick=()=>openFieldSetup();$('edit-field-location').onclick=()=>openFieldSetup({mode:'edit'});$('observations-edit-location').onclick=()=>openFieldSetup({mode:'edit'});
$('field-dialog').addEventListener('close',()=>{fieldSetupVersion++});
async function locationEvidence(lat,lon,targetYear){
 const known=state.fields.map(f=>f.draft).find(d=>d.observations.coordinates.lat===lat&&d.observations.coordinates.lon===lon);
 if(known){summarize(known.rawNASA,targetYear);return {rawNASA:known.rawNASA,observations:{...known.observations,coordinates:{lat,lon},year:targetYear}}}
 if(lat===defaults.lat&&lon===defaults.lon){summarize(exampleRaw,targetYear);return {rawNASA:exampleRaw,observations:{...bundledDraft().observations,year:targetYear}}}
 const requestURL=api(lat,lon),r=await fetch(requestURL,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`NASA returned HTTP ${r.status}`);const data=await r.json();summarize(data,targetYear);return {rawNASA:data,observations:{source:'live API retrieval',url:requestURL,fetchedAt:new Date().toISOString(),coordinates:{lat,lon},year:targetYear}};
}
$('new-field-form').onsubmit=async e=>{
 e.preventDefault();if(fieldSetup.busy||!ready||!$('new-field-form').reportValidity())return;
 const lat=Number($('setup-lat').value),lon=Number($('setup-lon').value),name=$('new-field-name').value.trim()||'Untitled field',area=Number($('new-field-area').value),operation={...fieldSetup},generation=++fieldSetupVersion;setupBusy(true);$('field-setup-status').textContent='Retrieving matching NASA observations. Your current field is unchanged until this succeeds.';
 try{const evidence=await locationEvidence(lat,lon,operation.year);if(generation!==fieldSetupVersion)return;if(operation.mode==='edit'&&state.active!==operation.fieldId)throw Error('The active field changed. Reopen field setup.');stash();const previous=structuredClone(state);let field;
  if(operation.mode==='edit'){field=currentField();const changed=field.draft.inputs.lat!==lat||field.draft.inputs.lon!==lon;field.draft={...snapshot(),...evidence,inputs:{...input(),farm:name,area,lat,lon},localChecks:changed?{}:structuredClone(localChecks)}}
  else {const draft=structuredClone(bundledDraft());draft.inputs={...defaults,farm:name,area,lat,lon};Object.assign(draft,evidence);field={id:id(),draft};state.fields.push(field);state.active=field.id}
  requestId++;loadDraft(field.draft);if(!persist()){state=previous;loadDraft(currentField().draft);renderFields();throw Error('Device storage could not save this location. Existing fields were retained.')}
  renderFields();setupBusy(false);closeDialog('field-dialog');location.hash='planner';toast(operation.mode==='edit'?'Saved location updated. Future planning uses it automatically.':'Field and location saved. You will not need to enter it again.');
 }catch(error){if(generation===fieldSetupVersion)$('field-setup-status').textContent=`Could not save the location: ${error.message}. Your previous field remains unchanged.`}
 finally{if(generation===fieldSetupVersion)setupBusy(false)}
};

let exampleRaw;
function bundledDraft(){return {inputs:{...defaults},rawNASA:exampleRaw,observations:{source:'saved NASA snapshot',url:api(31.5204,74.3587),fetchedAt:'2026-11-14',coordinates:{lat:31.5204,lon:74.3587},year:2024},customSequence:null,selected:'water'}}
function draw(){if(!ready)return;const i=input();renderSavedLocation();$('active-field-label').textContent=i.farm||'Unnamed field';$('area-acres').textContent=`Equivalent to ${(i.area*2.47105381).toFixed(2)} acres`;$('dry-value').textContent=`${i.dry}%`;$('heat-value').textContent=`+${i.heat}°C`;$('header-year').textContent=year;
 for(const b of document.querySelectorAll('[data-preset]')){const active=b.dataset.preset==='observed'?i.dry===0&&i.heat===0:b.dataset.preset==='dry'?i.dry===30&&i.heat===0:i.dry===30&&i.heat===2;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}
 const valid=$('farm-form').checkValidity()&&matches();$('planner').classList.toggle('stale',!valid);$('save').disabled=!valid;$('save-selected').disabled=!valid;$('customize').disabled=!valid;
 if(!valid){$('fetch-status').textContent=matches()?'Correct the field inputs to update the comparison.':'Coordinates changed. Refresh NASA observations. The comparison below remains from the last valid context.';$('rank-label').textContent='Inputs changed · comparison pending valid inputs and matching observations';renderOutcomePause();renderDecisionBrief();geoView?.update();voiceView?.contextChanged();return}
 try{results=evaluate({...i,customSequence},climate)}catch(e){toast(e.message);return}
 if(!results.some(r=>r.id===selected))selected=results[0].id;
 $('data-label').textContent=`NASA POWER · ${year} · ${source}`;$('map-location').textContent=observed.lat===31.5204&&observed.lon===74.3587?'Lahore, Punjab, Pakistan':`${observed.lat.toFixed(2)}°, ${observed.lon.toFixed(2)}°`;$('observation-location').textContent=`Grid-cell meteorological context · ${observed.lat}°, ${observed.lon}° · MERRA-2 reanalysis`;
 const metrics=[['Annual rainfall',n(climate.rain),'mm','Corrected precipitation'],['Air temperature',climate.temp.toFixed(1),'°C','Mean of monthly 2 m readings'],['Root-zone wetness',climate.wet.toFixed(2),'/ 1','Modelled wetness · not field moisture'],['Vegetation context',i.ndvi===''?'Not supplied':Number(i.ndvi).toFixed(2),'NDVI','Local observation · excluded from scores']];
 $('metrics').innerHTML=metrics.map(([title,v,u,d])=>`<article class="metric"><div class="metric-top">${title}</div><div class="metric-value">${v} <small>${u}</small></div><p>${d}</p></article>`).join('');
 const best=results[0],baseline=results.find(r=>r.id==='baseline'),chosen=results.find(r=>r.id===selected);
 $('scenario-metrics').innerHTML=[['Scenario rainfall',`${n(climate.rain*(1-i.dry/100))} <small>mm</small>`,i.dry?`${i.dry}% below observed`:'Observed annual total'],['Selected option demand',`${n(chosen.demand)} <small>mm / yr</small>`,chosen.name],['Current rotation water gap',`${n(baseline.deficit)} <small>mm / yr</small>`,'After effective rain & irrigation']].map(([label,v,note])=>`<div><span>${label}</span><strong>${v}</strong><small>${note}</small></div>`).join('');
 $('rank-label').textContent=`${results.length} strategies · ${i.priority==='balanced'?'Balanced resilience':i.priority==='water'?'Water-first':'Soil-first'} weights · ${year} historical baseline`;
 renderComparison();renderTimeline();renderChart();
 $('insight').textContent=`The ${year} record contains ${n(climate.rain)} mm of rainfall and a warmest monthly mean of ${Math.max(...climate.temps).toFixed(1)}°C. Rainfall timing matters as much as the annual total. Use these readings alongside local planting windows, soil tests and irrigation records.`;
 $('lineage').textContent=`Location ${observed.lat}°, ${observed.lon}° · retrieved ${fetchTime} · MERRA-2 via NASA POWER · API ${raw.header?.api?.version??'monthly'} · available 2023–2024. Ranking uses the selected year: ${year}.`;$('source-link').href=url;geoView?.update();voiceView?.contextChanged();
}
function renderComparison(){const sorted=[...results].sort($('sort').value==='demand'?(a,b)=>a.demand-b.demand:$('sort').value==='soil'?(a,b)=>b.soil-a.soil:(a,b)=>b.score-a.score);$('results').innerHTML=sorted.map(r=>`<tr class="rotation ${selected===r.id?'selected':''}"><td><button class="rotation-select" data-select="${r.id}" aria-pressed="${selected===r.id}"><span class="selection-dot"></span><span>${r.name}<small>${r.id==='baseline'?'Your current practice':r.id==='custom'?'Your proposed change':r.id==='water'?'Lower annual demand in the model':r.id==='balanced'?'Keeps both wheat seasons':'Adds pulse and oilseed seasons'}</small></span></button></td><td><span class="score-pill ${results[0].id===r.id?'leading':''}">${r.score}</span><span class="score-denominator"> / 100</span></td><td>${n(r.demand)} <small>mm</small></td><td>${n(r.deficit)} <small>mm</small></td><td><div class="soil-meter"><span>${r.soil}</span><span class="bar"><i style="transform:scaleX(${r.soil/100})"></i></span></div></td></tr>`).join('')}
$('results').onclick=e=>{const b=e.target.closest('[data-select]');if(!b)return;selected=b.dataset.select;renderComparison();renderTimeline();$('results').querySelector(`[data-select="${selected}"]`)?.focus();stash()};$('sort').onchange=renderComparison;
function renderTimeline(){const r=results.find(x=>x.id===selected);if(!r)return;const base=results.find(x=>x.id==='baseline'),i=input();$('water-balance-chart').innerHTML=waterBudgetGraphic(base,r);$('selected-title').textContent=r.name;$('customize').textContent=r.id==='custom'?'Discard custom rotation':'Customize sequence';$('custom-hint').hidden=r.id!=='custom';
 $('timeline').innerHTML=r.sequence.map((c,k)=>`<div class="season"><div class="season-header"><span>YEAR ${Math.floor(k/2)+1}</span><span>${k%2?'WINTER':'SUMMER'}</span></div><div class="crop-icon ${crops[c].legume?'legume':''} crop-${c}">${cropIllustration(c)}</div>${r.id==='custom'?`<label><span class="sr-only">Year ${Math.floor(k/2)+1} ${k%2?'winter':'summer'} crop</span><select data-season="${k}">${Object.entries(crops).filter(([key])=>(k%2?['wheat','chickpea','mustard']:['rice','maize','millet','mung']).includes(key)).map(([key,crop])=>`<option value="${key}" ${key===c?'selected':''}>${crop.name}</option>`).join('')}</select></label>`:`<strong>${crops[c].name}</strong>`}<span class="crop-family">${crops[c].legume?'Legume · family break':crops[c].family==='brassica'?'Oilseed · brassica':'Cereal · grass family'}</span><span class="crop-water">~${n(crops[c].water)} mm demand</span></div>`).join('');
 const saving=base.demand-r.demand;
 $('recommendation').innerHTML=`<span class="recommendation-icon">↗</span><div><strong>${saving>0?`${n(saving)} mm less annual demand than your baseline`:saving<0?`${n(-saving)} mm more annual demand than your baseline`:'Your current practice is the reference'}</strong><p>${saving>0?`A demand equivalent of ${n(saving*i.area*10)} m³ across ${n(i.area)} ha in the illustrative model; this is not water already saved. `:''}Water still needed beyond the assumed rain and irrigation: ${n(r.deficit)} mm/year. Family changes: ${Math.round(r.breaks*3/100)} of 3 transitions. Soil-protection proxy: ${r.erosion}/100.</p></div>`;
 $('selected-note').textContent=`${r.note} ${observed.lat<29||observed.lat>33.75||observed.lon<69.6875||observed.lon>75.3125?'Outside the regional demonstrator: this crop portfolio may be unsuitable.':''}`;renderFarmOutcomes();renderEconomics();
}
$('customize').onclick=()=>{if(!matches())return;if(customSequence&&selected==='custom'){customSequence=null;selected='water'}else{customSequence=[...results.find(r=>r.id===selected).sequence];selected='custom'}draw();stash()};
$('timeline').onchange=e=>{if(e.target.dataset.season===undefined)return;customSequence[Number(e.target.dataset.season)]=e.target.value;selected='custom';const season=e.target.dataset.season;draw();$('timeline').querySelector(`[data-season="${season}"]`)?.focus();stash()};
function renderOutcomePause(){$('water-balance-chart').innerHTML='<p class="caption">Update field inputs and matching observations to refresh this comparison.</p>';
 $('outcome-title').textContent='Refresh your field context before weighing this option';$('outcome-cards').replaceChildren();$('outcome-tradeoff').textContent='The earlier comparison is paused because field inputs are incomplete or observations do not match the edited coordinates.';$('economic-result').innerHTML='<p class="caption">Cost screen paused until the field inputs and NASA location match.</p>';
}
function renderFarmOutcomes(){
 const baseline=results.find(r=>r.id==='baseline'),r=results.find(r=>r.id===selected);if(!r)return;
 const o=compareOutcomes(baseline,r,input().area),water=o.demandReductionMm>0?`${n(o.demandReductionPct)}% lower`:o.demandReductionMm<0?`${n(-o.demandReductionPct)}% higher`:'Same demand';
 $('outcome-title').textContent=r.id==='baseline'?'Start with the water constraint in your current practice':`What could ${r.name.toLowerCase()} change for you?`;
 const cards=[['Pressure on your water budget',water,`${n(baseline.demand)} → ${n(r.demand)} mm/year of indicative demand`],['Water the plan still lacks',`${n(r.deficit)} mm/yr`,`${n(baseline.deficit)} mm/year in your current rotation. ${r.deficit===0?'Annual zero does not guarantee in-season sufficiency.':'Timing and irrigation losses still need local review.'}`],['Management support for soil',`${o.soilSupportChange>0?'+':''}${o.soilSupportChange} points`,'Change in soil-support proxy; not measured soil improvement'],['Crop-family repetition',`${Math.round(r.breaks*3/100)} of 3`,'Transitions that change crop family; not a disease forecast']];
 $('outcome-cards').innerHTML=cards.map(([label,value,description])=>`<div><span>${label}</span><strong>${value}</strong><p>${description}</p></div>`).join('');
 const tradeoff=r.id==='baseline'?'Keeping familiar crops can avoid switching effort. Check whether the remaining water gap and repeated crop families still fit your constraints.':r.id==='water'?'Before switching: confirm buyers for millet and pulses, seed access, drainage and local sowing windows. Lower modelled water demand does not establish a better crop margin.':r.id==='balanced'?'Keeping wheat in both winters can limit how much changes at once. Confirm summer pulse establishment, labour availability and what buyers will pay.':r.id==='diverse'?'A pulse and an oilseed change the crop-family sequence. Check harvest timing, seed access and buyers before trading a familiar market for a new one.':'For your custom sequence, check each crop’s local planting window, buyers, equipment and labour requirements. A model score does not establish agronomic suitability.';
 $('outcome-tradeoff').textContent=tradeoff;
}
function renderSavedLocation(){const i=input(),place=Object.values(LOCATION_PRESETS).find(p=>p.lat===i.lat&&p.lon===i.lon);$('saved-location-name').textContent=place?.name||'Saved field coordinates';$('saved-location-coordinates').textContent=`${i.lat.toFixed(4)}°, ${i.lon.toFixed(4)}° · ${matches()?'location saved':'matching observations needed'}`}
function checkValues(){const r=results.find(r=>r.id===selected);return r?localChecks[rotationCheckKey(r.sequence)]||{}:{}}
function currentDecisionBrief(){return buildDecisionBrief({valid:ready&&$('farm-form').checkValidity()&&matches(),rotation:results.find(r=>r.id===selected),financial:economicAnalysis(),checks:checkValues()})}
function renderDecisionBrief(){const brief=currentDecisionBrief();$('brief-title').textContent=brief.title;$('brief-explanation').textContent=brief.body;$('brief-next').textContent=brief.button;$('brief-next').dataset.action=brief.action;$('brief-check-count').textContent=`${brief.checked}/${brief.total} recorded`;$('local-checks').innerHTML=LOCAL_CHECKS.map(c=>`<label class="check"><input type="checkbox" data-local-check="${c.id}" ${checkValues()[c.id]?'checked':''}>${c.label}</label>`).join('');}
$('local-checks').onchange=e=>{const key=e.target.dataset.localCheck,r=results.find(r=>r.id===selected);if(!key||!r)return;const sequenceKey=rotationCheckKey(r.sequence);localChecks[sequenceKey]={...(localChecks[sequenceKey]||{}),[key]:e.target.checked};renderDecisionBrief();$('local-checks').querySelector(`[data-local-check="${key}"]`)?.focus();stash()};
$('brief-next').onclick=()=>{const action=$('brief-next').dataset.action;if(action==='save'){prepareDecision();return}if(action==='checks'){$('local-checks').querySelector('input:not(:checked)')?.focus();return}if(action==='refresh'){$('fetch').click();return}const target=action==='water'?$('irrigation'):action==='cost'?$('pumping-cost'):$('results').querySelector('[data-select]:not([data-select="baseline"])');target?.scrollIntoView?.({block:'center'});target?.focus()};

function setEconomicsInputs(){for(const [key,id] of Object.entries({currency:'cost-currency',pumpingCost:'pumping-cost',marginChange:'margin-change',transitionCost:'transition-cost'}))$(id).value=economics[key]}
function economicAnalysis(){
 if(!ready||!$('farm-form').checkValidity()||!matches())return {status:'unavailable',reason:'Field context is incomplete or coordinates do not match observations.'};
 if(selected==='baseline')return {status:'reference',reason:'Select an alternative rotation to screen switching costs.'};
 try{if(!$('economics-form').checkValidity())throw Error('Correct the cost inputs; pumping and switching costs cannot be negative.');const result=screenEconomics({baseline:results.find(r=>r.id==='baseline'),selected:results.find(r=>r.id===selected),area:input().area,irrigation:input().irrigation,economics});return result?{status:'scenario',...result}:{status:'incomplete',reason:'Enter all three local assumptions, including zero where appropriate. No prices or yields are assumed.'}}catch(e){return {status:'invalid',reason:e.message}}
}
function renderEconomics(){
 renderDecisionBrief();const analysis=economicAnalysis();if(analysis.status!=='scenario'){$('economic-result').innerHTML=`<div class="economics-empty"><strong>${analysis.status==='reference'?'Your current crops are the reference':analysis.status==='invalid'?'Check your assumptions':'Use your costs to see the trade-off'}</strong><p>${esc(analysis.reason)}</p></div>`;return}
 const money=v=>new Intl.NumberFormat(undefined,{style:'currency',currency:analysis.currency,currencyDisplay:'code',maximumFractionDigits:0}).format(v);
 const verdict=analysis.firstYearNetChange>0?'The first-year balance improves under your assumptions.':analysis.firstYearNetChange<0?'The switch needs a better crop margin or lower costs to break even.':'The first-year screen is at break-even under your assumptions.';
 $('economic-result').innerHTML=`<div class="economic-verdict ${analysis.firstYearNetChange<0?'negative':''}"><span>ILLUSTRATIVE FIRST-YEAR CHANGE · WHOLE FIELD</span><strong>${analysis.firstYearNetChange>0?'+':''}${money(analysis.firstYearNetChange)}</strong><p>${verdict}</p></div><dl class="economic-breakdown"><div><dt>Hypothetical variable pumping-cost reduction</dt><dd>${money(analysis.pumpingCostChange)}</dd></div><div><dt>Your assumed crop-margin change</dt><dd>${money(analysis.cropMarginChange)}</dd></div><div><dt>First-year switching costs</dt><dd>${money(analysis.firstYearSwitchingCost)}</dd></div><div><dt>Crop-margin change needed to break even</dt><dd>${money(analysis.breakEvenCropMarginPerHa)} /ha</dd></div></dl><p class="caption">Based on ${n(analysis.applicationReductionM3)} m³ less hypothetical applied irrigation, capped by your available water. Actual bills, yields and prices may differ. This calculation does not predict profit.</p>`;
}
$('economics-form').onsubmit=e=>e.preventDefault();
for(const [key,id] of Object.entries({currency:'cost-currency',pumpingCost:'pumping-cost',marginChange:'margin-change',transitionCost:'transition-cost'}))$(id).addEventListener('input',()=>{economics[key]=$(id).value;renderEconomics();stash()});

const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function renderChart(){const left=36,top=16,height=160,rmax=Math.max(100,Math.ceil(Math.max(...climate.monthly)/100)*100);let svg=`<svg viewBox="0 0 600 210" role="img" aria-label="${year} monthly rainfall and air temperature"><title>${year} rainfall and temperature. Monthly values available in the month controls below.</title>`;
 for(let j=0;j<4;j++){const y=top+height-j*height/3;svg+=`<path d="M36 ${y}H552" class="chart-grid"/><text x="28" y="${y+3}" text-anchor="end" class="axis-label">${Math.round(rmax*j/3)}</text><text x="560" y="${y+3}" class="axis-label">${Math.round(50*j/3)}</text>`}
 climate.monthly.forEach((v,j)=>{const x=left+j*43+10;svg+=`<rect x="${x}" y="${top+height-v/rmax*height}" width="22" height="${v/rmax*height}" rx="3" class="rain-bar ${j===month?'inspected':''}"><title>${months[j]}: ${v.toFixed(1)} mm; ${climate.temps[j]} °C</title></rect><text x="${x+11}" y="199" text-anchor="middle" class="axis-label">${months[j]}</text>`});
 svg+=`<polyline fill="none" class="temperature-line" stroke-width="2" points="${climate.temps.map((t,j)=>`${left+j*43+21},${top+height-t/50*height}`).join(' ')}"/></svg>`;$('chart').innerHTML=svg;
 $('month-controls').innerHTML=months.map((m,j)=>`<button data-month="${j}" class="${j===month?'active':''}" aria-pressed="${j===month}">${m}</button>`).join('');$('month-detail').innerHTML=`<strong>${months[month]} ${year}</strong><span>${climate.monthly[month].toFixed(1)} mm rain</span><span>${climate.temps[month].toFixed(1)}°C air</span><span>${raw.properties.parameter.GWETROOT[`${year}${String(month+1).padStart(2,'0')}`].toFixed(2)} wetness</span>`;
}
$('month-controls').onclick=e=>{const b=e.target.closest('[data-month]');if(!b)return;month=Number(b.dataset.month);renderChart();$('month-controls').querySelector(`[data-month="${month}"]`).focus()};
$('observation-year').onchange=()=>{try{year=Number($('observation-year').value);climate=summarize(raw,year);draw();stash()}catch(e){toast(e.message)}};
function update(){if(!ready)return;draw();stash()}
$('farm-form').onsubmit=e=>{e.preventDefault();update();if(matches())toast('Comparison updated with your field context.')};
for(const k of fields)$(k).addEventListener(k==='dry'||k==='heat'?'input':'change',update);
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{const p=b.dataset.preset;$('dry').value=p==='observed'?0:30;$('heat').value=p==='hot'?2:0;update()};$('reset-scenario').onclick=()=>{$('dry').value=0;$('heat').value=0;update()};
$('toggle-editor').onclick=()=>{const collapsed=$('context-body').hidden;$('context-body').hidden=!collapsed;$('toggle-editor').setAttribute('aria-expanded',String(collapsed));$('toggle-editor').textContent=collapsed?'−':'+'};
$('fetch').onclick=async()=>{if(!ready||!$('farm-form').reportValidity())return;const i=input(),rid=++requestId,field=state.active,requestURL=api(i.lat,i.lon);$('fetch').disabled=true;$('fetch').setAttribute('aria-busy','true');$('fetch').textContent='Retrieving NASA data…';$('fetch-status').textContent='Retrieving historical observations for 2023–2024…';
 try{const response=await fetch(requestURL,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`NASA returned HTTP ${response.status}`);const data=await response.json(),summary=summarize(data,year);if(rid!==requestId||field!==state.active)return;raw=data;climate=summary;observed={lat:i.lat,lon:i.lon};source='live API retrieval';url=requestURL;fetchTime=new Date().toISOString();$('fetch-status').textContent='NASA observations refreshed. Historical context is ready.';draw();stash();toast('NASA observations refreshed.')}
 catch(e){if(rid===requestId&&field===state.active)$('fetch-status').textContent=`Could not retrieve NASA data: ${e.message}. Previous observations retained. No synthetic data substituted.`}
 finally{$('fetch').disabled=false;$('fetch').removeAttribute('aria-busy');$('fetch').textContent='Refresh NASA observations'}};
function prepareDecision(){try{const r=report(),rotation=r.selectedRotation;$('decision-name').value=`${input().farm} · ${rotation.name}`;$('decision-notes').value='';$('decision-summary').textContent=`${rotation.name} · ${n(r.outcomeComparison.demandReductionMm)} mm annual demand reduction against your current rotation (modelled). Record what must be checked locally before planting.`;openDialog('decision-dialog')}catch(e){toast(e.message)}}
$('save').onclick=prepareDecision;$('save-selected').onclick=prepareDecision;
$('decision-form').onsubmit=e=>{e.preventDefault();if(!$('decision-form').reportValidity())return;try{const r=report();const plan={id:id(),name:$('decision-name').value.trim()||'Untitled decision',notes:$('decision-notes').value,createdAt:new Date().toISOString(),report:r};state.plans.unshift(plan);if(!persist()){state.plans.shift();return}renderFields();renderPlans();closeDialog('decision-dialog');toast('Decision saved with its NASA evidence.')}catch(e){toast(e.message)}};
function planOutcomeLabel(p){const o=p.report.outcomeComparison;if(!o)return `${p.report.selectedRotation?.score??'—'} <small>model score</small>`;return `${n(Math.abs(o.demandReductionPct))}% <small>${o.demandReductionPct>=0?'lower':'higher'} demand · modelled</small>`}
function renderPlans(){const q=$('plan-search').value.trim().toLowerCase(),plans=state.plans.filter(p=>`${p.name} ${p.notes} ${p.report.inputs.farm}`.toLowerCase().includes(q));$('saved-plans').innerHTML=plans.length?plans.map(p=>`<article class="saved-plan panel"><div class="saved-plan-header"><div><span class="review-badge">FOR LOCAL REVIEW</span><h3>${esc(p.name)}</h3><p class="caption">${esc(p.report.inputs.farm)} · ${new Date(p.createdAt).toLocaleDateString()} · ${p.report.observations.year} NASA baseline</p></div><span class="score-pill leading">${planOutcomeLabel(p)}</span></div><div class="saved-sequence">${(p.report.selectedRotation?.sequence||[]).map(c=>esc(crops[c]?.name||c)).join('<span>→</span>')}</div><p>${esc(p.notes||'Add buyer, seed and planting-window checks before committing.')}</p><div class="saved-plan-footer"><span class="caption">Rainfall −${p.report.inputs.dry}% · Temperature +${p.report.inputs.heat}°C</span><div><button class="secondary" data-plan-export="${esc(p.id)}">Export</button><button class="secondary" data-plan-restore="${esc(p.id)}">Open snapshot</button><button class="icon-button delete-button" data-plan-delete="${esc(p.id)}" aria-label="Delete ${esc(p.name)}">×</button></div></div></article>`).join(''):`<div class="empty-state panel"><span>▤</span><h2>${q?'No matching decisions':'A plan worth discussing starts with your field'}</h2><p>${q?'Try a different name or planning note.':'Weigh water demand, switching costs and local checks, then keep an option here for review.'}</p>${q?'':'<a href="#planner" class="primary">Open rotation workspace ↗</a>'}</div>`}
$('plan-search').oninput=renderPlans;
$('saved-plans').onclick=e=>{const b=e.target.closest('button');if(!b)return;const pid=b.dataset.planExport||b.dataset.planRestore||b.dataset.planDelete,p=state.plans.find(p=>p.id===pid);if(!p)return;if(b.dataset.planExport){download(p.report,`fasalpath-decision-${p.id}.json`);return}if(b.dataset.planRestore){stash();let field=state.fields.find(f=>f.id===p.report.fieldId);if(!field){field={id:id(),draft:null};state.fields.push(field)}state.active=field.id;requestId++;loadDraft(p.report);stash();location.hash='planner';toast('Decision snapshot opened as the current draft.');return}const index=state.plans.indexOf(p);state.plans.splice(index,1);if(!persist()){state.plans.splice(index,0,p);return}renderPlans();renderFields();toast('Decision removed.',()=>{state.plans.splice(index,0,p);persist();renderPlans();renderFields()})};
function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
$('export').onclick=()=>{try{download(report(),'fasalpath-plan.json')}catch(e){toast(e.message)}};$('print').onclick=()=>{try{report();window.print()}catch(e){toast(e.message)}};
const actions=[['Check regional water pressure','Inspect rainfall and heat on the map','map'],['Plan your next rotation','Weigh water demand and switching costs','planner'],['Read seasonal conditions','Question your rainfall assumptions','observations'],['Saved decisions','Revisit plans for local review','plans'],['Model & sources','Review model assumptions','evidence'],['Add a field','Create another planning context','add'],['Save a decision','Keep the selected rotation','save'],['Switch appearance','Toggle light or dark theme','theme']];
function renderCommands(){const q=$('command-search').value.toLowerCase(),filtered=actions.filter(a=>`${a.join(' ')} ${a.slice(0,2).map(text=>locale?.translate(text)||text).join(' ')}`.toLowerCase().includes(q));$('command-results').innerHTML=filtered.length?filtered.map(a=>`<button data-command="${a[2]}"><span>${a[0]}<small>${a[1]}</small></span><span>↗</span></button>`).join(''):'<p class="caption command-hint">No matching actions. Try “field” or “observations”.</p>'}
function openCommands(keyboard=false){$('command-search').value='';renderCommands();openDialog('command-dialog',keyboard);$('command-search').focus()}
$('command-trigger').onclick=()=>openCommands();$('command-search').oninput=renderCommands;$('command-search').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();$('command-results').querySelector('button')?.focus()}if(e.key==='Enter')$('command-results').querySelector('button')?.click()};
$('command-results').onkeydown=e=>{if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const buttons=[...$('command-results').querySelectorAll('button')],k=buttons.indexOf(document.activeElement);buttons[(k+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()};
$('command-results').onclick=e=>{const b=e.target.closest('[data-command]');if(!b)return;closeDialog('command-dialog');const action=b.dataset.command;if(viewInfo[action]){location.hash=action;$('page-title').setAttribute('tabindex','-1');$('page-title').focus()}else if(action==='add')$('add-field').click();else if(action==='save')prepareDecision();else $('theme-toggle').click()};
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommands(true)}});
function applyTheme(theme){document.documentElement.dataset.theme=theme;$('theme-toggle').innerHTML=`${icon(theme==='dark'?'sun':'moon')} <span>${theme==='dark'?'Light':'Dark'} appearance</span>`;$('theme-toggle').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} theme`)}
try{applyTheme(localStorage.getItem('fieldshift-theme')||'light')}catch{applyTheme('light')}
$('theme-toggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);try{localStorage.setItem('fieldshift-theme',theme)}catch{}};
async function init(){try{const response=await fetch('data/power-lahore.json');if(!response.ok)throw Error('Bundled NASA observations could not load');exampleRaw=await response.json();summarize(exampleRaw);let restored=false;
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===2&&Array.isArray(saved.fields)&&saved.fields.length&&Array.isArray(saved.plans)){for(const f of saved.fields){summarize(f.draft.rawNASA,f.draft.observations.year);if(!f.draft.inputs||!f.draft.observations.coordinates)throw Error('Invalid draft')}if(!saved.fields.some(f=>f.id===saved.active))saved.active=saved.fields[0].id;state=saved;restored=true}}catch{toast('Could not restore workspace. The NASA example is available; export new work to keep a backup.')}
 if(!restored){let draft=bundledDraft();try{const old=JSON.parse(localStorage.getItem('fieldshift-plan-v1')||'null');if(old?.rawNASA&&old?.inputs){summarize(old.rawNASA);draft={...draft,...old,observations:{...old.observations,year:2024}}}}catch{}state.fields=[{id:'field-1',draft}];state.active='field-1'}
 ready=true;$('export').disabled=false;loadDraft(currentField().draft);renderFields();renderPlans();route();$('app-loading').hidden=true;
 voiceLive=createVoiceLive({document,
  deepgramKey:globalThis.__FIELDSHIFT_CONFIG?.deepgramKey||'',
  onLiveInputs:(next,meta)=>{
   const before=input();
   const ids=VOICE_CHANGE_KEYS.filter(k=>String(before[k]??'')!==String(next[k]??''));
   applyLiveInputs(next,{live:true,ids});
  },
  onCommit:next=>{
   const before=input();
   const ids=VOICE_CHANGE_KEYS.filter(k=>String(before[k]??'')!==String(next[k]??''));
   if(!ids.length)return;
   applyLiveInputs(next,{live:false,ids});
   const moved=ids.includes('lat')||ids.includes('lon');
   if(moved&&!matches()){
    toast('Location set from voice — refreshing NASA observations…');
    $('fetch').click();
    return;
   }
   if(moved){toast('Location updated from voice.');return}
   toast(ids.some(k=>k==='dry'||k==='heat')?'Scenario updated by voice.':'Comparison updated by live voice.');
  },
  onError:message=>toast(message)
 });
 $('voice-live-toggle').onclick=()=>voiceLive?.toggle();
 }catch(e){$('app-loading').innerHTML=`<strong>Observations could not load</strong><p>${esc(e.message)}</p><button class="secondary" id="retry-startup">Retry loading</button>`;$('retry-startup').onclick=init;$('save').disabled=true;$('export').disabled=true;}}
function voiceContext(){return {valid:ready&&$('farm-form').checkValidity()&&matches(),inputs:input(),baseline:results.find(r=>r.id==='baseline'),selectedRotation:results.find(r=>r.id===selected),financialScreen:economicAnalysis()}}
document.documentElement.lang='en';document.documentElement.dir='ltr';
dictation=createUrduDictation({document,getLanguage:()=>locale.language,fetcher:(...args)=>fetch(...args),onStartCapture:()=>voiceView?.stop(),onUseQuestion:text=>{$('voice-question').value=text;document.querySelector('.optional-read-aloud').open=true;$('voice-details').open=true;$('voice-question').focus();toast('Urdu transcript placed in your question. Review it before continuing.')},onUseNotes:text=>{try{prepareDecision();if($('decision-dialog').open||$('decision-dialog').hasAttribute('open')){$('decision-notes').value=$('decision-notes').value?`${$('decision-notes').value}\n${text}`:text;$('decision-notes').focus()}}catch(e){toast(e.message)}}});
voiceView=createVoiceHelp({document,getContext:voiceContext,getLanguage:()=>locale.language,onMap:()=>{location.hash='map'},onDictate:()=>{document.querySelector('.dictation-disclosure').open=true;dictation?.focus()}});
for(const element of document.querySelectorAll('[data-icon]'))element.innerHTML=icon(element.dataset.icon);
init();
