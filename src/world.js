import { loadAssets } from './assets.js';
import { updateAnimation } from './animation.js';
import { TILE, WIDTH, HEIGHT, SPAWN, createMap, isBlocked, findPath, removeScenery } from './map.js';
import { sceneryPlacement, coversActor } from './visibility.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';

const STORAGE='tiholesye-v01';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const initial=()=>({x:SPAWN.x,y:SPAWN.y,hp:120,maxHp:120,mana:60,maxMana:60,level:1,xp:0,kills:0,coins:0,potions:2,wood:0,herbs:0,boss:false,questAccepted:false,questReward:false});
const anchored=(e)=>({...e,px:(e.x+.5)*TILE,py:(e.y+.8)*TILE,direction:'down',moving:false,step:null,attackUntil:0,attackStarted:0,hitUntil:0});
const distance=(a,b)=>Math.hypot(a.px-b.px,a.py-b.py);
const directionTo=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
export class Game{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.map=createMap();
  const p=initial();let data={};try{data=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{}
  for(const key of Object.keys(p)){
   if(typeof p[key]==='number'&&Number.isFinite(data[key]))p[key]=Math.max(0,data[key]);
   else if(typeof p[key]==='boolean'&&typeof data[key]==='boolean')p[key]=data[key];
  }
  p.level=clamp(Math.floor(p.level),1,99);p.maxHp=clamp(p.maxHp,100,2080);p.hp=clamp(p.hp||p.maxHp,1,p.maxHp);p.maxMana=60;p.mana=clamp(p.mana,0,60);
  // Migrate progress from the 20x20 prototype; only the new map's positions change.
  if(data.version!==2){p.x=SPAWN.x;p.y=SPAWN.y;}
  p.x=Math.floor(p.x);p.y=Math.floor(p.y);if(isBlocked(this.map,p.x,p.y)){p.x=SPAWN.x;p.y=SPAWN.y;}
  // Prefer the Blender-rendered hero for new players; keep an explicit 2D choice.
  this.modelMode=localStorage.getItem('tiholesye-model')==='2d'?'2d':'3d';
  // NPC graphics can be changed independently from the player and gameplay.
  this.npcStyle=localStorage.getItem('tiholesye-npc-style')==='pixel'?'pixel':'vector';
  this.player=anchored({...p,sprite:this.modelMode==='3d'?'hero3d':'hero'});this.path=[];this.target=null;this.keys=new Set();this.stick={x:0,y:0};
  this.time=0;this.effects=[];this.camera={x:0,y:0};this.zoom=innerWidth>=1100?2:innerWidth>=700?1.5:1;this.night=false;this.sound=false;this.lastAttack=-1000;this.lastSave=0;
  this.npcs=[
   anchored({id:'elder',kind:'npc',name:'Староста Ольгерд',sprite:'elder',x:11,y:15}),
   anchored({id:'smith',kind:'npc',name:'Кузнец Бран',sprite:'smith',x:21,y:16}),
   anchored({id:'merchant',kind:'npc',name:'Торговка Мира',sprite:'merchant',x:28,y:15}),
   anchored({id:'villager',kind:'npc',name:'Травница Лина',sprite:'villager',x:12,y:22}),
   anchored({id:'fisher',kind:'npc',name:'Рыбак Финн',sprite:'fisher',x:27,y:20})
  ];
  this.mobs=[this.makeMob(30,18),this.makeMob(33,21),this.makeMob(31,9,'goblin'),this.makeMob(19,25),this.makeMob(33,5,'guardian')];
  for(const m of this.mobs){this.clearSpawn(m.x,m.y);if(m.boss&&p.boss)m.alive=false;}
  for(const n of this.npcs)this.clearSpawn(n.x,n.y);
  this.herbs=[[16,16],[18,19],[29,18],[30,8],[12,23],[19,26]].map(([x,y])=>anchored({x,y,kind:'herb',collected:false}));
  if(this.occupied(p.x,p.y)){Object.assign(this.player,{x:SPAWN.x,y:SPAWN.y,px:(SPAWN.x+.5)*TILE,py:(SPAWN.y+.8)*TILE});}
  this.ui=new UI(this);this.bindInput();this.resize();
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
 findPath(tx,ty){return findPath(this.map,this.player.x,this.player.y,tx,ty,(x,y)=>this.occupied(x,y));}
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
  this.canvas.addEventListener('pointerdown',e=>this.click(e));
  window.addEventListener('resize',()=>this.resize());
  window.addEventListener('blur',()=>{this.keys.clear();this.stick={x:0,y:0};this.save();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.save();}});
  window.addEventListener('keydown',e=>{
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
   if(e.code==='Escape'){if(this.ui.open)this.ui.close();else this.ui.settings();return;}
   if(this.ui.open){if(e.code==='Tab')this.ui.trapFocus(e);return;}
   if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){this.keys.add(e.code);this.target=null;this.path=[];}
   if(e.repeat)return;
   if(e.code==='Space')this.attack();
   if(e.code==='KeyE')this.interactNearest();
   if(e.code==='KeyB')this.ui.inventory();
   if(e.code==='KeyM')this.ui.map();
   if(e.code==='KeyJ')this.ui.journal();
   if(e.code==='F2'){e.preventDefault();this.ui.builder();}
   if(e.code.startsWith('Digit'))this.ui.slot(Number(e.code.slice(5))-1);
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  document.getElementById('mobileAttack').onclick=()=>this.attack();
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
  removeScenery(this.map,o=>{const sprite=this.assets.environment[o.sprite];return sprite&&important.some(actor=>coversActor(sceneryPlacement(o,sprite),actor,this.assets.environmentMasks?.[o.sprite]));});
  this.renderer=new Renderer(this);this.ui.portrait(this.assets);this.ready=true;
  document.getElementById('loading').hidden=true;this.prev=performance.now();
  const frame=now=>{const dt=Math.min(60,now-this.prev);this.prev=now;if(!document.hidden&&!this.ui.open){this.time+=dt;this.update(dt);}this.renderer.draw(this.time);this.ui.update();requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
 }
 click(e){
  if(!this.ready||this.ui.open)return;
  this.canvas.focus({preventScroll:true});
  const r=this.canvas.getBoundingClientRect(),wx=(e.clientX-r.left)/r.width*this.canvas.width+this.camera.x,wy=(e.clientY-r.top)/r.height*this.canvas.height+this.camera.y;
  const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);
  if(this.buildMode){if(x>=0&&y>=0&&x<WIDTH&&y<HEIGHT)this.place(this.buildMode,x,y);return;}
  this.stopMovement();
  if(x<0||y<0||x>=WIDTH||y>=HEIGHT)return;
  if(this.blocked(x,y)){
   // Adjacent actors can still be used without walking to a substitute cell.
   const actor=[...this.npcs,...this.mobs.filter(m=>m.alive)].find(t=>t.x===x&&t.y===y&&distance(t,this.player)<=49);
   if(actor){this.target=actor;this.interactTarget();}else this.toast('Здесь не пройти. Выбери дорожку.');
   return;
  }
  const route=this.findPath(x,y);
  if(!route.length&&(x!==this.player.x||y!==this.player.y)){this.toast('Здесь не пройти. Выбери дорожку.');return;}
  const p=this.player;
  if(Math.hypot(p.px-(p.x+.5)*TILE,p.py-(p.y+.8)*TILE)>.01)route.unshift({x:p.x,y:p.y});
  this.path=route;
  this.target=this.herbs.find(herb=>!herb.collected&&herb.x===x&&herb.y===y)||null;
 }
 stopMovement(){
  const p=this.player;
  this.path=[];this.target=null;this.keys.clear();this.stick={x:0,y:0};
  // Stop at the exact current position, without completing an old tile step.
  p.x=Math.round(p.px/TILE-.5);p.y=Math.round(p.py/TILE-.8);p.step=null;p.moving=false;
  p.animationState='idle';p.animationTime=0;
 }
 approach(x,y){
  if(Math.abs(this.player.x-x)+Math.abs(this.player.y-y)<=1){this.path=[];if(this.target&&distance(this.target,this.player)<49)this.interactTarget();return;}
  const options=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>!this.blocked(a,b)).map(([a,b])=>this.findPath(a,b)).filter(p=>p.length);
  options.sort((a,b)=>a.length-b.length);this.path=options[0]||[];
  if(!this.path.length)this.toast('Не удаётся подойти.');
 }
 beginStep(entity,x,y,duration=210){
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
   this.advance(m,dt);
   const d=distance(m,p),aggro=d<(m.boss?190:120),adjacent=d<43;
   if(adjacent&&this.time-m.lastAttack>1400){
    m.lastAttack=this.time;m.attackStarted=this.time;m.attackUntil=this.time+360;m.direction=directionTo(p.px-m.px,p.py-m.py);m.attackDirection=m.direction;
    p.hp=Math.max(0,p.hp-(m.boss?14:6));p.hitUntil=this.time+250;this.effect('-'+(m.boss?14:6),p,'#e59973');this.bip(110,.07);
    if(p.hp<=0){this.respawn();break;}this.save();
   }
   if(!m.step&&this.time>m.nextThink&&!adjacent){
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
  for(const entity of [p,...this.npcs,...this.mobs])updateAnimation(entity,dt,this.time);
  this.effects=this.effects.filter(e=>this.time-e.time<(e.type==='text'?950:500));
  if(this.time-this.lastSave>5000){this.save();this.lastSave=this.time;}
 }
 nearestInteractable(){
  return [...this.npcs,...this.herbs.filter(h=>!h.collected)].filter(e=>distance(e,this.player)<55).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
 }
 interactNearest(){const t=this.nearestInteractable();if(t){this.target=t;this.interactTarget();return;}const b=this.map.buildings.find(b=>Math.abs(this.player.x-b.doorX)<=1&&this.player.y===b.doorY+1);if(b)this.ui.building(b);else this.toast('Подойди к жителю, дому или лесной траве.');}
 interactTarget(){
  const t=this.target;if(!t)return;
  if(t.kind==='building'){if(this.player.x===t.x&&this.player.y===t.y){this.target=null;this.ui.building(t);}return;}
  if(distance(t,this.player)>49){if(!this.path.length&&!this.player.step)this.approach(t.x,t.y);return;}
  this.player.direction=directionTo(t.px-this.player.px,t.py-this.player.py);
  if(t.kind==='mob'){if(t.alive)this.attack(t);else this.target=null;return;}
  this.target=null;
  if(t.kind==='npc'){t.direction=directionTo(this.player.px-t.px,this.player.py-t.py);this.ui.dialogue(t);return;}
  if(t.kind==='herb'){t.collected=true;this.player.herbs++;this.effect('+1 трава',t,'#c7dda0');this.save();this.toast('Собрана лесная трава.');}
 }
 attack(target){
  if(this.ui.open||this.time-this.lastAttack<600)return;
  if(this.player.mana<2)return this.toast('Посоху нужно немного маны.');
  this.lastAttack=this.time;this.player.mana-=2;this.player.attackStarted=this.time;this.player.attackUntil=this.time+360;
  this.player.attackDirection=this.player.direction;
  const m=target||this.mobs.filter(m=>m.alive&&distance(m,this.player)<49).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
  this.bip(360,.05);
  if(!m||!m.alive||distance(m,this.player)>49)return;
  this.player.direction=directionTo(m.px-this.player.px,m.py-this.player.py);this.player.attackDirection=this.player.direction;
  const damage=10+this.player.level*3;m.hp-=damage;m.hitUntil=this.time+260;this.effect('-'+damage,m);this.effects.push({type:'spark',x:m.px,y:m.py,time:this.time,color:'#d7e4a1'});
  if(m.hp<=0){
   m.alive=false;m.step=null;m.respawnAt=this.time+20000;
   this.player.xp+=m.boss?70:20;this.player.coins+=m.boss?35:5;this.player.wood++;
   if(m.boss)this.player.boss=true;else this.player.kills++;
   while(this.player.xp>=this.player.level*50){this.player.xp-=this.player.level*50;this.player.level++;this.player.maxHp+=20;this.player.hp=this.player.maxHp;this.toast('Новый уровень! Здоровье восстановлено.');}
   if(this.player.level===1)this.toast(m.boss?'Лесной страж повержен!':'Победа! +20 опыта · +5 монет');
   this.target=null;this.save();
  }
 }
 effect(text,e,color){this.effects.push({type:'text',text,x:e.px,y:e.py,time:this.time,color});}
 potion(){
  if(this.player.potions<=0)return this.toast('Зелья закончились. Мира продаёт их на рынке.');
  if(this.player.hp===this.player.maxHp)return this.toast('Здоровье уже полное.');
  this.player.potions--;this.player.hp=Math.min(this.player.maxHp,this.player.hp+45);this.effect('+45',this.player,'#b9dc93');this.save();this.toast('Зелье восстановило здоровье.');
 }
 respawn(){Object.assign(this.player,{hp:this.player.maxHp,x:SPAWN.x,y:SPAWN.y,px:(SPAWN.x+.5)*TILE,py:(SPAWN.y+.8)*TILE,step:null,moving:false,attackUntil:0,attackStarted:0,animationTime:0,animationState:'idle'});this.target=null;this.path=[];this.toast('Жители помогли тебе вернуться в деревню.');this.save();}
 save(){const data=initial();for(const key of Object.keys(data))data[key]=this.player[key];data.version=2;try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch{}}
 toast(text){this.ui.toast(text);}
 bip(hz,seconds){
  if(!this.sound)return;try{this.audio??=new(window.AudioContext||window.webkitAudioContext)();if(this.audio.state==='suspended')this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+seconds);osc.connect(gain).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+seconds);}catch{}
 }
 // Prototype construction tools: grid-aligned placement, explicit collision checks, JSON export.
 place(sprite,x,y){
  if(this.blocked(x,y))return this.toast('Клетка занята.');
  if(['mossling','goblin','guardian'].includes(sprite)){this.mobs.push(this.makeMob(x,y,sprite));}
  else if(sprite==='cabin'){
   const w=4,h=4;
   for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(this.blocked(xx,yy))return this.toast('Для дома нужно свободное место 4×4.');
   const b={id:'custom-'+this.time,name:'Новый дом',sprite:'cabin',x,y,w,h,doorX:x+2,doorY:y+h-1};this.map.buildings.push(b);
   for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)this.map.blocked[yy][xx]=true;
  }else{
   this.map.objects.push({sprite,x,y,px:(x+.5)*TILE,py:(y+1)*TILE,block:true,tree:['oak','pine'].includes(sprite)});this.map.blocked[y][x]=true;
  }
  this.renderer.bakeMinimap();this.toast('Объект установлен · F2 — инструменты.');
 }
 exportMap(){
  const data={tileSize:TILE,width:WIDTH,height:HEIGHT,terrain:this.map.terrain,buildings:this.map.buildings,objects:this.map.objects,enemies:this.mobs.map(m=>({sprite:m.sprite,x:m.homeX,y:m.homeY}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='tiholesye-map.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
