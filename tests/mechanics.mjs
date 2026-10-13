import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMap, findPath, isBlocked, SPAWN, TILE } from '../src/map.js';
import { heroFrames } from '../src/hero-frames.js';
const store=new Map(),nodes=new Map(),canvases=[];let serial=0;
class Context{
 constructor(canvas){this.canvas=canvas;this.ops=[];this.state={fillStyle:'#000000',strokeStyle:'#000000',globalAlpha:1,font:'10px sans-serif',textAlign:'left',lineWidth:1,tx:0,ty:0};this.stack=[];}
 save(){this.stack.push({...this.state});}
 restore(){this.state=this.stack.pop()||this.state;}
 translate(x,y){this.state.tx+=x;this.state.ty+=y;}
 record(op,args){this.ops.push({op,args,state:{...this.state}});}
 fillRect(...a){this.record('fillRect',a);}
 strokeRect(...a){this.record('strokeRect',a);}
 clearRect(...a){this.record('clearRect',a);}
 drawImage(im,...a){this.record('drawImage',[im.id||im.src,...a]);}
 fillText(...a){this.record('fillText',a);}
 beginPath(){this.path=[];}
 moveTo(x,y){this.path??=[];this.path.push([x,y]);}
 lineTo(x,y){this.path.push([x,y]);}
 stroke(){this.record('stroke',[this.path]);}
}
for(const key of ['fillStyle','strokeStyle','globalAlpha','font','textAlign','lineWidth'])Object.defineProperty(Context.prototype,key,{get(){return this.state[key];},set(v){this.state[key]=v;}});
class Element{
 constructor(id=''){this.id=id;this.hidden=true;this.style={};this.dataset={};this.textContent='';this.classList={add(){},remove(){},toggle(){}};this.children=new Map();this.width=0;this.height=0;}
 addEventListener(){}focus(){document.activeElement=this;}click(){this.onclick?.();}
 getBoundingClientRect(){return {left:0,top:0,width:1280,height:720};}
 querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element(selector));return this.children.get(selector);}
 querySelectorAll(selector){return [...this.children.values()];}
 set innerHTML(s){this.html=s;this.children.clear();for(const id of s.matchAll(/id="([^"]+)"/g))this.children.set('#'+id[1],new Element(id[1]));}
 get innerHTML(){return this.html;}
}
class Canvas extends Element{
 constructor(id){super(id||'canvas-'+serial++);this.ctx=new Context(this);canvases.push(this);}
 getContext(){return this.ctx;}
}
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.window={addEventListener(){}};
globalThis.document={hidden:false,activeElement:null,addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,['game','portrait','minimap'].includes(id)?new Canvas(id):new Element(id));return nodes.get(id);},querySelectorAll(){return [];},createElement(tag){return tag==='canvas'?new Canvas():new Element();}};
globalThis.Image=class{
 set src(value){this._src=value;const meta=value.includes('village-source')?[1254,1254]:value.includes('guardian')?[512,64]:value.includes('mossling')?[384,48]:value.includes('icons')?[192,24]:[480,192];[this.width,this.height]=meta;queueMicrotask(()=>this.onload());}
 get src(){return this._src;}
};
globalThis.requestAnimationFrame=()=>{};
const { Game }=await import('../src/world.js');
const map=createMap();
for(const [label,x,y]of [['bridge',25,16],['market',27,15],['guardian',33,5],['inn',12,15]]){
 const path=findPath(map,SPAWN.x,SPAWN.y,x,y);assert(path.length>0,label+' must be reachable');
 let prev=SPAWN;for(const step of path){assert.equal(Math.abs(step.x-prev.x)+Math.abs(step.y-prev.y),1);assert(!isBlocked(map,step.x,step.y));prev=step;}
}
assert(isBlocked(map,22,15),'river is impassable');assert(!isBlocked(map,23,16),'bridge is passable');
for(const b of map.buildings)assert(isBlocked(map,b.x,b.y),'building must collide');
const game=new Game(document.getElementById('game'));await game.start();
for(const row of heroFrames)for(const frame of row){const [, ,w,h]=frame.source,dx=40-Math.round(frame.anchor[0]*.175),dy=64-Math.round(h*.175);assert(dx>=0&&dy>=0&&dx+Math.round(w*.175)<=80&&dy+Math.round(h*.175)<=80,'hero art must fit within its exact frame');}
for(const b of game.map.buildings)assert(game.findPath(b.doorX,b.doorY+1).length,b.id+' entrance must remain reachable');
const tick=(count)=>{for(let i=0;i<count;i++){game.time+=50;game.update(50);}};
game.path=game.findPath(26,16);assert(game.path.length,'path must avoid NPCs and fences');tick(120);assert.equal(game.player.x,26);assert.equal(game.player.y,16);assert(!game.player.step);
game.player.x=21;game.player.y=15;game.player.px=21.5*TILE;game.player.py=15.8*TILE;
assert(!game.beginStep(game.player,22,15),'cannot walk into water');
game.respawn();game.npcs[0].x=17;game.npcs[0].y=16;assert(!game.beginStep(game.player,17,16),'cannot walk through NPC');game.npcs[0].x=11;game.npcs[0].y=15;
const mob=game.mobs[0];game.clearSpawn(18,15);Object.assign(mob,{x:18,y:15,px:18.5*TILE,py:15.8*TILE,step:null});game.mobs.slice(1).forEach(m=>m.alive=false);
game.player.mana=60;game.time+=1000;game.attack(mob);assert(mob.hp<mob.max,'attack inflicts damage');assert(game.player.attackUntil>game.time,'attack uses animation');
game.player.hp=40;game.time+=700;game.attack(mob);game.time+=700;game.attack(mob);assert(!mob.alive,'enemy defeated');assert.equal(game.player.kills,1);assert.equal(game.player.coins,5);assert.equal(game.player.wood,1);
game.potion();assert.equal(game.player.hp,85);assert.equal(game.player.potions,1);
game.ui.dialogue(game.npcs[0]);game.ui.panel.querySelector('#questAccept').click();assert(game.player.questAccepted);
game.player.kills=3;game.ui.dialogue(game.npcs[0]);game.ui.panel.querySelector('#questAccept').click();assert(game.player.questReward);assert.equal(game.player.coins,25);assert.equal(game.player.potions,3);
game.ui.dialogue(game.npcs[0]);assert(!game.ui.panel.html.includes('id="questAccept"'),'quest reward cannot be claimed twice');game.ui.close();
const boss=game.mobs.find(m=>m.boss);boss.alive=true;Object.assign(boss,{x:18,y:15,px:18.5*TILE,py:15.8*TILE,hp:1,step:null});game.time+=700;game.attack(boss);assert(game.player.boss,'boss progression saved');assert.equal(game.player.level,2);assert.equal(game.player.xp,40,'XP remainder retained');
game.player.hp=1;mob.alive=true;mob.hp=mob.max;mob.lastAttack=0;game.time+=2000;game.update(20);assert.equal(game.player.hp,game.player.maxHp,'death restores health');assert.equal(game.player.x,SPAWN.x);
game.save();const restored=new Game(new Canvas('restore-test'));assert.equal(restored.player.coins,game.player.coins);assert(restored.player.boss);assert(!restored.mobs.find(m=>m.boss).alive);
store.set('tiholesye-v01',JSON.stringify({hp:70,maxHp:100,kills:2,coins:10,x:9,y:7}));const migrated=new Game(new Canvas('migration-test'));assert.equal(migrated.player.hp,70);assert.equal(migrated.player.kills,2);assert.equal(migrated.player.x,SPAWN.x);
store.clear();const fresh=new Game(new Canvas('preview'));await fresh.start();fresh.renderer.draw(800);fresh.ui.update();
const snapshot={canvas:fresh.canvas.id,canvases:canvases.map(c=>({id:c.id,width:c.width,height:c.height,ops:c.ctx.ops})),scale:2};
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/frame.json',JSON.stringify(snapshot));
clearTimeout(game.ui.timer);clearTimeout(fresh.ui.timer);clearTimeout(restored.ui.timer);clearTimeout(migrated.ui.timer);
console.log('PASS: village routes, collisions, movement, combat animation, loot, potions, quest rewards, boss, levels, death, save migration.');
console.log('Renderer exercised with real map and asset metadata; browser QA unavailable in this sandbox.');
