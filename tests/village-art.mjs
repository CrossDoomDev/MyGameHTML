import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TILE,SPAWN,createMap,isBlocked,findPath} from '../src/map.js';
import {HOUSES,FOUNTAIN,ART_ATLAS,ATLAS_SOURCE,facadeFootprint,fountainFootprint,
 drawSmoke,drawBuildingLights,drawFountainWater} from '../src/village-art.js';
const scene=createMap('village');
assert.equal(TILE,32);
assert.equal(ART_ATLAS,'village-compact.webp');
assert.deepEqual(ATLAS_SOURCE,[240,160]);
const atlasFile=new URL('../assets/'+ART_ATLAS,import.meta.url);
const atlasBytes=fs.readFileSync(atlasFile);
assert(atlasBytes.length>8000,'actual village concept artwork must be committed, not just a fallback');
assert.equal(atlasBytes.toString('ascii',0,4),'RIFF','WebP RIFF header');
assert.equal(atlasBytes.toString('ascii',8,12),'WEBP','WebP signature');

for(const [id,spec] of Object.entries(HOUSES)){
 assert.equal(spec.w%2,1,id+' footprint must have odd width');
 assert(spec.chimneys.every(([x,y])=>x>=0&&y>=0&&x<spec.w*TILE&&y<spec.h*TILE),'chimney lies on sprite '+id);
 assert(spec.lights.every(([x,y])=>x>=0&&y>=0&&x<spec.w*TILE&&y<spec.h*TILE),'window is within sprite '+id);
 const footprint=facadeFootprint(id);
 assert.equal(footprint.doorOffset,(spec.w-1)/2);
}
for(const b of scene.buildings){
 const spec=HOUSES[b.sprite];assert(spec,'unknown house sprite '+b.sprite);
 assert.equal(b.w%2,1,'odd number of columns');
 assert.equal(b.w,5,'compact facade must occupy five columns');
 assert.equal(b.doorX-b.x,Math.floor(b.w/2),'door is precisely centered');
 assert.equal(b.doorY,b.y+b.h-1,'door is on bottom row');
 assert(!isBlocked(scene,b.doorX,b.doorY+1),'clear entry to '+b.id);
 const route=findPath(scene,SPAWN.x,SPAWN.y,b.doorX,b.doorY+1);
 assert(route.length>0,'door reachable from the square '+b.id);
}
assert.deepEqual(HOUSES.inn.chimneys,[[113,34]],'tavern smoke starts at the chimney mouth');
assert.deepEqual(HOUSES.inn.lanterns,[[28,116],[47,116]],'tavern lamp glow follows the art');
assert.equal(scene.buildings.find(b=>b.sprite==='inn').w,5,'tavern remains five tiles wide');
assert.equal(Object.keys(HOUSES).length,6,'six themed building sprites');
assert.equal(FOUNTAIN.w,3);
assert.deepEqual(fountainFootprint('fountain'),{w:3,h:3});
const fountains=scene.objects.filter(o=>o.sprite==='fountain');
assert.equal(fountains.length,1,'one animated fountain in the village square');
const f=fountains[0];
for(let y=f.y;y<f.y+3;y++)for(let x=f.x;x<f.x+3;x++)
 assert(isBlocked(scene,x,y),'fountain must block its complete 3x3 footprint');
const c={
 globalAlpha:.78,
 ops:[],
 save(){this.ops.push(['save',this.globalAlpha]);},
 restore(){this.ops.push(['restore']);},
 fillRect(x,y,w,h){this.ops.push([this.fillStyle,x,y,w,h,this.globalAlpha]);}
};
drawSmoke(c,[[80,10]],0,0,0);
assert(c.ops.some(o=>o[0]==='#cfcbbd'||o[0]==='#9c9990'),'smoke is emitted');
const smokeFrames=c.ops.length;c.ops=[];
drawBuildingLights(c,'chapel',0,0,300);
assert(c.ops.some(o=>o[0]==='#fff4b2'),'subtle window lights');
c.ops=[];drawFountainWater(c,0,0,0);const wave0=c.ops.map(x=>JSON.stringify(x));
c.ops=[];drawFountainWater(c,0,0,200);const wave1=c.ops.map(x=>JSON.stringify(x));
assert.notDeepEqual(wave0,wave1,'water changes across frames');
console.log('PASS: six odd-width facades, centered doors, reachable houses, chimney/window coordinates and flowing water.');
