// Ambient class-showcase characters. They wander locally and do not belong
// to saved map-editor NPC data or overwrite the user's hand-edited village.
export const CLASS_SPRITES=Object.freeze(['archer','warrior','mage','rogue','paladin','cleric']);
export const CLASS_VISITORS=Object.freeze([
 {id:'class-archer',name:'Элия',role:'Лучница',sprite:'archer',x:24,y:25},
 {id:'class-warrior',name:'Ратмир',role:'Воин',sprite:'warrior',x:33,y:23},
 {id:'class-mage',name:'Селена',role:'Маг',sprite:'mage',x:34,y:28},
 {id:'class-rogue',name:'Тень',role:'Разбойник',sprite:'rogue',x:21,y:20},
 {id:'class-paladin',name:'Арден',role:'Паладин',sprite:'paladin',x:41,y:25},
 {id:'class-cleric',name:'Лиора',role:'Целительница',sprite:'cleric',x:31,y:36}
].map((n,i)=>Object.freeze({...n,seed:i+1})));
export const PATROL_RADIUS=3;
// One tile at a time, strictly cardinal. Never step into a blocked cell,
// player, another pedestrian or the tile already reserved by another actor.
export function nextVisitorStep(visitor,time,isPassable){
 const random=(salt)=>{let n=Math.imul((visitor.seed||1)*7919+salt*3011+Math.floor(time/251),2654435761);n=(n^(n>>>16))>>>0;return n/4294967296;};
 if(random(5)<.22)return null; // linger and occasionally just look around
 const dirs=[[1,0,'right'],[-1,0,'left'],[0,1,'down'],[0,-1,'up']];
 const shift=Math.floor(random(17)*4);
 for(let i=0;i<4;i++){
  const [dx,dy,direction]=dirs[(i+shift)%4],x=visitor.x+dx,y=visitor.y+dy;
  if(Math.abs(x-visitor.homeX)+Math.abs(y-visitor.homeY)>PATROL_RADIUS)continue;
  if(isPassable(x,y))return {x,y,direction};
 }
 return null;
}
