// Combat focus is separate from click-to-move and NPC interaction.
// Ranged attacks only work for an eligible class/weapon and along a clear ray.
import {isBlocked,TILE} from './map.js';
import {DRUID_SKILLS} from './druid-skills.js';

export function autoRangedSkill(player){
 // Character art (2D or 3D) does not determine combat capabilities.
 // Extend this table when additional character classes/weapons are introduced.
 const characterClass=player?.classId??'druid';
 const weapon=player?.weaponType??'staff';
 if(characterClass==='druid'&&weapon==='staff'&&player?.rangedEnabled!==false)return 'bolt';
 return null;
}
export function canFocusShoot(map,shooter,target,skillId=autoRangedSkill(shooter)){
 const skill=DRUID_SKILLS[skillId];
 if(!map||!shooter||!target?.alive||!skill||!Number.isFinite(skill.range))return false;
 const dx=target.px-shooter.px,dy=target.py-shooter.py;
 const length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<1||length>skill.range*TILE+0.01)return false;
 // Sample the center line every quarter tile so obstacles block diagonals too.
 // Do not consider either occupied end tile an obstruction.
 const ownX=Math.floor(shooter.px/TILE),ownY=Math.floor(shooter.py/TILE);
 const targetX=Math.floor(target.px/TILE),targetY=Math.floor(target.py/TILE);
 for(let d=TILE/4;d<length;d+=TILE/4){
  const x=Math.floor((shooter.px+dx*d/length)/TILE);
  const y=Math.floor((shooter.py+dy*d/length)/TILE);
  if((x===ownX&&y===ownY)||(x===targetX&&y===targetY))continue;
  if(isBlocked(map,x,y))return false;
 }
 return true;
}


/**
 * Find the nearest reachable attack position on the cardinal tile grid.
 * Breadth-first search is performed once for all possible firing positions,
 * rather than running pathfinding separately for every candidate tile.
 * No enemy or scenery tile can become a movement destination.
 */
export function findFocusApproach(map,from,target,mode,occupied=()=>false,shooter=null){
 if(!map||!from||!target?.alive||!['staff','bolt'].includes(mode))return [];
 if(mode==='bolt'&&autoRangedSkill(shooter)!=='bolt')return [];
 const valid=(x,y)=>{
  const px=(x+.5)*TILE,py=(y+.8)*TILE;
  if(mode==='staff')return Math.hypot(px-target.px,py-target.py)<49;
  return canFocusShoot(map,{...shooter,px,py},target,'bolt');
 };
 if(valid(from.x,from.y))return [];
 const key=(x,y)=>y*map.width+x;
 const start=key(from.x,from.y),seen=new Set([start]),parent=new Map();
 const queue=[{x:from.x,y:from.y}];
 const directions=[[0,-1],[1,0],[0,1],[-1,0]];
 for(let head=0;head<queue.length;head++){
  const current=queue[head],prev=key(current.x,current.y);
  for(const [dx,dy] of directions){
   const x=current.x+dx,y=current.y+dy,k=key(x,y);
   if(seen.has(k)||isBlocked(map,x,y)||occupied(x,y))continue;
   seen.add(k);parent.set(k,prev);
   if(valid(x,y)){
    const route=[];
    for(let at=k;at!==start;at=parent.get(at))
     route.push({x:at%map.width,y:Math.floor(at/map.width)});
    return route.reverse();
   }
   queue.push({x,y});
  }
 }
 return [];
}
