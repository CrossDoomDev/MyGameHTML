// One deterministic combat effect engine for every class and tree ability.
// No network or server authority: local combat-training prototype.
import {TILE,isBlocked,findPath} from './map.js';
import {CLASS_SKILLS,skillColor} from './class-skills.js';
const dist=(a,b)=>Math.hypot(a.px-b.px,a.py-b.py);
const hostiles=(g)=>g.mobs.filter(m=>m.alive);
export const SELF_EFFECTS=new Set(['heal','hot','areaHeal','cleanse','mana','manaHeal','shield','shieldHeal','buff','form','formGuard','stealth','summon','area','rootArea','stunArea','areaSlow','areaDot']);
function pickTarget(g,skill){
 const candidates=hostiles(g).filter(m=>dist(g.player,m)<=Math.max(1,skill.range)*TILE+16);
 const focused=g.combatTarget;
 if(focused?.alive&&candidates.includes(focused))return focused;
 const facing={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[g.player.direction||'down'];
 const aligned=candidates.filter(m=>{
  const dx=m.x-g.player.x,dy=m.y-g.player.y;
  return facing[0]? Math.sign(dx)===facing[0]&&Math.abs(dy)<=1 :
   Math.sign(dy)===facing[1]&&Math.abs(dx)<=1;
 });
 return (aligned.length?aligned:candidates).sort((a,b)=>dist(a,g.player)-dist(b,g.player))[0]||null;
}
function damage(g,enemy,amount){if(!enemy?.alive)return false;return g.damageMob(enemy,Math.round(amount));}
function restore(g,amount,target){
 const recipient=target?.training?target:g.player;
 const max=recipient.training?recipient.max:recipient.maxHp;
 const gain=Math.max(0,Math.min(amount,max-recipient.hp));
 recipient.hp+=gain;
 if(recipient.training){g.dummyStats.healing+=Math.round(gain);g.dummyStats.healHits++;}
 if(gain)g.effect('+'+Math.round(gain)+' лечение',recipient,'#a7f6ae');
 return gain;
}
function show(g,type,at,color,radius){
 g.effects.push({type:type==='shot'?'bolt':type.includes('heal')||type==='hot'?'heal':'roots',
  x:g.player.px,y:g.player.py-14,tx:at?.px||g.player.px,ty:(at?.py||g.player.py)-16,
  radius:radius||55,time:g.time,duration:700,color});
}
function applyStatus(g,target,type,power,duration){
 if(!target?.alive)return;
 if(type==='root')target.rootedUntil=Math.max(target.rootedUntil||0,g.time+duration);
 if(type==='stun'){
  target.rootedUntil=Math.max(target.rootedUntil||0,g.time+duration);
  target.stunnedUntil=Math.max(target.stunnedUntil||0,g.time+duration);
 }
 if(type==='slow')target.slowUntil=Math.max(target.slowUntil||0,g.time+duration);
 if(type==='weaken')target.weakenUntil=Math.max(target.weakenUntil||0,g.time+duration);
 if(type==='dot'){
  g.combatStatuses.push({type:'dot',target,power:Math.round(power),ticks:3,
   next:g.time+1000,expires:g.time+4000});
 }
}
export function tickClassEffects(g){
 if(!g.combatStatuses)g.combatStatuses=[];
 for(const s of g.combatStatuses){
  if(s.type==='dot'){
   if(s.target?.alive&&g.time>=s.next&&s.ticks>0){
    damage(g,s.target,s.power);s.ticks--;s.next+=1000;
   }
  }else if(s.type==='hot'){
   if(g.time>=s.next&&s.ticks>0){
    restore(g,s.power,s.target);s.ticks--;s.next+=1000;
   }
  }else if(s.type==='summon'){
   if(g.time>=s.next&&s.ticks>0){
    const target=pickTarget(g,{range:5});
    if(target)damage(g,target,s.power);
    s.ticks--;s.next+=1000;
   }
  }
 }
 g.combatStatuses=g.combatStatuses.filter(s=>s.ticks>0&&g.time<s.expires);
 // Buff values expire naturally; shield absorbs attacks until depleted.
 if(g.buffUntil&&g.time>=g.buffUntil){g.buffPower=0;g.buffUntil=0;}
 if(g.formUntil&&g.time>=g.formUntil){g.formPower=0;g.formUntil=0;}
 if(g.stealthUntil&&g.time>=g.stealthUntil)g.stealthUntil=0;
}
export function castClassSkill(g,id,{target=null,automatic=false}={}){
 const skill=CLASS_SKILLS[id],p=g.player;
 if(!skill||!g.ready||g.ui.open||g.editor?.active)return false;
 const belongs=g.currentSkills().some(n=>n.id===id);
 if(!belongs){if(!automatic)g.toast('Эта способность недоступна выбранному классу.');return false;}
 if(g.time<(g.skillCooldowns[id]||0)){
  if(!automatic)g.toast(skill.name+': ещё '+Math.ceil((g.skillCooldowns[id]-g.time)/1000)+' с');
  return false;
 }
 if(p.mana<skill.mana){if(!automatic)g.toast('Недостаточно маны');return false;}
 const t=target?.alive?target:pickTarget(g,skill);
 const type=skill.effect,location=type==='area'||type==='areaSlow'||type==='areaDot'?
   (t||p):p;
 const recipient=t?.training?t:p;
 const attackTypes=new Set(['shot','slow','root','dot','melee','execute','leech','stun','weaken','dash']);
 if(attackTypes.has(type)&&!t){
  if(!automatic)g.toast('Выбери противника или тренировочный манекен.');
  return false;
 }
 if(['melee','execute','leech','stun'].includes(type)&&dist(p,t)>TILE*1.65&&skill.range<=2){
  if(!automatic)g.toast('Нужно подойти ближе к цели.');
  return false;
 }
 p.mana-=skill.mana;g.skillCooldowns[id]=g.time+skill.cooldown;
 g.lastAttack=g.time;
 if(!automatic){p.attackStarted=g.time;p.attackUntil=g.time+360;p.attackDirection=p.direction;}
 const power=skill.power+(p.level-1)*3;
 const color=skillColor(type);
 const area=()=>hostiles(g).filter(m=>dist(m,location)<=(skill.range<=2?78:130));
 switch(type){
 case 'shot':case 'melee':case 'execute':{
  damage(g,t,power+(type==='execute'&&t.hp/t.max<.4?power*.6:0));break;
 }
 case 'slow':damage(g,t,power);applyStatus(g,t,'slow',0,4000);break;
 case 'stun':damage(g,t,power);applyStatus(g,t,'stun',0,2100);break;
 case 'root':damage(g,t,power);applyStatus(g,t,'root',0,2700);break;
 case 'weaken':damage(g,t,power);applyStatus(g,t,'weaken',0,4700);break;
 case 'dot':damage(g,t,Math.ceil(power/2));applyStatus(g,t,'dot',power,4000);break;
 case 'leech':damage(g,t,power);restore(g,Math.round(power*.65),null);break;
 case 'area':for(const m of area())damage(g,m,power);break;
 case 'areaSlow':for(const m of area()){damage(g,m,power);applyStatus(g,m,'slow',0,4200);}break;
 case 'areaDot':for(const m of area()){damage(g,m,Math.ceil(power/2));applyStatus(g,m,'dot',power,4000);}break;
 case 'rootArea':for(const m of hostiles(g).filter(m=>dist(m,p)<140)){damage(g,m,power);applyStatus(g,m,'root',0,2400);}break;
 case 'stunArea':for(const m of hostiles(g).filter(m=>dist(m,p)<130)){damage(g,m,power);applyStatus(g,m,'stun',0,2200);}break;
 case 'heal':restore(g,power,recipient);break;
 case 'areaHeal':restore(g,power,p);if(t?.training)restore(g,power,t);break;
 case 'hot':g.combatStatuses.push({type:'hot',target:recipient,power:Math.ceil(power/2),ticks:4,next:g.time+1000,expires:g.time+5200});break;
 case 'cleanse':restore(g,power,p);g.combatStatuses=g.combatStatuses.filter(s=>s.type!=='dot'||s.target!==p);break;
 case 'shield':case 'formGuard':g.shield=Math.max(g.shield||0,power);g.shieldUntil=g.time+9000;
  if(type==='formGuard'){g.formUntil=g.time+9000;g.formKind='bear';}break;
 case 'shieldHeal':g.shield=Math.max(g.shield||0,power);g.shieldUntil=g.time+11000;restore(g,Math.round(power*.5),p);break;
 case 'buff':case 'form':g.buffPower=power;g.buffUntil=g.time+8500;
  if(type==='form'){g.formUntil=g.time+8500;g.formKind=id==='cat-form'?'cat':'beast';}break;
 case 'stealth':g.stealthUntil=g.time+5300;break;
 case 'mana':p.mana=Math.min(p.maxMana,p.mana+power);g.effect('+'+power+' мана',p,'#8fbfff');break;
 case 'manaHeal':p.mana=Math.min(p.maxMana,p.mana+power);restore(g,power,p);break;
 case 'summon':g.combatStatuses.push({type:'summon',power:Math.ceil(power/2),ticks:12,next:g.time+1000,expires:g.time+13000});break;
 case 'dash':{
  // A dash must visibly approach an occupied target, not merely deal damage
  // from the starting tile. Route to the nearest open cardinal neighbor.
  const adjacent=[[t.x+1,t.y],[t.x-1,t.y],[t.x,t.y+1],[t.x,t.y-1]];
  const candidates=adjacent.filter(([x,y])=>!isBlocked(g.map,x,y)&&
   (x===p.x&&y===p.y||!g.occupied(x,y)))
   .map(([x,y])=>findPath(g.map,p.x,p.y,x,y,
      (xx,yy)=>g.occupied(xx,yy)&&!(xx===p.x&&yy===p.y)))
   .filter(path=>path.length||dist(p,t)<TILE*1.65);
  candidates.sort((a,b)=>a.length-b.length);
  if(candidates[0]?.length)g.path=candidates[0];
  if(!candidates.length&&dist(p,t)>=TILE*1.65){
   // Nothing to traverse: no fake teleport through solid walls.
   g.effect('Нет пути',p,'#efb282');
   break;
  }
  damage(g,t,power);break;
 }
 }
 show(g,type,t,color,110);
 g.bip(type==='heal'||type==='hot'?650:320,.08);
 g.save();return true;
}
