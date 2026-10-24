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
