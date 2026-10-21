import assert from 'node:assert/strict';
import {DRUID_SKILLS,SKILL_KEYS,skillRemaining,boltTrace,rootsTargets} from '../src/druid-skills.js';

assert.deepEqual(Object.keys(DRUID_SKILLS),['bolt','roots','heal']);
assert.deepEqual(SKILL_KEYS,{KeyQ:'bolt',KeyR:'roots',KeyF:'heal'});
for(const skill of Object.values(DRUID_SKILLS)){
 assert(skill.mana>0&&skill.cooldown>0,'each ability has a cost and cooldown');
}
assert.equal(skillRemaining({bolt:3000},'bolt',1000),2000);
assert.equal(skillRemaining({bolt:3000},'bolt',3200),0);

const blocked=Array.from({length:12},()=>Array(12).fill(false));
const map={width:12,height:12,blocked};
const player={x:5,y:5,px:5.5*32,py:5.8*32};
const enemy=(x,y)=>({x,y,px:(x+.5)*32,py:(y+.8)*32,alive:true});
const close=enemy(5,3),far=enemy(5,1),side=enemy(6,4);
let shot=boltTrace(map,player,'up',[far,close,side]);
assert.equal(shot.target,close,'hits nearest enemy ahead, ignoring off-axis enemy');
assert.equal(shot.y,close.py,'stops at hit');
blocked[4][5]=true;
shot=boltTrace(map,player,'up',[close]);
assert.equal(shot.target,null,'does not pass through blocked terrain');
assert.equal(shot.y,player.py,'wall adjacent to hero blocks shot');
blocked[4][5]=false;
shot=boltTrace(map,player,'right',[side]);
assert.equal(shot.target,null,'diagonal enemy is not hit');
shot=boltTrace(map,player,'right',[enemy(8,5)]);
assert.equal(shot.target?.x,8,'cardinal right attack works');
shot=boltTrace(map,player,'left',[]);
assert.equal(shot.x,(player.x-5+.5)*32,'range limited to five grid cells');
const roots=rootsTargets(player,[close,side,enemy(9,9),{...enemy(5,6),alive:false}]);
assert.deepEqual(roots,[close,side],'roots affect nearby alive enemies only');
console.log('PASS: druid skill bindings, costs, cooldowns, cardinal ray collision and proximity targeting.');
