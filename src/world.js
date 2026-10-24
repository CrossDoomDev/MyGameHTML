import { loadAssets } from './assets.js';
import { updateAnimation } from './animation.js';
import {DRUID_SKILLS,SKILL_KEYS,skillRemaining,boltTrace,rootsTargets} from './druid-skills.js';
import {autoRangedSkill,canFocusShoot,findFocusApproach} from './combat-focus.js';
import { TILE, WIDTH, HEIGHT, SPAWN, createMap, isBlocked, findPath, removeScenery } from './map.js';
import { sceneryPlacement, coversActor } from './visibility.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { MapEditor } from './map-editor.js';
import { readEditedMaps, hydratedMap, normalizeSnapshot, sceneSnapshot } from './map-editor-data.js';

const STORAGE='tiholesye-v01';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const initial=()=>({classId:'druid',weaponType:'staff',x:SPAWN.x,y:SPAWN.y,hp:120,maxHp:120,mana:60,maxMana:60,level:1,xp:0,kills:0,coins:0,potions:2,wood:0,herbs:0,boss:false,questAccepted:false,questReward:false});
const anchored=(e)=>({...e,px:(e.x+.5)*TILE,py:(e.y+.8)*TILE,direction:'down',moving:false,step:null,attackUntil:0,attackStarted:0,hitUntil:0});
const distance=(a,b)=>Math.hypot(a.px-b.px,a.py-b.py);
const directionTo=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
export class Game{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.map=null;
  const p=initial();let data={};try{data=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{}
  for(const key of Object.keys(p)){
   if(typeof p[key]==='number'&&Number.isFinite(data[key]))p[key]=Math.max(0,data[key]);
   else if(typeof p[key]==='boolean'&&typeof data[key]==='boolean')p[key]=data[key];
  }
  p.level=clamp(Math.floor(p.level),1,99);p.maxHp=clamp(p.maxHp,100,2080);p.hp=clamp(p.hp||p.maxHp,1,p.maxHp);p.maxMana=60;p.mana=clamp(p.mana,0,60);
  this.location=data.version===3&&['village','forest','tavern'].includes(data.location)?data.location:'village';
  this.worldMaps=readEditedMaps();
  this.map=hydratedMap(this.location,this.worldMaps[this.location]);
  if(data.version!==3){p.x=SPAWN.x;p.y=SPAWN.y;}
  p.x=Math.floor(p.x);p.y=Math.floor(p.y);if(isBlocked(this.map,p.x,p.y)){p.x=SPAWN.x;p.y=SPAWN.y;}
  // One-time migration: old users may have explicitly saved the oversized
  // 3D model. Show them the new compact pixel druid on their first updated load.
  // After migration, changing the model in Settings remains persistent.
  const compactActivated=localStorage.getItem('tiholesye-compact-hero-48');
  this.modelMode=compactActivated&&localStorage.getItem('tiholesye-model')==='3d'?'3d':'2d';
  if(!compactActivated)try{
   localStorage.setItem('tiholesye-compact-hero-48','1');
   localStorage.setItem('tiholesye-model','2d');
  }catch{}
  // NPC graphics can be changed independently from the player and gameplay.
  this.npcStyle=localStorage.getItem('tiholesye-npc-style')==='pixel'?'pixel':'vector';
  this.player=anchored({...p,sprite:this.modelMode==='3d'?'hero3d':'hero'});this.path=[];this.target=null;this.combatTarget=null;this.combatRepathAt=0;this.keys=new Set();this.stick={x:0,y:0};
  this.primaryAttackMode=localStorage.getItem('tiholesye-primary-attack')==='bolt'?'bolt':'staff';
  this.time=0;this.effects=[];this.camera={x:0,y:0};this.zoom=innerWidth>=1100?2:innerWidth>=700?1.5:1;this.night=false;this.sound=false;this.lastAttack=-1000;this.lastSave=0;this.skillCooldowns={};
  this.populateLocation();
  if(this.occupied(p.x,p.y)){Object.assign(this.player,{x:SPAWN.x,y:SPAWN.y,px:(SPAWN.x+.5)*TILE,py:(SPAWN.y+.8)*TILE});}
  this.ui=new UI(this);this.editor=new MapEditor(this);this.bindInput();this.resize();
 }
 populateLocation(){
  const saved=normalizeSnapshot(this.location,this.worldMaps?.[this.location]);
  if(saved){
   this.map=hydratedMap(this.location,saved);
   this.npcs=saved.npcs.map(n=>anchored({...n,kind:'npc'}));
   this.mobs=saved.mobs.map(e=>this.makeMob(e.x,e.y,e.sprite));
   for(const m of this.mobs)if(m.boss&&this.player.boss)m.alive=false;
   this.herbs=saved.herbs.map(h=>anchored({...h,kind:'herb',collected:false}));
   return;
  }
  this.npcs=(this.location==='village'?[
   ['elder','Староста Ольгерд','elder',20,20],['smith','Кузнец Бран','smith',36,17],
   ['merchant','Торговка Мира','merchant',49,23],['villager','Травница Лина','villager',39,36],
   ['fisher','Рыбак Финн','fisher',53,29],['resident-1','Жительница Тихолесья','villager',23,32],
   ['resident-2','Деревенский путник','smith',9,21]
  ]:this.location==='tavern'?[
   ['innkeeper','Трактирщица Эльма','merchant',16,8],['patron','Посетитель таверны','villager',8,10]
  ]:[]).map(([id,name,sprite,x,y])=>anchored({id,kind:'npc',name,sprite,x,y}));
  this.mobs=this.location==='forest'?[
   this.makeMob(18,40),this.makeMob(27,38),this.makeMob(36,63,'goblin'),
   this.makeMob(50,47),this.makeMob(70,20,'goblin'),
   this.makeMob(80,63),this.makeMob(88,33,'guardian')
  ]:[];
  for(const m of this.mobs){this.clearSpawn(m.x,m.y);if(m.boss&&this.player.boss)m.alive=false;}
  for(const n of this.npcs)this.clearSpawn(n.x,n.y);
  this.herbs=(this.location==='forest'?[[11,40],[25,40],[48,36],[62,40],[72,23],[38,63],[82,60]]:[])
   .map(([x,y])=>anchored({x,y,kind:'herb',collected:false}));
  for(const h of this.herbs)this.clearSpawn(h.x,h.y);
 }
 restoreEditedScene(snapshot){
  if(snapshot){
   const valid=normalizeSnapshot(this.location,snapshot);
   if(!valid)throw Error('Повреждённый снимок карты');
   this.worldMaps[this.location]=valid;
  }else delete this.worldMaps[this.location];
  this.map=createMap(this.location);this.populateLocation();
  const p=this.player;
  if(this.blocked(p.x,p.y)){
   const fallback=this.location==='village'?[30,24]:this.location==='forest'?[3,40]:[12,14];
   let cell=[fallback,...[[p.x+1,p.y],[p.x-1,p.y],[p.x,p.y+1],[p.x,p.y-1]]].find(([x,y])=>!this.blocked(x,y));
   if(!cell)outer:for(let y=1;y<this.map.height-1;y++)for(let x=1;x<this.map.width-1;x++)if(!this.blocked(x,y)){cell=[x,y];break outer;}
   if(cell){p.x=cell[0];p.y=cell[1];}
  }
  p.px=(p.x+.5)*TILE;p.py=(p.y+.8)*TILE;p.step=null;p.moving=false;
  this.path=[];this.target=null;this.combatTarget=null;this.effects=[];
  if(this.ready)this.renderer=new Renderer(this);
 }
 enterLocation(location,x,y){
  this.location=location;this.map=hydratedMap(location,this.worldMaps[location]);this.populateLocation();
  let sx=x,sy=y;
  if(this.blocked(sx,sy)){const cell=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].find(([a,b])=>!this.blocked(a,b));if(cell)[sx,sy]=cell;}
  Object.assign(this.player,{x:sx,y:sy,px:(sx+.5)*TILE,py:(sy+.8)*TILE,step:null,moving:false});
  this.path=[];this.target=null;this.combatTarget=null;this.effects=[];
  this.ui?.updateCombatFocus();
  // Skill cooldowns persist between rooms and biomes.
  if(this.ready)this.renderer=new Renderer(this);
  this.save();
  this.toast(location==='forest'?'Ты входишь в Великий лес.':location==='tavern'?'Добро пожаловать в таверну.':'Ты вернулся в деревню.');
 }
 checkPortals(){
  const p=this.player,portal=this.map.portals?.find(t=>t.x===p.x&&t.y===p.y);
  if(!portal||p.step)return false;
  this.enterLocation(portal.to,portal.spawn.x,portal.spawn.y);return true;
 }
 makeMob(x,y,sprite='mossling'){
  const boss=sprite==='guardian',hp=boss?130:sprite==='goblin'?42:32;
  return anchored({kind:'mob',sprite,x,y,homeX:x,homeY:y,hp,max:hp,alive:true,boss,nextThink:0,lastAttack:0,respawnAt:0});
 }
 clearSpawn(x,y){if(this.map.terrain[y]?.[x]==='water')return;this.map.blocked[y][x]=false;this.map.objects=this.map.objects.filter(o=>o.x!==x||o.y!==y);}
 occupied(x,y,exclude=this.player){
  return [...this.npcs,...this.mobs.filter(m=>m.alive),this.player].some(e=>e!==exclude&&((e.x===x&&e.y===y)||(e.step&&e.step.x===x&&e.step.y===y)));
 }
 blocked(x,y,exclude=this.player){return isBlocked(this.map,x,y)||this.occupied(x,y,exclude);}
 // Plan from the tile the current step is already committed to reach.
 // Replanning must never turn an interpolated position into a new grid cell.
 movementOrigin(){const p=this.player;return {x:p.step?.x??p.x,y:p.step?.y??p.y};}
 findPath(tx,ty){
  const {x,y}=this.movementOrigin();
  return findPath(this.map,x,y,tx,ty,(a,b)=>this.occupied(a,b));
 }
 resize(){this.canvas.width=Math.max(1,Math.floor(innerWidth/this.zoom));this.canvas.height=Math.max(1,Math.floor(innerHeight/this.zoom));this.ctx.imageSmoothingEnabled=false;}
 setZoom(value){this.zoom=clamp(value,1,3);this.resize();this.toast('Масштаб '+this.zoom.toFixed(1)+'×');}
 setModelMode(mode){
  this.modelMode=mode==='3d'?'3d':'2d';this.player.sprite=this.modelMode==='3d'?'hero3d':'hero';
  try{localStorage.setItem('tiholesye-model',this.modelMode);}catch{}
  this.ui.portrait(this.assets);this.toast(this.modelMode==='3d'?'Включена 3D-модель героя':'Включён пиксельный 2D-герой');
 }
 setNPCStyle(style){
  this.npcStyle=style==='vector'?'vector':'pixel';
  try{localStorage.setItem('tiholesye-npc-style',this.npcStyle);}catch{}
  this.toast(this.npcStyle==='vector'?'Жители: векторный стиль':'Жители: пиксельный стиль');
 }
 bindInput(){
  this.canvas.addEventListener('pointerdown',e=>{
   // The secondary mouse button belongs to the game, not the browser.
   if(e.button===2)e.preventDefault();
   if(this.editor?.active){
    // Suppress browser autoscroll/context menus for middle/right-button panning.
    if(e.button===1||e.button===2)e.preventDefault();
    this.editor.pointerDown(e);
    if(this.canvas.setPointerCapture&&e.pointerId!==undefined)this.canvas.setPointerCapture(e.pointerId);
   }else this.click(e);
  });
  this.canvas.addEventListener('mousedown',e=>{
   if(this.editor?.active&&e.button===1)e.preventDefault();
  });
  this.canvas.addEventListener('auxclick',e=>{
   if(this.editor?.active&&e.button===1)e.preventDefault();
  });
  this.canvas.addEventListener('pointermove',e=>{if(this.editor?.active)this.editor.pointerMove(e);});
  this.canvas.addEventListener('pointerup',e=>{if(this.editor?.active)this.editor.pointerUp(e);});
  this.canvas.addEventListener('pointercancel',e=>{if(this.editor?.active)this.editor.pointerUp(e);});
  // Select the primary attack immediately on RMB press, including while the
  // bolt is recharging. Contextmenu remains as a keyboard/browser fallback.
  const choosePrimaryFromTarget=target=>{
   const button=target?.closest?.('#primaryStaff, #skill-bolt');
   if(button?.id==='skill-bolt')this.setPrimaryAttack('bolt');
   else if(button?.id==='primaryStaff')this.setPrimaryAttack('staff');
  };
  const gameSurface=document.getElementById('app');
  gameSurface.addEventListener('pointerdown',e=>{
   if(e.button!==2)return;
   e.preventDefault();
   if(!this.editor?.active)choosePrimaryFromTarget(e.target);
  });
  gameSurface.addEventListener('contextmenu',e=>{
   e.preventDefault();
   if(!this.editor?.active)choosePrimaryFromTarget(e.target);
  });
  this.canvas.addEventListener('wheel',e=>{
   if(this.editor?.active){e.preventDefault();this.setZoom(this.zoom+(e.deltaY<0?.25:-.25));}
  },{passive:false});
  window.addEventListener('resize',()=>this.resize());
  window.addEventListener('blur',()=>{this.keys.clear();this.stick={x:0,y:0};this.save();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.save();}});
  window.addEventListener('keydown',e=>{
   if(e.code==='F2'){e.preventDefault();if(this.editor?.active)this.editor.close();else this.ui.builder();return;}
   if(this.editor?.active){this.editor.onKey(e);return;}
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
   if(e.code==='Escape'){if(this.ui.open)this.ui.close();else this.ui.settings();return;}
   if(this.ui.open){if(e.code==='Tab')this.ui.trapFocus(e);return;}
   if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){this.keys.add(e.code);this.target=null;this.path=[];} // Keyboard movement never drops combat focus.
   if(e.repeat)return;
   if(e.code==='Space')this.primaryAttack();
   if(SKILL_KEYS[e.code]&&!e.ctrlKey&&!e.metaKey&&!e.altKey)this.castSkill(SKILL_KEYS[e.code]);
   if(e.code==='KeyE')this.interactNearest();
   if(e.code==='KeyB')this.ui.inventory();
   if(e.code==='KeyM')this.ui.map();
   if(e.code==='KeyJ')this.ui.journal();
   if(e.code.startsWith('Digit'))this.ui.slot(Number(e.code.slice(5))-1);
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  document.getElementById('mobileAttack').onclick=()=>this.primaryAttack();
  document.getElementById('mobileInteract').onclick=()=>this.interactNearest();
  const stick=document.getElementById('joystick'),knob=stick.querySelector('i');let pointer=null;
  const move=e=>{if(e.pointerId!==pointer)return;const r=stick.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/32,dy=(e.clientY-r.top-r.height/2)/32;const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}this.stick={x:Math.abs(dx)>.25?dx:0,y:Math.abs(dy)>.25?dy:0};knob.style.transform='translate('+dx*24+'px,'+dy*24+'px)';this.path=[];this.target=null;};
  stick.onpointerdown=e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);};
  stick.onpointermove=move;stick.onpointerup=stick.onpointercancel=()=>{pointer=null;this.stick={x:0,y:0};knob.style.transform='';};
 }
 async start(){
  this.assets=await loadAssets();
  // Keep residents, pickups and doorways readable. Later placed scenery uses
  // the runtime transparency rule rather than being silently removed.
  const important=[...this.npcs,...this.herbs,...this.map.buildings.map(b=>({px:(b.doorX+.5)*TILE,py:(b.doorY+.8)*TILE}))];
  if(!this.worldMaps[this.location])removeScenery(this.map,o=>{const sprite=this.assets.environment[o.sprite];return sprite&&important.some(actor=>coversActor(sceneryPlacement(o,sprite),actor,this.assets.environmentMasks?.[o.sprite]));});
  this.renderer=new Renderer(this);this.ui.portrait(this.assets);this.ready=true;
  document.getElementById('loading').hidden=true;this.prev=performance.now();
  const frame=now=>{const dt=Math.min(60,now-this.prev);this.prev=now;if(!document.hidden&&!this.ui.open){this.time+=dt;if(!this.editor?.active)this.update(dt);}this.renderer.draw(this.time);this.ui.update();requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
 }
 click(e){
  if(!this.ready||this.ui.open)return;
  // Canvas primary button and touch only: secondary clicks must not retarget.
  if(e.button!==undefined&&e.button!==0)return;
  this.canvas.focus({preventScroll:true});
  const r=this.canvas.getBoundingClientRect(),wx=(e.clientX-r.left)/r.width*this.canvas.width+this.camera.x,wy=(e.clientY-r.top)/r.height*this.canvas.height+this.camera.y;
  const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);
  if(this.editor?.active||x<0||y<0||x>=this.map.width||y>=this.map.height)return;
  const actor=[...this.npcs,...this.mobs.filter(m=>m.alive)].find(t=>
   Math.abs(wx-t.px)<22&&wy>=t.py-49&&wy<=t.py+9);
  if(actor?.kind==='mob'){
   // One click locks the opponent and starts a persistent fight. The hero
   // finds an attack position according to the currently equipped mode.
   this.combatTarget=actor;
   this.path=[];this.target=null;this.combatRepathAt=0;
   this.aimAtCombatTarget();
   this.ui.updateCombatFocus();
   this.updateCombatFocus();
   return;
  }
  // Any other left-click (terrain, NPC, doorway) cancels combat and pursuit.
  this.combatTarget=null;this.combatRepathAt=0;this.path=[];
  this.ui.updateCombatFocus();
  if(actor){
   if(this.target===actor)return; // Repeated NPC clicks preserve the approach.
   this.stopMovement();this.target=actor;this.approach(actor.x,actor.y);return;
  }
  const building=this.map.buildings.find(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);
  if(building){
   if(this.target?.kind==='building'&&this.target.id===building.id)return;
   this.stopMovement();
   this.target=anchored({...building,kind:'building',x:building.doorX,y:building.doorY});
   this.approach(building.doorX,building.doorY);return;
  }
  if(this.blocked(x,y)){this.toast('Здесь не пройти. Выбери дорожку.');return;}
  const herb=this.herbs.find(h=>!h.collected&&h.x===x&&h.y===y)||null;
  const lastQueued=this.path.at(-1)||this.player.step;
  if(!herb&&!this.target&&lastQueued?.x===x&&lastQueued?.y===y)return;
  const origin=this.movementOrigin(),route=this.findPath(x,y);
  if(!route.length&&(x!==origin.x||y!==origin.y)){
   this.toast('Здесь не пройти. Выбери дорожку.');return;
  }
  // Change only the queued route. Never cancel or rewind the in-flight step.
  this.stopMovement();
  this.path=route;
  this.target=herb;
 }
 setPrimaryAttack(mode){
  if(mode!=='staff'&&mode!=='bolt')return false;
  if(mode==='bolt'&&!autoRangedSkill(this.player)){
   this.toast('Для Изумрудного луча нужен посох друида.');return false;
  }
  if(this.primaryAttackMode===mode)return true;
  this.primaryAttackMode=mode;
  // Recalculate the pursuit range immediately when switching weapons.
  if(this.combatTarget){this.path=[];this.combatRepathAt=0;}
  try{localStorage.setItem('tiholesye-primary-attack',mode);}catch{}
  this.ui.updatePrimaryAttack();
  this.toast(mode==='bolt'?'Основная атака: Изумрудный луч':'Основная атака: удар посохом');
  return true;
 }
 primaryAttack(){
  if(this.primaryAttackMode==='bolt'){
   // The focused target is optional: without it Q/Space use the current facing.
   return this.castSkill('bolt');
  }
  return this.attack(this.combatTarget?.alive?this.combatTarget:undefined);
 }
 aimAtCombatTarget(){
  const t=this.combatTarget,p=this.player;
  if(!t?.alive)return;
  p.aimDirection=directionTo(t.px-p.px,t.py-p.py);
  // Do not flip the running sprite toward an enemy on every shot.
  if(!p.moving&&!p.step&&!this.keys.size&&!this.stick.x&&!this.stick.y)
   p.direction=p.aimDirection;
 }
 updateCombatFocus(){
  const enemy=this.combatTarget;
  if(!enemy)return;
  if(!enemy.alive||!this.mobs.includes(enemy)){
   this.combatTarget=null;this.path=[];this.combatRepathAt=0;
   this.ui?.updateCombatFocus();return;
  }
  this.aimAtCombatTarget();
  if(!this.ready||this.ui.open||this.editor?.active)return;
  const melee=this.primaryAttackMode==='staff';
  const inRange=melee
   ?distance(this.player,enemy)<49
   :canFocusShoot(this.map,this.player,enemy,'bolt');
  if(!inRange){
   this.followCombatTarget(enemy);
   return;
  }
  // The selected enemy is now reachable. End the queued pursuit but allow
  // the current interpolated step to finish naturally.
  this.path=[];this.combatRepathAt=0;
  if(this.time-this.lastAttack<600)return;
  if(melee){this.attack(enemy,{automatic:true});return;}
  const skillId=autoRangedSkill(this.player);
  if(!skillId||skillRemaining(this.skillCooldowns,skillId,this.time))return;
  if(this.player.mana<DRUID_SKILLS[skillId].mana)return;
  this.castSkill(skillId,{target:enemy,automatic:true});
 }
 followCombatTarget(enemy){
  // Manual WASD/joystick movement temporarily overrides automatic pursuit,
  // without losing the selected enemy or interrupting attacks within range.
  if(this.keys.size||this.stick.x||this.stick.y){
   this.path=[];this.combatRepathAt=0;return;
  }
  if(this.time<this.combatRepathAt)return;
  const route=findFocusApproach(
   this.map,this.movementOrigin(),enemy,this.primaryAttackMode,
   (x,y)=>this.occupied(x,y),this.player
  );
  this.path=route;
  // Recheck as monsters move or another actor blocks a queued tile.
  // Unreachable enemies remain selected but do not cause frame-by-frame BFS.
  this.combatRepathAt=this.time+(route.length?450:950);
 }
 stopMovement(){
  // Cancel future commands, not the step already being interpolated.
  // Logical tile and animation phase must stay untouched until advance() lands.
  this.path=[];this.target=null;this.keys.clear();this.stick={x:0,y:0};
 }
 approach(x,y){
  const from=this.movementOrigin();
  if(Math.abs(from.x-x)+Math.abs(from.y-y)<=1){
   this.path=[];
   // If walking into range, perform contact only after the current step ends.
   if(!this.player.step)this.interactTarget();
   return;
  }
  const options=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
   .filter(([a,b])=>!this.blocked(a,b))
   .map(([a,b])=>this.findPath(a,b)).filter(path=>path.length);
  options.sort((a,b)=>a.length-b.length);this.path=options[0]||[];
  if(!this.path.length){this.target=null;this.toast('Не удаётся подойти.');}
 }
 beginStep(entity,x,y,duration=300){
  if(this.blocked(x,y,entity))return false;
  const dx=(x+.5)*TILE-entity.px,dy=(y+.8)*TILE-entity.py;
  if(dx||dy)entity.direction=directionTo(dx,dy);
  entity.step={x,y,fromX:entity.px,fromY:entity.py,elapsed:0,duration:Math.max(1,duration*Math.hypot(dx,dy)/TILE)};entity.moving=true;return true;
 }
 advance(entity,dt){
  if(!entity.step){entity.moving=false;return;}
  const s=entity.step;s.elapsed+=dt;const a=Math.min(1,s.elapsed/s.duration);
  entity.px=s.fromX+((s.x+.5)*TILE-s.fromX)*a;entity.py=s.fromY+((s.y+.8)*TILE-s.fromY)*a;
  if(a===1){entity.x=s.x;entity.y=s.y;entity.step=null;entity.moving=false;}
 }
 update(dt){
  const p=this.player;this.advance(p,dt);
  if(!p.step&&this.checkPortals())return;
  if(!p.step){
   let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),dy=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);
   if(this.stick.x||this.stick.y){if(Math.abs(this.stick.x)>Math.abs(this.stick.y))dx=Math.sign(this.stick.x);else dy=Math.sign(this.stick.y);}
   if(dx||dy){if(dx&&dy){if(Math.floor(this.time/210)%2)dx=0;else dy=0;}p.direction=directionTo(dx,dy);this.beginStep(p,p.x+dx,p.y+dy);}
   else if(this.path.length){const step=this.path.shift();if(!this.beginStep(p,step.x,step.y))this.path=[];}
   else if(this.target)this.interactTarget();
  }
  p.mana=Math.min(p.maxMana,p.mana+dt*.004);
  for(const m of this.mobs){
   if(!m.alive){if(!m.boss&&this.time>=m.respawnAt){m.alive=true;m.hp=m.max;m.x=m.homeX;m.y=m.homeY;m.px=(m.x+.5)*TILE;m.py=(m.y+.8)*TILE;m.step=null;}continue;}
   if(this.time>=(m.rootedUntil||0))this.advance(m,dt);
   const d=distance(m,p),aggro=d<(m.boss?190:120),adjacent=d<43;
   if(adjacent&&this.time-m.lastAttack>1400){
    m.lastAttack=this.time;m.attackStarted=this.time;m.attackUntil=this.time+360;m.direction=directionTo(p.px-m.px,p.py-m.py);m.attackDirection=m.direction;
    p.hp=Math.max(0,p.hp-(m.boss?14:6));p.hitUntil=this.time+250;this.effect('-'+(m.boss?14:6),p,'#e59973');this.bip(110,.07);
    if(p.hp<=0){this.respawn();break;}this.save();
   }
   if(this.time>=(m.rootedUntil||0)&&!m.step&&this.time>m.nextThink&&!adjacent){
    m.nextThink=this.time+(aggro?350:1600)+((m.homeX*71+m.homeY*29)%700);
    let tx,ty;
    if(aggro){
     const candidates=[[p.x+1,p.y],[p.x-1,p.y],[p.x,p.y+1],[p.x,p.y-1]].filter(([x,y])=>!this.blocked(x,y,m));
     let best=[];for(const [x,y]of candidates){const path=findPath(this.map,m.x,m.y,x,y,(a,b)=>this.occupied(a,b,m));if(path.length&&(!best.length||path.length<best.length))best=path;}
     if(best.length){tx=best[0].x;ty=best[0].y;}
    }else{
     const choices=[[1,0],[-1,0],[0,1],[0,-1]],v=Math.floor((Math.sin(this.time/1300+m.homeX)*.5+.5)*3.99),[dx,dy]=choices[v];
     tx=m.x+dx;ty=m.y+dy;if(Math.abs(tx-m.homeX)+Math.abs(ty-m.homeY)>3){tx=m.homeX;ty=m.homeY;const path=findPath(this.map,m.x,m.y,tx,ty,(a,b)=>this.occupied(a,b,m));if(path.length){tx=path[0].x;ty=path[0].y;}else tx=undefined;}
    }
    if(tx!==undefined)this.beginStep(m,tx,ty,aggro?310:460);
   }
  }
  this.updateCombatFocus();
  for(const entity of [p,...this.npcs,...this.mobs])updateAnimation(entity,dt,this.time);
  this.effects=this.effects.filter(e=>this.time-e.time<(e.duration||(e.type==='text'?950:500)));
  if(this.time-this.lastSave>5000){this.save();this.lastSave=this.time;}
 }
 nearestInteractable(){
  const doors=this.map.buildings.filter(b=>Math.abs(this.player.x-b.doorX)+Math.abs(this.player.y-b.doorY)<=2)
   .map(b=>anchored({...b,kind:'building',x:b.doorX,y:b.doorY}));
  return [...this.npcs,...this.herbs.filter(h=>!h.collected),...doors]
   .filter(e=>distance(e,this.player)<70).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
 }
 interactNearest(){const t=this.nearestInteractable();if(t){this.target=t;this.interactTarget();return;}const b=this.map.buildings.find(b=>Math.abs(this.player.x-b.doorX)+Math.abs(this.player.y-b.doorY)<=2);if(b){this.target=anchored({...b,kind:'building',x:b.doorX,y:b.doorY});this.interactTarget();}else if(this.location==='tavern'&&this.player.y>=14)this.enterLocation('village',15,16);else this.toast('Рядом нет доступного объекта.');}
 interactTarget(){
  const t=this.target;if(!t)return;
  if(t.kind==='building'){if(Math.abs(this.player.x-t.x)+Math.abs(this.player.y-t.y)>1){if(!this.path.length&&!this.player.step)this.approach(t.x,t.y);return;}this.target=null;this.ui.building(t);return;}
  if(distance(t,this.player)>49){if(!this.path.length&&!this.player.step)this.approach(t.x,t.y);return;}
  this.player.direction=directionTo(t.px-this.player.px,t.py-this.player.py);
  if(t.kind==='mob'){this.target=null;if(t.alive)this.attack(t);return;}
  this.target=null;
  if(t.kind==='npc'){t.direction=directionTo(this.player.px-t.px,this.player.py-t.py);this.ui.dialogue(t);return;}
  if(t.kind==='herb'){t.collected=true;this.player.herbs++;this.effect('+1 трава',t,'#c7dda0');this.save();this.toast('Собрана лесная трава.');}
 }
 damageMob(m,damage){
  if(!m?.alive||damage<=0)return false;
  m.hp-=damage;m.hitUntil=this.time+260;this.effect('-'+damage,m);
  this.effects.push({type:'spark',x:m.px,y:m.py,time:this.time,color:'#d7e4a1'});
  if(m.hp>0)return true;
  if(this.combatTarget===m){
   this.combatTarget=null;this.path=[];this.combatRepathAt=0;
   this.ui.updateCombatFocus();
  }
  m.alive=false;m.step=null;m.rootedUntil=0;m.respawnAt=this.time+20000;
  this.player.xp+=m.boss?70:20;this.player.coins+=m.boss?35:5;this.player.wood++;
  if(m.boss)this.player.boss=true;else this.player.kills++;
  while(this.player.xp>=this.player.level*50){
   this.player.xp-=this.player.level*50;this.player.level++;this.player.maxHp+=20;
   this.player.hp=this.player.maxHp;this.toast('Новый уровень! Здоровье восстановлено.');
  }
  if(this.player.level===1)this.toast(m.boss?'Лесной страж повержен!':'Победа! +20 опыта · +5 монет');
  this.target=null;this.save();
  return true;
 }
 castSkill(id,{target=null,automatic=false}={}){
  const skill=DRUID_SKILLS[id],p=this.player;
  if(!skill||this.ui.open||this.editor?.active||!this.ready)return false;
  if(automatic&&(!target||this.combatTarget!==target||
     autoRangedSkill(p)!==id||!canFocusShoot(this.map,p,target,id)))return false;
  const remaining=skillRemaining(this.skillCooldowns,id,this.time);
  if(remaining){if(!automatic)this.toast(skill.name+': ещё '+Math.ceil(remaining/1000)+' с');return false;}
  if(p.mana<skill.mana){if(!automatic)this.toast('Недостаточно маны: нужно '+skill.mana);return false;}
  if(id==='heal'&&p.hp>=p.maxHp){if(!automatic)this.toast('Здоровье уже полное.');return false;}
  p.mana-=skill.mana;this.skillCooldowns[id]=this.time+skill.cooldown;
  // Automatic shots have visible projectiles, but must not interrupt the
  // walking animation or flip its facing direction.
  if(!automatic){
   p.attackStarted=this.time;p.attackUntil=this.time+360;p.attackDirection=p.direction;
  }
  this.lastAttack=this.time;
  if(id==='bolt'){
   const focused=target||(canFocusShoot(this.map,p,this.combatTarget,'bolt')?this.combatTarget:null);
   const result=focused?{x:focused.px,y:focused.py,target:focused}
                       :boltTrace(this.map,p,p.direction,this.mobs);
   this.effects.push({type:'bolt',x:p.px,y:p.py-22,tx:result.x,ty:result.y-16,
    time:this.time,duration:460,color:skill.color});
   if(result.target)this.damageMob(result.target,skill.damage+p.level*3);
   this.bip(550,.13);
  }else if(id==='roots'){
   const victims=rootsTargets(p,this.mobs);
   for(const mob of victims){
    mob.rootedUntil=this.time+skill.rootMs;
    this.damageMob(mob,skill.damage+p.level*2);
   }
   this.effects.push({type:'roots',x:p.px,y:p.py,time:this.time,
    duration:700,radius:skill.radius,color:skill.color});
   this.bip(190,.16);
  }else if(id==='heal'){
   const gain=Math.min(p.maxHp-p.hp,skill.heal+p.level*5);
   p.hp+=gain;this.effect('+'+gain+' здоровье',p,skill.color);
   this.effects.push({type:'heal',x:p.px,y:p.py-21,time:this.time,duration:850,color:skill.color});
   this.bip(770,.18);
  }
  this.save();return true;
 }
 attack(target,{automatic=false}={}){
  if(this.ui.open||this.editor?.active||this.time-this.lastAttack<600)return false;
  const m=target?.alive?target:this.mobs.filter(m=>m.alive&&distance(m,this.player)<49)
   .sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
  if(automatic&&(!m?.alive||distance(m,this.player)>=49))return false;
  this.lastAttack=this.time;
  // Staff is a physical melee attack and does not drain mana. Show a swing
  // when the druid stands still; preserve the stride when running with WASD.
  const inMotion=this.player.moving||this.player.step||this.keys.size||
   this.stick.x||this.stick.y;
  const showSwing=!automatic||!inMotion;
  if(showSwing){
   this.player.attackStarted=this.time;this.player.attackUntil=this.time+360;
   this.player.attackDirection=this.player.direction;
  }
  this.bip(360,.05);
  if(!m?.alive||distance(m,this.player)>=49)return false;
  if(showSwing){
   this.player.direction=directionTo(m.px-this.player.px,m.py-this.player.py);
   this.player.attackDirection=this.player.direction;
  }
  this.damageMob(m,10+this.player.level*3);
  return true;
 }
 effect(text,e,color){this.effects.push({type:'text',text,x:e.px,y:e.py,time:this.time,color});}
 potion(){
  if(this.player.potions<=0)return this.toast('Зелья закончились. Мира продаёт их на рынке.');
  if(this.player.hp===this.player.maxHp)return this.toast('Здоровье уже полное.');
  this.player.potions--;this.player.hp=Math.min(this.player.maxHp,this.player.hp+45);this.effect('+45',this.player,'#b9dc93');this.save();this.toast('Зелье восстановило здоровье.');
 }
 respawn(){this.player.hp=this.player.maxHp;this.player.attackUntil=0;this.enterLocation('village',SPAWN.x,SPAWN.y);this.toast('Жители помогли тебе вернуться в деревню.');}
 save(){const data=initial();for(const key of Object.keys(data))data[key]=this.player[key];data.version=3;data.location=this.location;try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch{}}
 toast(text){this.ui.toast(text);}
 bip(hz,seconds){
  if(!this.sound)return;try{this.audio??=new(window.AudioContext||window.webkitAudioContext)();if(this.audio.state==='suspended')this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+seconds);osc.connect(gain).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+seconds);}catch{}
 }
 // Legacy entry points remain usable from the console, but the full editor
 // now owns modifications, collision rebuilding and persistent scene data.
 place(sprite,x,y){
  if(!this.editor)return false;
  const type=['mossling','goblin','guardian'].includes(sprite)?'mob':
   ['inn','cottage','forge','cabin','market'].includes(sprite)?'building':'object';
  this.editor.kind=type;this.editor.brush=sprite;this.editor.tool='place';
  this.editor.stroke={before:sceneSnapshot(this),changed:false};
  const ok=this.editor.applyAt(x,y);
  this.editor.finishStroke();return ok;
 }
 exportMap(){return this.editor?.export();}

}
