import {summarize,evaluate} from './model.js';
export const LAYERS={rain:{name:'Rainfall',unit:'mm',colors:['#eff6ff','#b4d6f5','#60a5dc','#247bb8','#104675'],note:'NASA POWER corrected precipitation. Monthly means converted to totals; annual view sums 12 months.'},temp:{name:'Air temperature',unit:'°C',colors:['#fef4cc','#f6d27d','#f2a449','#dc6d36','#a33127'],note:'NASA POWER mean 2 m air temperature, not land-surface temperature or daily heat extremes.'},wet:{name:'Root-zone wetness',unit:'/1',colors:['#faf1d1','#c9dba5','#7eb9a3','#3b8b86','#13545d'],note:'NASA POWER modelled wetness, dimensionless 0–1. Not field moisture, not a SMAP retrieval.'},gap:{name:'Modelled water gap',unit:'mm/yr',colors:['#e5f4eb','#b5dba6','#f2d47e','#e69b59','#ae493c'],note:'Illustrative annual deficit for the selected rotation. The same field soil, irrigation and scenario assumptions are applied to every cell; this is not an observed risk map.'}};
export function mergeRegion(bundle){
 const parameters=['T2M','PRECTOTCORR','GWETROOT'],maps=parameters.map(p=>new Map((bundle.responses?.[p]?.features||[]).map(f=>[f.geometry.coordinates.slice(0,2).join(','),f])));
 if(!maps[0].size||maps.some(m=>m.size!==maps[0].size))throw Error('Incomplete regional NASA responses.');
 return [...maps[0]].map(([key,feature])=>{const cell={type:'Feature',geometry:feature.geometry,properties:{parameter:{}}};parameters.forEach((p,j)=>{const f=maps[j].get(key);if(!f?.properties?.parameter?.[p])throw Error('Regional grids do not align.');cell.properties.parameter[p]=f.properties.parameter[p]});summarize(cell,2023);summarize(cell,2024);return {id:key,lon:feature.geometry.coordinates[0],lat:feature.geometry.coordinates[1],feature:cell}});
}
export function cellBounds(cell){return [[cell.lat-.25,cell.lon-.3125],[cell.lat+.25,cell.lon+.3125]]}
export function findCell(cells,lat,lon){if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;return cells.find(c=>Math.abs(c.lat-lat)<=.25&&Math.abs(c.lon-lon)<=.3125)||null}
export function overlayValue(cell,layer,year,month,context){
 if(!LAYERS[layer])throw Error('Unknown map layer');
 const summary=summarize(cell.feature,year);
 if(layer==='gap'){
  if(!context?.valid)return null;
  const r=evaluate({...context.inputs,customSequence:context.customSequence},summary).find(r=>r.id===context.selected);
  if(!r)throw Error('Selected rotation is unavailable');return r.deficit;
 }
 if(month!==null&&(!Number.isInteger(month)||month<0||month>11))throw Error('Invalid month');
 if(layer==='rain')return month===null?summary.rain:summary.monthly[month];
 if(layer==='temp')return month===null?summary.temp:summary.temps[month];
 return month===null?summary.wet:cell.feature.properties.parameter.GWETROOT[`${year}${String(month+1).padStart(2,'0')}`];
}
export function scaleFor(layer,month){return layer==='rain'?[0,month===null?2500:500]:layer==='temp'?[0,45]:layer==='wet'?[0,1]:[0,1400]}
export function colorFor(value,layer,month){if(!Number.isFinite(value))return '#94a3a0';const [min,max]=scaleFor(layer,month),colors=LAYERS[layer].colors;return colors[Math.min(colors.length-1,Math.max(0,Math.floor((value-min)/(max-min)*colors.length)))];}
export function exportOverlay(cells,options){
 const {layer,year,month,context}=options;
 return {
  type:'FeatureCollection',
  metadata:{source:'NASA POWER regional API / MERRA-2',layer:LAYERS[layer].name,year,month:layer==='gap'||month===null?null:month+1,units:LAYERS[layer].unit,geometry:'Approximate native-grid footprints, 0.5° latitude × 0.625° longitude; not farm boundaries.',derived:layer==='gap',assumptions:layer==='gap'?{inputs:context.inputs,customSequence:context.customSequence,selectedRotation:context.selected}:undefined},
  features:cells.map(c=>{
   const [[s,w],[n,e]]=cellBounds(c);
   return {type:'Feature',geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},properties:{cell:c.id,latitude:c.lat,longitude:c.lon,value:overlayValue(c,layer,year,month,context)}};
  })
 };
}
