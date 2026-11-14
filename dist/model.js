// Educational planning coefficients, not calibrated yield or water forecasts.
export const crops = {
 rice:{name:'Rice',family:'grass',water:1200,cover:.65,legume:false,heat:35},
 wheat:{name:'Wheat',family:'grass',water:450,cover:.6,legume:false,heat:30},
 maize:{name:'Maize',family:'grass',water:650,cover:.7,legume:false,heat:35},
 chickpea:{name:'Chickpea',family:'legume',water:300,cover:.55,legume:true,heat:32},
 millet:{name:'Pearl millet',family:'grass',water:350,cover:.7,legume:false,heat:40},
 mustard:{name:'Mustard',family:'brassica',water:300,cover:.55,legume:false,heat:32},
 mung:{name:'Mung bean',family:'legume',water:350,cover:.7,legume:true,heat:35}
};
export const alternatives=[
 {id:'diverse',name:'Diversify & restore',sequence:['maize','chickpea','millet','mustard'],note:'Break cereal repetition with a pulse and an oilseed. Requires buyers for new crops.'},
 {id:'water',name:'Water-wise rotation',sequence:['millet','chickpea','mung','mustard'],note:'Lower indicative water demand; millet and mung market access and drainage need checking.'},
 {id:'balanced',name:'Familiar, with a pulse',sequence:['maize','wheat','mung','wheat'],note:'Keeps wheat in the plan. Mung establishment and harvest timing need local validation.'}
];
export function summarize(data,year=2024){
 const p=data.properties.parameter; const vals=k=>Array.from({length:12},(_,i)=>p[k]?.[`${year}${String(i+1).padStart(2,'0')}`]);
 const rain=vals('PRECTOTCORR'),temp=vals('T2M'),wet=vals('GWETROOT');
 if([...rain,...temp,...wet].some(x=>!Number.isFinite(x)||x===-999))throw Error('Incomplete NASA data: a full year of rainfall, temperature and root-zone wetness is required.');
 const monthly=rain.map((v,i)=>v*new Date(Date.UTC(year,i+1,0)).getUTCDate());
 return {rain:monthly.reduce((a,b)=>a+b,0),temp:temp.reduce((a,b)=>a+b,0)/12,wet:wet.reduce((a,b)=>a+b,0)/12,monthly,temps:temp,year};
}
export function evaluate(input,climate){
 for(const key of ['area','irrigation','organic','slope','dry','heat'])if(!Number.isFinite(input[key]))throw Error('Please enter valid numbers.');
 if(input.area<=0||input.irrigation<0||input.organic<0||input.organic>10||input.slope<0||input.slope>30||input.dry<0||input.dry>60||input.heat<0||input.heat>5)throw Error('Inputs are outside the supported ranges.');
 if(!crops[input.summer]||!crops[input.winter])throw Error('Choose valid crops.');
 const options=[{id:'baseline',name:'Your current rotation',sequence:[input.summer,input.winter,input.summer,input.winter],note:'Reference strategy: your current two-season sequence repeated over two years.'},...alternatives];
 return options.map(o=>{
 const cs=o.sequence.map(k=>crops[k]);
 const demand=cs.reduce((s,c)=>s+c.water,0)/2;
 // Only a fraction of annual rain is effective; excludes runoff timing and irrigation efficiency.
 const effectiveRain=climate.rain*(1-input.dry/100)*({sand:.45,loam:.65,clay:.55}[input.soil]??.65);
 const deficit=Math.max(0,demand-effectiveRain-input.irrigation);
 const breaks=cs.slice(1).filter((c,i)=>c.family!==cs[i].family).length/3;
 const legumes=cs.filter(c=>c.legume).length;
 const soil=Math.min(100,25+input.organic*8+legumes*10+breaks*15);
 const erosion=Math.min(100,Math.round(cs.reduce((s,c)=>s+c.cover,0)/4*80+(input.residue?15:0)-input.slope*1.4));
 const heatPenalty=cs.reduce((s,c,i)=>s+Math.max(0,(i%2===0?Math.max(...climate.temps.slice(5,9)):Math.max(...climate.temps.slice(0,3),...climate.temps.slice(10))))+input.heat-c.heat),0);
 const water=Math.max(0,100-deficit/demand*100);
 const weights=input.priority==='water'?[.6,.2,.1,.1]:input.priority==='soil'?[.2,.45,.2,.15]:[.35,.3,.15,.2];
 const score=Math.round(water*weights[0]+soil*weights[1]+erosion*weights[2]+(breaks*100)*weights[3]-heatPenalty*.8);
 return {...o,demand:Math.round(demand),deficit:Math.round(deficit),soil:Math.round(soil),erosion,breaks:Math.round(breaks*100),score:Math.max(0,Math.min(100,score)),legumes,effectiveRain:Math.round(effectiveRain),heatPenalty};
 }).sort((a,b)=>b.score-a.score);
}
