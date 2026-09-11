// Run from repository root: node scripts/extract-district-geometry.mjs <pinned-source-tile.pbf>
// Source URL and attribution are inherited from demoGeometry.json; only polygon geometry is reused.
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
const tile = new VectorTile(new Protobuf(fs.readFileSync(process.argv[2] ?? '/tmp/careflow-buildings.pbf')));
const legacy = JSON.parse(fs.readFileSync('src/data/demoGeometry.json'));
const polys=[];
const scaleX=111320*Math.cos(22.286*Math.PI/180), scaleY=111320;
const bbox=ring=>[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
const distance=(a,b)=>Math.hypot((a.lng-b.lng)*scaleX,(a.lat-b.lat)*scaleY);
const area=ring=>Math.abs(ring.reduce((a,p,i)=>{const q=ring[(i+1)%ring.length];return a+(p[0]-114)*(q[1]-22)-(q[0]-114)*(p[1]-22)},0))*scaleX*scaleY/2;
const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p.lat)!==(b[1]>p.lat)&&p.lng<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
for(let i=0;i<tile.layers.building.length;i++){
 const feature=tile.layers.building.feature(i),geo=feature.toGeoJSON(13386,7151,14);
 const polygons=geo.geometry.type==='MultiPolygon'?geo.geometry.coordinates:[geo.geometry.coordinates];
 polygons.forEach((rings,index)=>{
  if(rings.length!==1)return;const ring=rings[0],bb=bbox(ring),center={lng:(bb[0]+bb[2])/2,lat:(bb[1]+bb[3])/2};
  const size=area(ring);
  if(center.lng<114.1388||center.lng>114.1444||center.lat<22.2842||center.lat>22.2884||size<150||size>1000||!inside(center,ring))return;
  if(legacy.buildings.some(b=>distance(center,b.coordinates)<36))return;
  polys.push({sourceFeatureId:feature.id,sourcePolygonIndex:index,coordinates:center,footprint:ring,area:size});
 });
}
const selected=[];
for(const lat of [22.2878,22.28685,22.28585,22.2849]) for(const lng of [114.13945,114.1407,114.142,114.14335]) {
 const candidates=polys.filter(p=>!selected.includes(p)&&selected.every(s=>distance(s.coordinates,p.coordinates)>48));
 candidates.sort((a,b)=>distance(a.coordinates,{lng,lat})-distance(b.coordinates,{lng,lat}));
 if(!candidates[0])throw Error('insufficient polygons');selected.push(candidates[0]);
}
const out={source:legacy.source,attribution:legacy.attribution,notice:'Source basemap footprints only. All business identities, floor counts and outreach scenarios are synthetic.',buildings:selected.map((p,i)=>({id:`district-${String(i+1).padStart(2,'0')}`,sourceFeatureId:p.sourceFeatureId,sourcePolygonIndex:p.sourcePolygonIndex,coordinates:p.coordinates,footprint:p.footprint}))};
fs.writeFileSync('src/data/districtGeometry.json',JSON.stringify(out,null,2)+'\n');
console.log(selected.map((p,i)=>({id:i+1,...p.coordinates,area:Math.round(p.area),vertices:p.footprint.length})));
