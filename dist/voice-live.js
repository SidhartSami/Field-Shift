// Live voice → field inputs. Pattern adapted from CoffeeBrew: streaming
// transcript (interim + final), pure parse → facts, pure fold onto inputs.
//
// Primary engine: Deepgram nova-3 over WebSocket (same as CoffeeBrew) when a
// key is supplied. Fallback: browser SpeechRecognition (en-US).
// This does not replace Urdu dictation; it drives planning inputs live.

export const SOIL_MAP = {loam:'loam',loamy:'loam',sandy:'sand',sand:'sand',clay:'clay',clayey:'clay'};
export const SUMMER_CROPS = {rice:'rice',paddy:'rice',maize:'maize',corn:'maize',millet:'millet','pearl millet':'millet',mung:'mung','mung bean':'mung','mungbean':'mung'};
export const WINTER_CROPS = {wheat:'wheat',chickpea:'chickpea',chana:'chickpea',mustard:'mustard'};
// Speech-only: allow naming a summer crop as the winter crop when the speaker says so.
export const WINTER_SPEECH_CROPS = {...WINTER_CROPS,maize:'maize',millet:'millet',rice:'rice',mung:'mung'};
export const PRIORITY_MAP = {balanced:'balanced',balance:'balanced',water:'water',soil:'soil'};
export const UNIT_AREA = {acre:'acres',acres:'acres',acreage:'acres',hectare:'hectares',hectares:'hectares',ha:'hectares'};
const AREA_PER = {acres:0.40468564224,hectares:1};
/** Known Pakistan places → coordinates (same set as planner LOCATION_PRESETS + extras). */
export const PLACE_MAP = {
 lahore:{name:'Lahore, Punjab, Pakistan',lat:31.5204,lon:74.3587},
 islamabad:{name:'Islamabad, Pakistan',lat:33.6844,lon:73.0479},
 faisalabad:{name:'Faisalabad, Punjab, Pakistan',lat:31.4504,lon:73.135},
 multan:{name:'Multan, Punjab, Pakistan',lat:30.1575,lon:71.5249},
 karachi:{name:'Karachi, Sindh, Pakistan',lat:24.8607,lon:67.0011},
 peshawar:{name:'Peshawar, Pakistan',lat:34.0151,lon:71.5249},
 quetta:{name:'Quetta, Pakistan',lat:30.1798,lon:66.975},
 rawalpindi:{name:'Rawalpindi, Punjab, Pakistan',lat:33.5651,lon:73.0169},
};

const DG_BASE =
 'wss://api.deepgram.com/v1/listen' +
 '?model=nova-3&language=en-US&encoding=linear16' +
 '&channels=1&interim_results=true&endpointing=true&smart_format=true';

