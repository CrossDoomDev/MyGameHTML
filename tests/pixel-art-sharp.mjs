import assert from 'node:assert/strict';
import {sharpenPixels,sharpenCanvas} from '../src/pixel-art-sharp.js';
import {HOUSES,ART_ATLAS,ATLAS_SOURCE} from '../src/village-art.js';

assert.equal(ART_ATLAS,'village-compact.webp');
assert.deepEqual(ATLAS_SOURCE,[240,160]);
for(const [id,model] of Object.entries(HOUSES)){
 assert.equal(model.w,5,'keep original compact house width '+id);
 assert.equal((model.w-1)/2,2,'door centered in 5-tile facade '+id);
 assert.deepEqual(model.atlas.slice(2),[80,id==='market'?48:80],'do not enlarge source footprint '+id);
}
// A soft but opaque edge becomes stronger, without changing the alpha channel.
const input=new Uint8ClampedArray([
 70,70,70,255, 120,120,120,255, 170,170,170,255,
 70,70,70,255, 120,120,120,255, 170,170,170,255,
 70,70,70,255, 120,120,120,255, 170,170,170,255
]);
const before=new Uint8ClampedArray(input);
sharpenPixels(input,3,3,{strength:1.5,threshold:3});
assert(input[0]<before[0],'dark facade edge becomes darker');
assert(input[8]>before[8],'highlighted facade edge becomes lighter');
for(let i=3;i<input.length;i+=4)assert.equal(input[i],before[i],'transparency unchanged');
const empty=new Uint8ClampedArray([0,0,0,0,100,100,100,255,200,200,200,0]);
sharpenPixels(empty,3,1);
assert.equal(empty[3],0);
assert.equal(empty[11],0);
const ctx={imageSmoothingEnabled:true,frame:{data:new Uint8ClampedArray(input)},
 getImageData(){return this.frame;},putImageData(next){this.frame=next;this.updated=true;}};
const canvas={width:3,height:3,getContext:()=>ctx};
assert(sharpenCanvas(canvas),'browser canvas postprocess works');
assert.equal(ctx.updated,true);
assert.equal(sharpenCanvas({width:2,height:2,getContext:()=>({})}),false,'headless mocks remain supported');
assert.throws(()=>sharpenPixels(new Uint8ClampedArray(3),2,2),/Invalid/);
console.log('PASS: sharper pixel edges, preserved alpha and compact 5-tile door-centered houses.');
