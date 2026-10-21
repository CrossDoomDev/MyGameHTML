import assert from 'node:assert/strict';
import {FORGE_CHIMNEY,FORGE_HEARTH,FORGE_FRAME_MS,FORGE_SIZE,repairForgeRoof,drawForgeEffects} from '../src/forge-animation.js';

function context(){
 const operations=[],stack=[];
 const ctx={operations,fillStyle:'#000',globalAlpha:1,
  save(){stack.push({fillStyle:this.fillStyle,globalAlpha:this.globalAlpha});},
  restore(){Object.assign(this,stack.pop());},
  fillRect(x,y,w,h){operations.push({type:'rect',x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},
  clearRect(x,y,w,h){operations.push({type:'clear',x,y,w,h});}
 };
 return ctx;
}
assert.equal(FORGE_SIZE,144);
assert.deepEqual(FORGE_CHIMNEY,{x:87,y:27});
assert.deepEqual(FORGE_HEARTH,{x:87,y:119});
assert.equal(FORGE_FRAME_MS,180);
const roof=context();
repairForgeRoof(roof);
assert(roof.operations.some(o=>o.type==='clear'&&o.x===73&&o.y===0&&o.w===38&&o.h===27),
 'stationary smoke must be removed from source art');
assert(roof.operations.some(o=>o.color==='#282824'&&o.y===FORGE_CHIMNEY.y),
 'chimney mouth should be restored at actual outlet');
assert(roof.operations.some(o=>o.color==='#454641'&&o.y===83),
 'chimney/roof joint should be flashed');
assert(roof.operations.every(o=>o.type==='clear'||(o.y>=26&&o.y<95)),
 'roof correction must not paint over the building facade');
const a=context(),b=context();
drawForgeEffects(a,100,200,0);
drawForgeEffects(b,100,200,FORGE_FRAME_MS);
const flame=ops=>ops.filter(o=>['#db4d15','#ff9b1e','#ffe267','#fff0aa'].includes(o.color));
const smoke=ops=>ops.filter(o=>['#595a57','#928c83','#b1a79b'].includes(o.color));
assert(flame(a.operations).length>10,'forge fire must be visible');
assert(smoke(a.operations).length===12,'four smoke puffs');
assert.notDeepEqual(flame(a.operations),flame(b.operations),'fire changes every frame');
for(const t of [0,180,900,1200,2100,4200]){
 const frame=context();frame.globalAlpha=.5;
 drawForgeEffects(frame,100,200,t);
 assert.equal(frame.globalAlpha,.5,'building fade alpha should be preserved');
 for(const puff of smoke(frame.operations)){
  assert(puff.y+puff.h<=200+FORGE_CHIMNEY.y,
   'smoke must stay above the chimney mouth, not emit from the roof');
 }
 for(const flicker of flame(frame.operations)){
  assert(flicker.y>200+FORGE_HEARTH.y-18 && flicker.y<200+FORGE_HEARTH.y+1,
   'fire stays within furnace aperture');
 }
}
console.log('PASS: repaired roof joint and chimney mouth; moving smoke from outlet; animated hearth fire.');