/** Facts extracted from one utterance (or live partial). Pure. */
export function parseUtterance(raw){
 const original=String(raw||'');
 const text=original.toLowerCase().replace(/[’']/g,"'");
 const facts={
  farm:null,area:null,areaUnit:null,soil:null,organic:null,slope:null,irrigation:null,
  summer:null,winter:null,priority:null,residue:null,dry:null,heat:null,ndvi:null,place:null
 };
 const nameRe=/\b(?:my\s+)?(?:farm|field|plot)\s+(?:name\s+)?(?:is\s+)?(?:called|named)?\s+([A-Za-z][A-Za-z0-9\s'-]{1,60}?)(?=\s+(?:name\s+)?(?:is|has|with|area|size)\b|[,.]|$)/i;
 let m=original.match(nameRe);
 if(!m)m=original.match(/\b(?:call|name)\s+(?:it|this|the field)\s+([A-Za-z][A-Za-z0-9\s'-]{1,60}?)(?=\s+[,.]|$)/i);
 if(m)facts.farm=m[1].trim().replace(/\s+/g,' ');
 // "area is 20" / "area would be 30" — last mention wins when corrected mid-sentence
 const areaRe=/\b(?:its?\s+|the\s+|my\s+|this\s+)?(?:field\s+|plot\s+)?(?:area|size|land(?:\s+area)?)\s*(?:would\s+be|should\s+be|will\s+be|is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(ha|hectares?|acres?|acreage|meters?|metres?|m)?\b/gi;
 let areaM=null,am;
 while((am=areaRe.exec(text))!==null)areaM=am;
 if(areaM){facts.area=Number(areaM[1]);facts.areaUnit=UNIT_AREA[areaM[2]||'']??null}
 else{
  m=text.match(/(\d+(?:\.\d+)?)\s*(acres?|acreage|hectares?|ha)\b/);
  if(m){facts.area=Number(m[1]);facts.areaUnit=UNIT_AREA[m[2]]||null}
 }
 // Places: last city mentioned wins ("not Lahore… Islamabad")
 for(const [word,place] of Object.entries(PLACE_MAP)){
  if(new RegExp(`\\b${word}\\b`,'i').test(text))facts.place={...place,key:word};
 }
 m=text.match(/\b(?:organic matter|organic)\s*(?:is\s*)?(\d+(?:\.\d+)?)\s*(?:percent|%|per\s*cent)?/);
 if(!m)m=text.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s*organic/);
 if(m)facts.organic=Number(m[1]);
 m=text.match(/\bslope\s*(?:is\s*)?(\d+(?:\.\d+)?)\s*(?:percent|%)?/);
 if(m)facts.slope=Number(m[1]);
 m=text.match(/(?:irrigation|water available|irrigation available)\s*(?:would\s+be|should\s+be|will\s+be|is|of)?\s*(\d+(?:\.\d+)?)\s*(mm|millimet(?:er|re)s?|millimeters?)?(?:\s*(?:per|\/)\s*year)?/);
 if(!m)m=text.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:of\s*)?irrigation/);
 if(m)facts.irrigation=Number(m[1]);
 m=text.match(/\b(?:dry|drier|dryer)(?:\s+season)?\s*(?:would\s+be|should\s+be|by\s+)?(\d+(?:\.\d+)?)\s*(?:percent|%)?/);
 if(!m)m=text.match(/\breduc\w+\s+(?:the\s+)?(?:rainfall|rain)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*(?:percent|%)?/);
 if(!m)m=text.match(/(?:rainfall\s*)?reduc\w+\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*(?:percent|%)?/);
 if(!m)m=text.match(/(?:rain\s*)?down\s*(\d+(?:\.\d+)?)\s*(?:percent|%)?/);
 if(m)facts.dry=Number(m[1]);
 m=text.match(/\+(?:\s*)?(\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(?:c|celsius|°\s*c)/);
 if(!m)m=text.match(/(?:heat|temperature|hotter)\s*(?:up\s*)?(?:by\s*|should\s+be\s+|would\s+be\s+|will\s+be\s+)?(\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(?:c|celsius)?/);
 if(m)facts.heat=Number(m[1]);
 m=text.match(/\bndvi\s*(?:is\s*)?(-?\d+(?:\.\d+)?)/);
 if(m)facts.ndvi=Number(m[1]);
 for(const [word,key] of Object.entries(SOIL_MAP))if(new RegExp(`\\b${word}\\s+soil\\b|\\bsoil\\s+(?:is\\s+)?${word}\\b`).test(text)){facts.soil=key;break}
 for(const [word,key] of Object.entries(SUMMER_CROPS)){
  const re=new RegExp(`\\b${word.replace(/ /g,'\\s+')}\\b`,'i');
  if(re.test(text)){facts.summer=key;break}
 }
 for(const [word,key] of Object.entries(WINTER_CROPS)){
  const re=new RegExp(`\\b${word.replace(/ /g,'\\s+')}\\b`,'i');
  if(re.test(text)){facts.winter=key;break}
 }
 for(const [word,key] of Object.entries(PRIORITY_MAP))if(new RegExp(`\\b(?:priority|goal|weight|focus)\\s*(?:is\\s*)?(?:a\\s+)?${word}\\b|\\b${word}\\s+(?:priority|goal|weights?)\\b`).test(text)){facts.priority=key;break}
 if(/\b(?:retain|keep|leave|with)\s+(?:the\s+)?(?:crop\s+)?residue\b|\bresidue\s+(?:on|retained|kept)\b/.test(text))facts.residue=true;
 if(/\b(?:no|drop|remove|without|turn off|clear)\s+(?:the\s+)?(?:crop\s+)?residue\b|\bresidue\s+(?:off|removed|cleared)\b/.test(text))facts.residue=false;
 return postProcessFacts(facts,text,original);
}

/**
 * Post-process: reconcile speech quirks the raw regexes miss.
 * - "goal is to conserve water" → priority water
 * - season-scoped crops: "winter crop would be maize" sets winter even when
 *   the crop is only in the summer menu
 * - looser soil: "update the soil … sandy"
 */
export function postProcessFacts(facts,text,original=String(text||'')){
 if(!facts.priority){
  if(/\bconserve\s+water\b|\bsave\s+water\b|\bwater\s+conservation\b/.test(text))facts.priority='water';
  else if(/\bsoil\s+health\b|\bsupport\s+soil\b/.test(text))facts.priority='soil';
  else if(/\bbalanced\b/.test(text)&&/\bgoal\b|\bpriority\b/.test(text))facts.priority='balanced';
 }
 const seasonCrop=(season,words)=>{
  const re=new RegExp(`\\b${season}\\b[^.!?]{0,80}?\\b(${words})\\b`,'i');
  const m=text.match(re);
  return m?m[1].toLowerCase():null;
 };
 const summerWord=Object.keys(SUMMER_CROPS).sort((a,b)=>b.length-a.length).join('|');
 const winterWord=Object.keys(WINTER_SPEECH_CROPS).sort((a,b)=>b.length-a.length).join('|');
 const sWord=seasonCrop('summer',summerWord);
 if(sWord)facts.summer=SUMMER_CROPS[sWord]||sWord;
 const wWord=seasonCrop('winter',winterWord);
 if(wWord)facts.winter=WINTER_SPEECH_CROPS[wWord]||wWord;
 if(!facts.soil){
  const sm=text.match(/\bsoil\b[^.!?]{0,40}?\b(loam|loamy|sandy|sand|clay|clayey)\b/);
  if(sm)facts.soil=SOIL_MAP[sm[1]]||sm[1];
 }
 return facts;
}

export function hasFacts(facts){
 return Object.values(facts).some(v=>v!==null&&v!==undefined);
}

/**
 * Pure fold: (inputs, facts) → next inputs.
 * Partial transcripts re-parse to the same facts; fold is idempotent for
 * identical facts, so mid-sentence reapplication never drifts values.
 */
export function reduceInputs(inputs,facts){
 const next={...inputs};
 if(facts.farm!=null)next.farm=facts.farm;
 if(Number.isFinite(facts.area)&&facts.area>0){
  const unit=facts.areaUnit||'hectares';
  next.area=unit==='acres'?Math.round(facts.area*AREA_PER.acres*10)/10:Math.round(facts.area*10)/10;
 }
 if(facts.place){
  next.lat=facts.place.lat;
  next.lon=facts.place.lon;
 }
 if(facts.soil)next.soil=facts.soil;
 if(Number.isFinite(facts.organic)&&facts.organic>=0&&facts.organic<=10)next.organic=facts.organic;
 if(Number.isFinite(facts.slope)&&facts.slope>=0&&facts.slope<=30)next.slope=facts.slope;
 if(Number.isFinite(facts.irrigation)&&facts.irrigation>=0)next.irrigation=Math.round(facts.irrigation);
 if(facts.summer)next.summer=facts.summer;
 if(facts.winter)next.winter=facts.winter;
 if(facts.priority)next.priority=facts.priority;
 if(typeof facts.residue==='boolean')next.residue=facts.residue;
 if(Number.isFinite(facts.dry)&&facts.dry>=0)next.dry=Math.min(60,Math.round(facts.dry));
 if(Number.isFinite(facts.heat)&&facts.heat>=0)next.heat=Math.min(5,Math.round(facts.heat*2)/2);
 if(Number.isFinite(facts.ndvi)&&facts.ndvi>=-1&&facts.ndvi<=1)next.ndvi=facts.ndvi;
 return next;
}

const IDLE={
 status:'idle',error:null,partial:'',utterance:'',lastUtterance:'',utteranceId:0,
 finalText:'',listening:false,latencyMs:null,engine:null
};

/**
 * createVoiceLive({document, onLiveInputs, onCommit, onError, deepgramKey, Recognition})
 * Deepgram key enables WebSocket streaming (preferred); otherwise browser STT.
 */
export function createVoiceLive({document:doc,onLiveInputs,onCommit,onError,Recognition,deepgramKey}){
 const win=doc.defaultView,$=id=>doc.getElementById(id);
 let recognition=null,state={...IDLE},committed=null,partialBuffer='',stopped=false;
 let ws=null,ctx=null,node=null,mic=null,streamStart=null,engine=null;
 const key=String(deepgramKey||'').trim();
 const browserCtor=()=>Recognition||win.SpeechRecognition||win.webkitSpeechRecognition;
 const hasRecognition=()=>Boolean(key)||Boolean(browserCtor());
 function setState(patch){state={...state,...patch};render()}
 function currentInputs(){
  const reader=typeof globalThis.__fieldshiftReadInputs==='function'
   ?globalThis.__fieldshiftReadInputs
   :typeof win?.__fieldshiftReadInputs==='function'?win.__fieldshiftReadInputs:null;
  return reader?reader():null;
 }
 function parseFactsFrom(text){return parseUtterance(text)}
 function applyLive(text){
  const base=committed||currentInputs();
  if(!base||!text.trim())return;
  const facts=parseFactsFrom(text);
  if(!hasFacts(facts))return;
  onLiveInputs?.(reduceInputs(base,facts),{live:true,facts});
 }
 function commitUtterance(full){
  const text=full.trim();
  if(!text)return;
  const base=committed||currentInputs()||{};
  const facts=parseFactsFrom(text);
  if(hasFacts(facts)){
   committed=reduceInputs(base,facts);
   onCommit?.(committed);
  }
 }
 function commitPhrase(phrase){
  const full=phrase.trim();
  if(!full)return;
  setState({
   partial:'',utterance:'',listening:true,status:'listening',
   finalText:state.finalText?`${state.finalText} ${full}`.trim():full,
   lastUtterance:full,utteranceId:state.utteranceId+1
  });
  commitUtterance(full);
  partialBuffer='';
 }
 function pushInterim(text){
  if(!text)return;
  const live=partialBuffer?`${partialBuffer} ${text}`:text;
  setState({partial:text,utterance:partialBuffer,status:'listening',listening:true});
  applyLive(live);
 }

 // --- Deepgram WebSocket (CoffeeBrew path) ---
 function teardownMedia(){
  try{ws?.send?.(JSON.stringify({type:'CloseStream'}))}catch{}
  try{ws?.close()}catch{}
  ws=null;
  node?.disconnect();node=null;
  ctx?.close?.().catch?.(()=>{});ctx=null;
  mic?.getTracks?.().forEach(t=>t.stop());mic=null;
  streamStart=null;
 }
 function handleDeepgramMessage(raw){
  let msg;
  try{msg=JSON.parse(raw)}catch{return}
  if(msg.type!=='Results')return;
  const text=msg.channel?.alternatives?.[0]?.transcript?.trim()||'';
  if(!text)return;
  let latency=null;
  if(streamStart!=null&&typeof msg.end==='number'){
   latency=Math.max(0,Math.round(performance.now()-(streamStart+msg.end*1000)));
  }
  if(msg.is_final){
   if(msg.speech_final){
    const phrase=[partialBuffer,text].filter(Boolean).join(' ').trim();
    setState({latencyMs:latency??state.latencyMs});
    commitPhrase(phrase);
    // nothing interim left after speech_final
   }else{
    partialBuffer=[partialBuffer,text].filter(Boolean).join(' ');
    setState({utterance:partialBuffer,partial:'',latencyMs:latency??state.latencyMs,status:'listening',listening:true});
    applyLive(partialBuffer);
   }
  }else{
   pushInterim(text);
   if(latency!=null)setState({latencyMs:latency});
  }
 }
 async function startDeepgram(){
  setState({status:'connecting',listening:true,error:null});
  const media=await win.navigator.mediaDevices.getUserMedia({
   audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
  });
  const AudioCtx=win.AudioContext||win.webkitAudioContext;
  ctx=new AudioCtx({sampleRate:16000});
  await ctx.audioWorklet.addModule(new URL('./pcm-worklet.js',import.meta.url).href);
  const open=new Promise((resolve,reject)=>{
   const socket=new WebSocket(`${DG_BASE}&sample_rate=${ctx.sampleRate}`,['token',key]);
   ws=socket;
   const timer=setTimeout(()=>reject(new Error('Deepgram connection timeout')),10000);
   socket.onopen=()=>{clearTimeout(timer);resolve()};
   socket.onerror=()=>{clearTimeout(timer);reject(new Error('Deepgram WebSocket error — check API key / network'))};
  });
  await open;
  ws.onmessage=ev=>{if(typeof ev.data==='string')handleDeepgramMessage(ev.data)};
  ws.onclose=()=>{
   if(ws===null)return;
   ws=null;
   if(stopped)return;
   setState({status:'error',error:'Connection closed',listening:false,engine:'deepgram'});
   onError?.('Deepgram connection closed. Check the API key or network.');
  };
  const source=ctx.createMediaStreamSource(media);
  node=new AudioWorkletNode(ctx,'pcm-capture');
  mic=media;
  node.port.onmessage=e=>{
   if(!ws||ws.readyState!==WebSocket.OPEN)return;
   if(streamStart==null)streamStart=performance.now();
   ws.send(e.data);
  };
  source.connect(node); // do not connect to destination
  engine='deepgram';
  partialBuffer='';
  setState({status:'listening',listening:true,error:null,engine:'deepgram'});
 }

 // --- Browser SpeechRecognition fallback ---
 function handleBrowserResult(event){
  let interim='',final='';
  for(let i=event.resultIndex;i<event.results.length;i++){
   const r=event.results[i],t=(r[0]?.transcript||'').trim();
   if(!t)continue;
   const done=Boolean(r.is_final??r.isFinal??r.final);
   if(done)final=final?`${final} ${t}`:t;
   else interim=interim?`${interim} ${t}`:t;
  }
  if(final){
   const phrase=[partialBuffer,final].filter(Boolean).join(' ');
   commitPhrase(phrase);
   applyLive(interim);
   if(interim)setState({partial:interim});
   return;
  }
  if(interim)pushInterim(interim);
 }
 function handleBrowserEnd(){
  if(stopped)return;
  const full=partialBuffer.trim();
  partialBuffer='';
  setState({status:'idle',partial:'',utterance:'',listening:false});
  if(full)commitUtterance(full);
 }
 function handleBrowserError(event){
  if(stopped)return;
  const error=event?.error||'speech';
  if(error==='not-allowed'||error==='service-not-allowed'){
   setState({status:'error',error:'Microphone permission denied',listening:false});
   onError?.('Microphone permission denied. Allow the mic or type inputs instead.');
   return;
  }
  if(error==='no-speech'||error==='aborted')return;
  setState({status:'error',error:`Recognition error: ${error}`,listening:false});
  onError?.(`Speech recognition failed (${error}). Type inputs instead.`);
 }
 function startBrowser(){
  const Ctor=browserCtor();
  if(!Ctor){
   setState({status:'error',error:'Speech recognition unavailable',listening:false});
   onError?.('No Deepgram key and no browser speech API. Set DEEPGRAM key or type inputs.');
   return;
  }
  if(recognition)return;
  stopped=false;
  partialBuffer='';
  engine='browser';
  const rec=new Ctor();
  recognition=rec;
  rec.lang='en-US';
  rec.continuous=true;
  rec.interimResults=true;
  rec.maxAlternatives=1;
  rec.onstart=()=>setState({status:'listening',listening:true,error:null,partial:'',utterance:'',engine:'browser'});
  rec.onresult=handleBrowserResult;
  rec.onerror=handleBrowserError;
  rec.onend=()=>{
   recognition=null;
   if(!stopped&&state.listening){
    try{startBrowser();return}catch{}
   }
   handleBrowserEnd();
  };
  try{rec.start();setState({status:'listening',listening:true,error:null,engine:'browser'})}
  catch(e){recognition=null;setState({status:'error',error:e.message||'Could not start',listening:false});onError?.(e.message)}
 }

 async function start(){
  if(stopped===false&&(ws||recognition))return;
  stopped=false;
  if(key){
   try{
    await startDeepgram();
    return;
   }catch(err){
    teardownMedia();
    if(stopped)return;
    // fall through to browser STT
    onError?.(`Deepgram unavailable (${err.message}). Trying browser speech…`);
   }
  }
  startBrowser();
 }
 function stop(){
  stopped=true;
  const rec=recognition;
  recognition=null;
  try{rec?.abort?.()}catch{}
  teardownMedia();
  const full=partialBuffer.trim();
  partialBuffer='';
  setState({status:'idle',partial:'',utterance:'',listening:false,engine:null});
  if(full)commitUtterance(full);
  recognition=null;
 }
 function toggle(){if(state.listening||recognition||ws)stop();else{void start()}}
 function destroy(){stop()}
 function render(){
  const bar=$('voice-live-bar');
  if(!bar)return;
  const text=[state.finalText,state.utterance,state.partial].filter(Boolean).join(' ');
  const statusEl=$('voice-live-status'),textEl=$('voice-live-text'),btn=$('voice-live-toggle'),modeEl=$('voice-live-mode');
  if(statusEl){
   statusEl.textContent=state.status==='error'&&state.error
    ?state.error
    :state.status==='connecting'?'Connecting…'
    :state.listening?(state.latencyMs!=null?`${state.latencyMs} ms`:'Listening…')
    :'Mic off';
  }
  if(textEl){
   textEl.innerHTML='';
   if(state.status==='error'&&state.error){
    const span=doc.createElement('span');span.className='voice-live-error';span.textContent=state.error;textEl.append(span);
   }else if(text){
    const span=doc.createElement('span');span.textContent=text;
    if(state.partial&&state.listening){
     const caret=doc.createElement('span');caret.className='voice-live-caret';caret.setAttribute('aria-hidden','true');span.append(caret);
    }
    textEl.append(span);
   }else{
    const span=doc.createElement('span');span.className='voice-live-placeholder';
    span.textContent=hasRecognition()
     ?'Tap the mic and say “irrigation 400” or “plant millet”…'
     :'Speech recognition is not available. Type inputs instead.';
    textEl.append(span);
   }
  }
  if(btn){
   btn.classList.toggle('listening',state.listening);
   btn.setAttribute('aria-pressed',String(state.listening));
   btn.setAttribute('aria-label',state.listening?'Stop live voice':'Start live voice');
   btn.disabled=!hasRecognition();
  }
  const cardLive=$('voice-card-live');
  if(cardLive){
   cardLive.textContent=text;
   cardLive.classList.toggle('is-live',Boolean(state.listening&&(state.partial||state.utterance)));
  }
  if(modeEl){
   modeEl.textContent=state.listening
    ?(state.engine==='deepgram'?'DG LIVE':state.engine==='browser'?'LIVE':'LIVE')
    :state.status==='connecting'?'WAIT':'IDLE';
  }
  bar.hidden=false;
  bar.classList.toggle('is-listening',state.listening);
  bar.classList.toggle('is-error',state.status==='error');
 }
 render();
 return {toggle,stop,destroy,state:()=>state,hasRecognition,render,engine:()=>engine||state.engine};
}
