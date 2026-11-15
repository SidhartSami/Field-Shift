// Field boundary sketch on the voice tab: basemap options + polygon drawing.
// Leaflet only (vendored); no drawing plugin — click vertices, finish to close.

const BASEMAPS = {
 satellite:{
  url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  maxNativeZoom:17
 },
 streets:{
  url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  maxNativeZoom:19
 }
};

/** Spherical polygon area (m²) from [lat,lng] rings. */
export function polygonAreaM2(ring){
 if(!Array.isArray(ring)||ring.length<3)return 0;
 const R=6371000;
 const toRad=d=>d*Math.PI/180;
 let total=0;
 for(let i=0;i<ring.length;i++){
  const [lat1,lon1]=ring[i];
  const [lat2,lon2]=ring[(i+1)%ring.length];
  total+=(toRad(lon2)-toRad(lon1))*(2+Math.sin(toRad(lat1))+Math.sin(toRad(lat2)));
 }
 return Math.abs(total*R*R/2);
}

export function polygonAreaHa(ring){
 return polygonAreaM2(ring)/10000;
}

/**
 * createFieldBoundaryMap({document, getCenter, getBoundary, setBoundary, leaflet, onError})
 * Returns {refresh, destroy, drawing}
 */
export function createFieldBoundaryMap({document:doc,getCenter,getBoundary,setBoundary,leaflet=globalThis.L,onError}){
 const $=id=>doc.getElementById(id);
 const L=leaflet;
 let map,base,basemap='satellite',drawing=false,verts=[],preview=null,shape=null,dots=null,ready=false;

 function center(){
  const c=getCenter?.();
  const lat=Number(c?.lat),lon=Number(c?.lon);
  if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return [lat,lon];
  return [31.5204,74.3587];
 }

 function setBasemap(name){
  basemap=name;
  for(const b of doc.querySelectorAll('[data-voice-basemap]')){
   const on=b.dataset.voiceBasemap===name;
   b.classList.toggle('is-on',on);
   b.setAttribute('aria-pressed',String(on));
  }
  if(!map)return;
  if(base){map.removeLayer(base);base=null}
  const opt=BASEMAPS[name];
  if(!opt)return;
  base=L.tileLayer(opt.url,{attribution:opt.attribution,maxNativeZoom:opt.maxNativeZoom,maxZoom:17}).addTo(map);
 }

 function status(msg){const el=$('voice-map-status');if(el)el.textContent=msg}

 function clearPreview(){
  if(preview){map.removeLayer(preview);preview=null}
  if(dots){map.removeLayer(dots);dots=null}
 }

 function paintPreview(){
  clearPreview();
  if(!map||!verts.length)return;
  if(verts.length>=2){
   preview=L.polyline(verts,{color:'#7dd3a8',weight:2,dashArray:'6 6',fill:false}).addTo(map);
  }
  dots=L.layerGroup();
  verts.forEach((v,i)=>{
   dots.addLayer(L.circleMarker(v,{radius:4,color:'#10221c',weight:2,fillColor:'#7dd3a8',fillOpacity:1,interactive:false}));
  });
  dots.addTo(map);
 }

 function paintSaved(poly){
  if(shape){map.removeLayer(shape);shape=null}
  if(!map||!poly||poly.length<3)return;
  shape=L.polygon(poly,{color:'#d7aa52',weight:2,fillColor:'#d7aa52',fillOpacity:.22}).addTo(map);
 }

 function finish(){
  if(verts.length<3){
   status('Need at least 3 points to close a boundary.');
   return false;
  }
  const ring=verts.map(([lat,lon])=>[Number(lat.toFixed(6)),Number(lon.toFixed(6))]);
  verts=[];
  drawing=false;
  clearPreview();
  paintSaved(ring);
  const ha=polygonAreaHa(ring);
  setBoundary?.(ring);
  status(`Boundary saved · ≈${ha.toFixed(2)} ha. Re-draw anytime to replace it.`);
  syncTools();
  return true;
 }

 function cancelDraw(){
  drawing=false;
  verts=[];
  clearPreview();
  syncTools();
  status('Draw canceled.');
 }

 function syncTools(){
  const draw=$('voice-map-draw'),undo=$('voice-map-undo'),fin=$('voice-map-finish'),clr=$('voice-map-clear');
  if(draw){
   draw.textContent=drawing?'Cancel draw':'Draw polygon';
   draw.classList.toggle('is-on',drawing);
   draw.setAttribute('aria-pressed',String(drawing));
  }
  if(undo)undo.hidden=!drawing;
  if(fin)fin.hidden=!drawing;
  if(clr)clr.hidden=drawing||!getBoundary?.()?.length;
  if(map){
   map.doubleClickZoom[drawing?'disable':'enable']();
   map.getContainer().classList.toggle('is-drawing',drawing);
  }
 }

 function onClick(e){
  if(!drawing)return;
  verts.push([e.latlng.lat,e.latlng.lng]);
  paintPreview();
  status(verts.length<3?`${verts.length} points — keep clicking, then Finish.`:`${verts.length} points — Finish when the outline is complete.`);
 }

 function init(){
  if(ready||!L)return;
  const el=$('voice-field-map');
  if(!el)return;
  try{
   map=L.map(el,{scrollWheelZoom:true,zoomControl:true,minZoom:3,maxZoom:19,doubleClickZoom:true}).setView(center(),15);
   L.control.scale({position:'bottomleft',imperial:false}).addTo(map);
   setBasemap(basemap);
   map.on('click',onClick);
   ready=true;
   const saved=getBoundary?.();
   if(saved?.length>=3){
    paintSaved(saved);
    map.fitBounds(shape.getBounds(),{padding:[24,24],animate:false});
    const ha=polygonAreaHa(saved);
    status(`Saved boundary · ≈${ha.toFixed(2)} ha.`);
   }else{
    status('Centered on your field. Draw a polygon to outline the land.');
   }
   syncTools();
  }catch(err){
   onError?.(`Map unavailable: ${err.message}`);
  }
 }

 function wire(){
  for(const b of doc.querySelectorAll('[data-voice-basemap]')){
   b.onclick=()=>setBasemap(b.dataset.voiceBasemap);
  }
  const draw=$('voice-map-draw');
  if(draw)draw.onclick=()=>{
   if(drawing){cancelDraw();return}
   drawing=true;verts=[];clearPreview();
   status('Click the map to add corner points. Double-click Finish to close.');
   syncTools();
  };
  const undo=$('voice-map-undo');
  if(undo)undo.onclick=()=>{
   if(!drawing||!verts.length)return;
   verts.pop();
   paintPreview();
   status(verts.length?`${verts.length} points left.`:'No points left — cancel or keep clicking.');
  };
  const fin=$('voice-map-finish');
  if(fin)fin.onclick=()=>finish();
  const clr=$('voice-map-clear');
  if(clr)clr.onclick=()=>{
   setBoundary?.(null);
   if(shape){map?.removeLayer(shape);shape=null}
   status('Boundary cleared.');
   syncTools();
  };
 }

 wire();

 return {
  show(){
   init();
   if(!map)return;
   map.invalidateSize({pan:false});
   const saved=getBoundary?.();
   if(saved?.length>=3)paintSaved(saved);
   else if(!drawing)map.setView(center(),map.getZoom(),{animate:false});
   syncTools();
  },
  refreshCenter(){if(map&&!drawing)map.setView(center(),Math.max(map.getZoom(),14),{animate:true})},
  destroy(){ready=false;map?.remove();map=null},
  hide(){if(map)map.invalidateSize({pan:false})},
  isDrawing:()=>drawing
 };
}
