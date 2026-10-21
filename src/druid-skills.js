// Druid abilities use the existing 32px cardinal grid, without projectiles
// traversing walls or additional asset downloads.
import {isBlocked,TILE} from './map.js';
export const DRUID_SKILLS=Object.freeze({
 bolt:Object.freeze({name:'Изумрудный луч',key:'KeyQ',mana:10,cooldown:2400,damage:20,range:5,color:'#8aff9b'}),
 roots:Object.freeze({name:'Цепкие корни',key:'KeyR',mana:18,cooldown:6500,damage:8,rootMs:2000,radius:112,color:'#b4dc79'}),
 heal:Object.freeze({name:'Живительный рост',key:'KeyF',mana:16,cooldown:8500,heal:35,color:'#9af6bd'})
});
export const SKILL_KEYS=Object.fromEntries(Object.entries(DRUID_SKILLS).map(([id,skill])=>[skill.key,id]));
export function skillRemaining(cooldowns,id,now){
 return Math.max(0,(cooldowns?.[id]||0)-now);
}
export function boltTrace(map,player,direction,enemies){
 const vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
 const [dx,dy]=vectors[direction]||vectors.down;
 let x=player.x,y=player.y,target=null;
 for(let distance=1;distance<=DRUID_SKILLS.bolt.range;distance++){
  const tx=player.x+dx*distance,ty=player.y+dy*distance;
  if(isBlocked(map,tx,ty))break;
  x=tx;y=ty;
  target=enemies.find(e=>e.alive&&e.x===tx&&e.y===ty);
  if(target)break;
 }
 return {x:(x+.5)*TILE,y:(y+.8)*TILE,target};
}
export function rootsTargets(player,enemies){
 return enemies.filter(e=>e.alive&&Math.hypot(e.px-player.px,e.py-player.py)<=DRUID_SKILLS.roots.radius);
}
