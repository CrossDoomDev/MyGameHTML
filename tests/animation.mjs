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
const directions=['down','left','right','up'];
for(const from of directions)for(const to of directions.filter(direction=>direction!==from)){
 const e={sprite:'hero',moving:true,direction:from,attackUntil:0,step:{duration:240},px:40,py:64};
 updateAnimation(e,0,0);updateAnimation(e,270,270);
 assert.equal(characterFrame(e,270),3,'turn starts between the two contact poses');
 e.direction=to;updateAnimation(e,90,360);
 assert.equal(e.animationTime,360,'turn preserves and advances the existing stride');
 assert.equal(e.animationDirection,to,'animation records the new facing direction');
 assert.equal(characterFrame(e,360),4,'the opposite foot contact follows a turn');
 const ops=[],c={drawImage(...args){ops.push(args);}};
 drawCharacter(c,{images:{hero:{}}},e,360);
 assert.equal(ops[0][1],4*48,'turned character renders the continuing 48px walk pose');
 assert.equal(ops[0][2],directions.indexOf(to)*48,'turned character renders its new facing row');
 e.direction=from;updateAnimation(e,180,540);
 assert.equal(characterFrame(e,540),5,'a second turn continues the second passing pose');
 updateAnimation(e,180,720);
 assert.equal(characterFrame(e,720),2,'stride wraps smoothly after turning');
}
const zigzag={moving:true,direction:'down',attackUntil:0,step:{duration:210}};
updateAnimation(zigzag,0,0);
const zigzagFrames=[];
for(let i=0;i<12;i++){
 zigzag.direction=directions[i%4];updateAnimation(zigzag,105,(i+1)*105);
 zigzagFrames.push(characterFrame(zigzag,(i+1)*105));
}
assert.deepEqual(zigzagFrames,[3,4,5,2,3,4,5,2,3,4,5,2],'repeated turns retain alternating contact and passing phases');
for(const direction of ['down','left','right','up']){
 const e={sprite:'hero',direction:'up',attackDirection:direction,attackStarted:1000,attackUntil:1360,px:40,py:64};
 const ops=[],c={drawImage(...args){ops.push(args);}},assets={images:{hero:{}}};
 for(const [i,offset] of [0,90,180,270].entries()){
  assert.equal(characterFrame(e,1000+offset),6+i);drawCharacter(c,assets,e,1000+offset);
  assert.equal(ops.at(-1)[2],['down','left','right','up'].indexOf(direction)*48,'attack direction remains locked');
 }
 assert.equal(characterFrame(e,1360),0,'attack returns to idle');
}
for(const sprite of NPC_SPRITES){
 const c={drawImage(image,sx,sy,sw,sh){assert.equal(sx,0);assert.equal(sy,144);assert.equal(sw,48);assert.equal(sh,48);}};
 drawCharacter(c,{images:{[sprite]:{}}},{sprite,direction:'up',attackUntil:0,px:0,py:0},987654);
}
// New 2D druid: a foot-contact pose lasts a visible 180ms, without flicker.
const druid={sprite:'hero',direction:'down',moving:true,attackUntil:0,step:{duration:240}};
updateAnimation(druid,0,0);
assert.equal(characterFrame(druid,0),2);
for(const [elapsed,expected] of [[179,2],[180,3],[359,3],[360,4],[539,4],[540,5],[719,5],[720,2]]){
 const dt=elapsed-(druid.checkTime||0);
 updateAnimation(druid,dt,elapsed);druid.checkTime=elapsed;
 assert.equal(characterFrame(druid,elapsed),expected,'druid walk phase '+elapsed);
}
const slowHero={sprite:'hero',direction:'up',moving:true,attackUntil:0,step:{duration:480}};
updateAnimation(slowHero,0,0);
updateAnimation(slowHero,360,360);
assert.equal(characterFrame(slowHero,360),3,'step duration scales gait with movement speed');
// The hero is completely motionless while waiting, independent of clock time.
const resting={sprite:'hero',direction:'right',moving:false,attackUntil:0,px:64,py:75};
for(const moment of [0,180,650,1300,6500,30123]){
 updateAnimation(resting,180,moment);
 assert.equal(characterFrame(resting,moment),0,'idle pose must never step between feet');
 const ops=[],c={drawImage(...args){ops.push(args);}};
 drawCharacter(c,{images:{hero:{}}},resting,moment);
 assert.deepEqual(ops[0].slice(1,5),[0,2*48,48,48],'single idle source frame in 48px atlas');
 assert.deepEqual(ops[0].slice(5),[40,32,48,48],'48px size, feet anchored on the tile');
}
resting.attackDirection='right';resting.attackStarted=32000;resting.attackUntil=32360;
assert.equal(characterFrame(resting,32180),8,'still character can attack');
resting.attackUntil=0;
assert.equal(characterFrame(resting,32400),0,'after attack player returns to neutral pose');
console.log('PASS: stable 720ms druid gait, four directions, slow steps, turns, attack phases and NPC frames.');
