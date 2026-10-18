import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMap, findPath, isBlocked, SPAWN, TILE } from '../src/map.js';
import { heroFrames } from '../src/hero-frames.js';
const store=new Map(),nodes=new Map(),canvases=[];let serial=0;
class Context{
 constructor(canvas){this.canvas=canvas;this.ops=[];this.state={fillStyle:'#000000',strokeStyle:'#000000',globalAlpha:1,font:'10px sans-serif',textAlign:'left',lineWidth:1,tx:0,ty:0};this.stack=[];}
 save(){this.stack.push({...this.state});}
 restore(){this.state=this.stack.pop()||this.state;}
 scale(x,y){this.record('scale',[x,y]);}
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
const { drawCharacter, NPC_SPRITES }=await import('../src/assets.js');
const map=createMap();
for(const [label,x,y]of [['bridge',25,16],['market',27,15],['guardian',33,5],['inn',12,15]]){
 const path=findPath(map,SPAWN.x,SPAWN.y,x,y);assert(path.length>0,label+' must be reachable');
 let prev=SPAWN;for(const step of path){assert.equal(Math.abs(step.x-prev.x)+Math.abs(step.y-prev.y),1);assert(!isBlocked(map,step.x,step.y));prev=step;}
}
assert(isBlocked(map,22,15),'river is impassable');assert(!isBlocked(map,23,16),'bridge is passable');
for(const b of map.buildings)assert(isBlocked(map,b.x,b.y),'building must collide');
const game=new Game(document.getElementById('game'));await game.start();
// Check original pixel mode, switch availability, persistence and every SVG
// direction. This is intentionally independent from player 2D/3D choice.
assert.deepEqual(NPC_SPRITES,['elder','smith','merchant','villager','fisher']);
assert.equal(game.npcStyle,'pixel','pixel NPC style is the default');
for(const npc of game.npcs){
 assert(game.assets.images['vector-'+npc.sprite],'vector SVG loaded for '+npc.sprite);
 for(const [direction,row] of [['down',0],['left',1],['right',2],['up',3]]){
  npc.direction=direction;
  drawCharacter(game.ctx,game.assets,npc,0,'vector');
  const op=game.ctx.ops.at(-1);
  assert.equal(op.op,'drawImage');
  assert(op.args[0].includes('vector-'+npc.sprite+'.svg'),'SVG NPC used: '+npc.sprite);
  assert.equal(op.args[2],row*384,'correct SVG direction: '+npc.sprite+' '+direction);
  assert.equal(op.args[7],48,'same displayed NPC width');
  assert.equal(op.args[8],48,'same displayed NPC height');
 }
 npc.direction='down';
}
game.ui.settings();
assert(game.ui.panel.html.includes('id="npcStyle"'),'settings include style control');
game.ui.panel.querySelector('#npcStyle').click();
assert.equal(game.npcStyle,'vector','NPCs switch to vector style');
assert.equal(store.get('tiholesye-npc-style'),'vector','style choice persisted');
assert(game.ui.panel.html.includes('aria-pressed="true"'),'selected style reflected in settings');
const npcStyleRestore=new Game(new Canvas('npc-style-restored'));
assert.equal(npcStyleRestore.npcStyle,'vector','style restored next time');
game.ui.panel.querySelector('#npcStyle').click();
assert.equal(game.npcStyle,'pixel','NPCs switch back to original pixel mode');
game.ui.close();

// Artwork regressions: detached lines in the atlas must be clipped before
// placing cottage / forge; connected dirt tiles must not have grid outlines.
for(const [sprite,width] of [['cottage',3],['forge',2]]){
 const operations=game.assets.environment[sprite].getContext('2d').ops;
 assert(operations.some(op=>op.op==='clearRect'&&op.args[0]===0&&op.args[1]===0&&op.args[2]===width),
  sprite+' must remove disconnected atlas edge streaks');
}
const groundOps=game.renderer.ground.getContext('2d').ops;
assert(!groundOps.some(op=>op.op==='fillRect'&&op.state.fillStyle==='#a68052'),
 'Dirt paths must not draw the dark top/left square tile seams');
const pathTiles=map.terrain.flat().filter(t=>t==='path').length;
const pathBases=groundOps.filter(op=>op.op==='fillRect'&&op.state.fillStyle==='#b38c5b'
 &&op.args[2]===TILE&&op.args[3]===TILE).length;
assert.equal(pathBases,pathTiles,'Every path tile must use the same seamless dirt fill');
assert.equal(game.modelMode,'3d','new players should see Blender hero by default');game.setModelMode('3d');assert.equal(game.player.sprite,'hero3d');assert.equal(store.get('tiholesye-model'),'3d');game.setModelMode('2d');assert.equal(game.player.sprite,'hero');
for(const row of heroFrames)for(const frame of row){const [, ,w,h]=frame.source,dx=40-Math.round(frame.anchor[0]*.175),dy=64-Math.round(h*.175);assert(dx>=0&&dy>=0&&dx+Math.round(w*.175)<=80&&dy+Math.round(h*.175)<=80,'hero art must fit within its exact frame');}
for(const b of game.map.buildings)assert(game.findPath(b.doorX,b.doorY+1).length,b.id+' entrance must remain reachable');
const tick=(count)=>{for(let i=0;i<count;i++){game.time+=50;game.update(50);}};
const clickTile=(x,y)=>{const r=game.canvas.getBoundingClientRect();game.click({clientX:((x+.5)*TILE-game.camera.x)/game.canvas.width*r.width+r.left,clientY:((y+.5)*TILE-game.camera.y)/game.canvas.height*r.height+r.top});};
for(const [x,y] of [[22,15],[9,10],[11,15]]){
 game.path=[{x:18,y:15}];clickTile(x,y);
 assert.equal(game.path.length,0,'water, buildings and occupied NPC cells cannot redirect the player');
 assert.equal(game.target,null);assert(!game.player.moving);
}
game.clearSpawn(18,15);game.beginStep(game.player,18,15);game.advance(game.player,105);
const stoppedAt=[game.player.px,game.player.py];clickTile(22,15);tick(2);
assert.deepEqual([game.player.px,game.player.py],stoppedAt,'an invalid click immediately stops an active step');
assert(!game.player.step);
clickTile(17,15);tick(12);assert.equal(game.player.x,17);assert.equal(game.player.y,15);
assert.equal(game.player.px,17.5*TILE,'a subsequent valid click reaches its exact tile center');
const island=[[4,4],[3,4],[5,4],[4,3],[4,5]],savedIsland=island.map(([x,y])=>game.map.blocked[y][x]);
island.forEach(([x,y],i)=>game.map.blocked[y][x]=i!==0);game.path=[{x:18,y:15}];clickTile(4,4);
assert.equal(game.path.length,0,'an isolated free tile does not fall back to a reachable neighbor');
island.forEach(([x,y],i)=>game.map.blocked[y][x]=savedIsland[i]);
game.clearSpawn(18,15);game.clearSpawn(19,15);game.keys.add('ArrowRight');tick(1);assert.equal(game.player.animationTime,0);tick(4);
const beforeBoundary=game.player.animationTime;tick(1);assert(game.player.moving);assert(game.player.animationTime>beforeBoundary,'walk phase survives a tile boundary');
game.keys.clear();tick(5);assert(!game.player.moving);assert.equal(game.player.animationState,'idle');
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
game.player.hp=1;mob.alive=true;mob.hp=mob.max;mob.lastAttack=0;game.time+=2000;game.update(20);assert.equal(game.player.hp,game.player.maxHp,'death restores health');assert.equal(game.player.x,SPAWN.x);assert.equal(game.player.attackUntil,0,'respawn cancels old attack');
game.save();const restored=new Game(new Canvas('restore-test'));assert.equal(restored.player.coins,game.player.coins);assert(restored.player.boss);assert(!restored.mobs.find(m=>m.boss).alive);
store.set('tiholesye-v01',JSON.stringify({hp:70,maxHp:100,kills:2,coins:10,x:9,y:7}));const migrated=new Game(new Canvas('migration-test'));assert.equal(migrated.player.hp,70);assert.equal(migrated.player.kills,2);assert.equal(migrated.player.x,SPAWN.x);
store.clear();const fresh=new Game(new Canvas('preview'));await fresh.start();fresh.setModelMode('3d');fresh.renderer.draw(800);fresh.ui.update();
const snapshot={canvas:fresh.canvas.id,canvases:canvases.map(c=>({id:c.id,width:c.width,height:c.height,ops:c.ctx.ops})),scale:2};
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/frame.json',JSON.stringify(snapshot));
clearTimeout(game.ui.timer);clearTimeout(fresh.ui.timer);clearTimeout(restored.ui.timer);clearTimeout(migrated.ui.timer);
console.log('PASS: pixel/vector NPC art, local persistence, routes, movement, combat, hero 2D/3D, quests, boss and saves.');
console.log('Renderer exercised with map and asset metadata; run tests/browser.cjs for Chrome validation.');
