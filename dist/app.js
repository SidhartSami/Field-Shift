import {crops,summarize,evaluate} from './model.js';
const $=id=>document.getElementById(id);
const fields=['farm','area','lat','lon','soil','organic','slope','irrigation','summer','winter','priority','ndvi','residue','dry','heat'];
let raw,climate,results=[],observed={lat:30.9,lon:75.85},source='saved NASA snapshot',url='',fetchTime='2026-11-14',requestId=0;
const api=(lat,lon)=>`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG&longitude=${lon}&latitude=${lat}&start=2023&end=2024&format=JSON`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.round(v).toLocaleString();
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',5000)}
function input(){return Object.fromEntries(fields.map(k=>[k,$(k).type==='checkbox'?$(k).checked:$(k).type==='number'||$(k).type==='range'?Number($(k).value):$(k).value]));}
function match(){const i=input();return i.lat===observed.lat&&i.lon===observed.lon}
function report(){if(!match())throw Error('Fetch NASA data for the edited coordinates before exporting or saving.');if(!$('farm-form').reportValidity())throw Error('Correct the highlighted farm inputs.');return {project:'FieldShift',version:'1.0.0',createdAt:new Date().toISOString(),inputs:input(),observations:{source,url,fetchedAt:fetchTime,coordinates:observed,year:2024,climate},results,limitations:'Illustrative, uncalibrated decision proxies. Regional crop set for Punjab/Haryana; not an agronomic prescription.',rawNASA:raw};}
function draw(){
 const i=input();$('dry-value').textContent=`${i.dry}%`;$('heat-value').textContent=`+${i.heat}°C`;
 if(!match()){$('fetch-status').textContent='Coordinates changed. Fetch NASA data before updating, saving or exporting this plan. Results below still use the last fetched location.';return;}
 try{results=evaluate(i,climate)}catch(e){toast(e.message);return}
 $('data-label').textContent=`NASA POWER · 2024 · ${source}`;
 $('map-location').textContent=observed.lat===30.9&&observed.lon===75.85?'Ludhiana, Punjab':`${observed.lat.toFixed(2)}°, ${observed.lon.toFixed(2)}°`;
 const metrics=[['Annual rainfall',n(climate.rain),'mm','2024 total · corrected precipitation','↧'],['Air temperature',climate.temp.toFixed(1),'°C','Mean of monthly 2 m temperatures','☼'],['Root-zone wetness',climate.wet.toFixed(2),'/ 1','Modelled wetness · not field moisture','◉'],['Vegetation context', $('ndvi').value===''?'Not supplied':Number(i.ndvi).toFixed(2),'NDVI','Local input · excluded from score','♧']];
 $('metrics').innerHTML=metrics.map(([title,value,unit,desc,icon])=>`<article class="metric"><div class="metric-top">${title}<span>${icon}</span></div><div class="metric-value">${value} <small>${unit}</small></div><p>${desc}</p></article>`).join('');
 const chartW=580,chartH=190,left=35,top=10,height=142,rmax=Math.max(100,Math.ceil(Math.max(...climate.monthly)/100)*100),tmax=50;
 let svg=`<svg viewBox="0 0 ${chartW} ${chartH}" role="img" aria-label="2024 monthly rainfall bars and temperature line"><title>2024 rainfall and air temperature</title>`;
 for(let j=0;j<4;j++){const y=top+height-j*height/3;svg+=`<path d="M35 ${y}H545" stroke="#e5e8df"/><text x="29" y="${y+3}" text-anchor="end" fill="#8b9587" font-size="9">${Math.round(rmax*j/3)}</text><text x="552" y="${y+3}" fill="#9d794b" font-size="9">${Math.round(tmax*j/3)}</text>`}
 const months=['J','F','M','A','M','J','J','A','S','O','N','D'];
 climate.monthly.forEach((v,j)=>{const x=left+j*42.5+12;svg+=`<rect x="${x}" y="${top+height-v/rmax*height}" width="19" height="${v/rmax*height}" rx="3" fill="#99b17a"><title>${months[j]}: ${v.toFixed(1)} mm; ${climate.temps[j]} °C</title></rect><text x="${x+9}" y="174" text-anchor="middle" font-size="9" fill="#8b9587">${months[j]}</text>`});
 svg+=`<polyline fill="none" stroke="#aa8753" stroke-width="2" points="${climate.temps.map((t,j)=>`${left+j*42.5+21.5},${top+height-t/tmax*height}`).join(' ')}"/></svg>`;$('chart').innerHTML=svg;
 $('insight').textContent=`The 2024 record has ${n(climate.rain)} mm of rainfall and a warmest monthly mean of ${Math.max(...climate.temps).toFixed(1)}°C. Annual totals can hide seasonal mismatches. Compare less water-demanding crops and verify planting windows locally.`;
 const baseline=results.find(r=>r.id==='baseline');
 $('rank-label').textContent=`4 strategies · ${i.priority==='balanced'?'balanced resilience':i.priority==='water'?'water-first':'soil-first'} scoring`;
 $('results').innerHTML=results.map((r,j)=>`<article class="rotation ${j===0?'best':''}"><span class="tag">${j===0?'HIGHEST MODEL SCORE':r.id==='baseline'?'YOUR BASELINE':`ALTERNATIVE ${j}`}</span><h3>${r.name}</h3><div class="score">${r.score} <small>/ 100</small></div><div class="sequence">${r.sequence.map((c,k)=>`<span>${crops[c].name}<small>Y${Math.floor(k/2)+1} ${k%2===0?'summer':'winter'}</small></span>`).join('')}</div><dl><dt>Indicative demand / year</dt><dd>${n(r.demand)} mm</dd><dt>Unmet water / year</dt><dd>${n(r.deficit)} mm</dd><dt>Soil support proxy</dt><dd>${r.soil}/100<div class="bar"><i style="width:${r.soil}%"></i></div></dd><dt>Soil protection proxy</dt><dd>${r.erosion}/100</dd><dt>Family breaks</dt><dd>${r.breaks}% of transitions</dd></dl><p>${r.note}</p></article>`).join('');
 const best=results[0],saving=baseline.demand-best.demand;
 $('recommendation').innerHTML=`<div class="icon">↗</div><div><h3>${best.name} leads in this scenario.</h3><p>${saving>0?`Its indicative demand is ${n(saving)} mm/year below your baseline (${n(saving*i.area*10)} m³ across ${n(i.area)} hectares).`:'Your baseline is competitive under these assumptions.'} Modelled water gap: ${n(best.deficit)} mm/year. ${best.legumes} legume season${best.legumes===1?'':'s'} in two years.</p><p><strong>Before planting:</strong> check local sowing windows, soil tests, irrigation timing, crop buyers and residue management. ${Math.abs(observed.lat-30.9)>3||Math.abs(observed.lon-75.85)>4?'This location is outside the regional crop demonstrator; rankings may be unsuitable.':''}</p></div>`;
 $('lineage').textContent=`Location ${observed.lat}°, ${observed.lon}° · retrieved ${fetchTime} · source MERRA-2 via NASA POWER · API ${raw.header?.api?.version??'monthly'} · data period 2023–2024. Ranking uses 2024 only.`;
 $('source-link').href=url;
}
$('farm-form').addEventListener('submit',e=>{e.preventDefault();draw();if(match())$('results').scrollIntoView({behavior:'smooth',block:'start'})});
for(const key of fields)$(key).addEventListener(key==='dry'||key==='heat'?'input':'change',()=>{if($('farm-form').checkValidity())draw()});
$('fetch').addEventListener('click',async()=>{
 if(!$('farm-form').reportValidity())return;
 const i=input(),rid=++requestId,requestURL=api(i.lat,i.lon);$('fetch').disabled=true;$('fetch-status').textContent='Fetching NASA POWER monthly data (2023–2024)…';
 try{const response=await fetch(requestURL,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`NASA returned HTTP ${response.status}`);const data=await response.json();const summary=summarize(data);if(rid!==requestId)return;raw=data;climate=summary;observed={lat:i.lat,lon:i.lon};source='live API retrieval';url=requestURL;fetchTime=new Date().toISOString();$('fetch-status').textContent='NASA data loaded. Historical 2024 conditions are ready for comparison.';draw();toast('NASA observations updated.');}catch(e){$('fetch-status').textContent=`Could not load NASA data: ${e.message}. Previous observations retained. Restore their coordinates to continue; no synthetic data substituted.`;}finally{$('fetch').disabled=false}
});
$('save').onclick=()=>{try{const r=report();localStorage.setItem('fieldshift-plan-v1',JSON.stringify(r));toast('Plan saved in this browser.')}catch(e){toast(e.message)}};
$('export').onclick=()=>{try{const r=report(),blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='fieldshift-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}catch(e){toast(e.message)}};
$('print').onclick=()=>{try{report();window.print()}catch(e){toast(e.message)}};
for(const a of document.querySelectorAll('nav a'))a.onclick=()=>{document.querySelector('nav .active')?.classList.remove('active');a.classList.add('active')};
async function init(){try{
 raw=await fetch('data/power-ludhiana.json').then(r=>{if(!r.ok)throw Error('Bundled data unavailable');return r.json()});climate=summarize(raw);url=api(observed.lat,observed.lon);
 try{const saved=JSON.parse(localStorage.getItem('fieldshift-plan-v1')||'null');if(saved?.version==='1.0.0'&&saved.rawNASA&&saved.inputs){const savedClimate=summarize(saved.rawNASA);evaluate(saved.inputs,savedClimate);for(const k of fields)if(saved.inputs[k]!==undefined){if($(k).type==='checkbox')$(k).checked=saved.inputs[k];else $(k).value=saved.inputs[k]}raw=saved.rawNASA;climate=savedClimate;observed=saved.observations.coordinates;source='saved browser plan';url=saved.observations.url;fetchTime=saved.observations.fetchedAt;$('fetch-status').textContent='Restored your saved plan and its NASA observations.'}}catch{toast('Saved plan could not be restored; using the NASA example.')}
 draw();
 }catch(e){toast(`Startup failed: ${e.message}. Reload to retry.`);$('fetch-status').textContent=e.message}}
init();
