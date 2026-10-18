import assert from 'node:assert/strict';
import { updateAnimation, characterFrame } from '../src/animation.js';
import { drawCharacter, NPC_SPRITES } from '../src/assets.js';
for(const start of [0,137,9027]){
 const e={moving:true,direction:'down',attackUntil:0,step:{duration:210}};
 updateAnimation(e,16,start);assert.equal(characterFrame(e,start),2,'walk always starts at its first pose');
 const frames=[];for(let i=0;i<4;i++){frames.push(characterFrame(e,start+i*105));updateAnimation(e,105,start+(i+1)*105);}
 assert.deepEqual(frames,[2,3,4,5]);
 updateAnimation(e,0,start+420);assert.equal(characterFrame(e,start+420),2,'gait loops');
 e.moving=false;updateAnimation(e,16,start+500);assert.equal(characterFrame(e,start+500),0,'stop returns to neutral');
 e.moving=true;updateAnimation(e,16,start+501);assert.equal(characterFrame(e,start+501),2,'restart does not inherit idle phase');
}
const slow={moving:true,direction:'up',attackUntil:0,step:{duration:420}};
updateAnimation(slow,0,0);updateAnimation(slow,210,210);assert.equal(characterFrame(slow,210),3,'gait follows movement speed');
for(const direction of ['down','left','right','up']){
 const e={sprite:'hero',direction:'up',attackDirection:direction,attackStarted:1000,attackUntil:1360,px:40,py:64};
 const ops=[],c={drawImage(...args){ops.push(args);}},assets={images:{hero:{}}};
 for(const [i,offset] of [0,90,180,270].entries()){
  assert.equal(characterFrame(e,1000+offset),6+i);drawCharacter(c,assets,e,1000+offset);
  assert.equal(ops.at(-1)[2],['down','left','right','up'].indexOf(direction)*80,'attack direction remains locked');
 }
 assert.equal(characterFrame(e,1360),0,'attack returns to idle');
}
for(const sprite of NPC_SPRITES){
 const c={drawImage(image,sx,sy,sw,sh){assert.equal(sx,0);assert.equal(sy,144);assert.equal(sw,48);assert.equal(sh,48);}};
 drawCharacter(c,{images:{[sprite]:{}}},{sprite,direction:'up',attackUntil:0,px:0,py:0},987654);
}
console.log('PASS: animation starts, gait loop/speed, stop/restart, attack phases/direction and NPC atlas bounds.');
