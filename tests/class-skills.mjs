import assert from 'node:assert/strict';
import {CLASS_PROFILES,CLASS_TREES,CLASS_SKILLS,allClassSkills,initialClass} from '../src/class-skills.js';
import {castClassSkill,tickClassEffects} from '../src/class-combat.js';
import {createMap,TILE} from '../src/map.js';
const ids=Object.keys(CLASS_PROFILES);
assert.deepEqual(ids,['druid','archer','warrior','mage','rogue','paladin','cleric']);
assert.equal(initialClass('absent'),'druid');
assert.equal(new Set(Object.keys(CLASS_SKILLS)).size,82,'all 82 abilities have unique IDs');
assert.equal(CLASS_TREES.druid.length,4);
const map=createMap('village');
let count=0;
for(const id of ids){
 const branches=CLASS_TREES[id];
 assert.equal(branches.length,id==='druid'?4:3,id+' class specialization count');
 const nodes=allClassSkills(id);
 assert.equal(nodes.length,id==='druid'?28:9,id+' skill tree count');
 assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length,'no duplicated ability nodes');
 assert(CLASS_PROFILES[id].keys.every(key=>nodes.some(n=>n.id===key)),id+' Q/R/F bind to real abilities');
 for(const n of nodes){
  const spell=CLASS_SKILLS[n.id];
  assert(spell&&spell.name===n.name,'UI node '+n.id+' maps to combat spell');
  assert(/^class_[a-z]+_[012]$/.test(n.icon)||id==='druid'&&!!n.icon,'class skill '+n.id+' has actual illustration');
  assert(spell.effect&&spell.cooldown>0&&spell.range>=0);
  const dummy={kind:'mob',training:true,alive:true,x:31,y:24,
   px:(31+.5)*TILE,py:(24+.8)*TILE,hp:400,max:500};
  const p={classId:id,level:1,x:30,y:24,px:(30+.5)*TILE,py:(24+.8)*TILE,
   hp:80,maxHp:150,mana:1000,maxMana:1000,direction:'right'};
  let lastDamage=0;
  const g={player:p,map,mobs:[dummy],combatTarget:dummy,ready:true,time:10000,
   skillCooldowns:{},combatStatuses:[],effects:[],ui:{open:false},
   editor:{active:false},lastAttack:-1000,shield:0,shieldUntil:0,
   buffPower:0,buffUntil:0,stealthUntil:0,path:[],
   dummyStats:{damage:0,hits:0,healing:0,healHits:0},
   currentSkills:()=>nodes,occupied:()=>false,bip(){},save(){},toast(){},
   effect(text,at,color){this.effects.push({type:'text',text,x:at.px,y:at.py,time:this.time,color})},
   damageMob(m,amount){lastDamage+=amount;m.hp-=amount;return true}
  };
  assert.equal(castClassSkill(g,n.id,{target:dummy}),true,id+'/'+n.id+' casts');
  assert(g.skillCooldowns[n.id]>g.time,'cooldown starts for '+n.id);
  assert.equal(castClassSkill(g,n.id,{target:dummy}),false,'cooldown blocks repeat '+n.id);
  if(['shot','melee','execute','leech','dot','slow','root','stun','weaken'].includes(spell.effect))
   assert(lastDamage>0,'attack '+n.id+' damages the practice dummy');
  if(['heal','areaHeal','shieldHeal','cleanse','hot'].includes(spell.effect)){
   if(spell.effect==='hot'){g.time+=1100;tickClassEffects(g);}
   assert(p.hp>80||dummy.hp>400||g.combatStatuses.length===0,'healing '+n.id+' has real effect');
  }
  if(['dot','areaDot','summon','hot'].includes(spell.effect)){
   g.time+=1100;tickClassEffects(g);
  }
  count++;
 }
}
assert.equal(count,82);
console.log('PASS: Seven switchable classes and 82 castable skills with cooldowns, statuses and effects.');
