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

// Version 0.4: scenes are distinct maps; the old 40x30 river/bridge is retired.
const map=createMap('village'),forest=createMap('forest'),tavern=createMap('tavern');
assert.deepEqual([map.width,map.height],[64,48]);
assert.deepEqual([forest.width,forest.height],[100,80]);
assert.deepEqual([tavern.width,tavern.height],[24,18]);
assert.equal(map.buildings.length,8);
assert(map.buildings.some(b=>b.id==='inn'));
assert(forest.objects.filter(o=>o.tree).length>600,'dense forest');
assert(map.objects.filter(o=>o.tree).length<110,'open settlement');
assert.equal(isBlocked(map,57,30),true,'village pond is impassable');
assert.equal(isBlocked(map,30,24),false,'town square is accessible');
for(const b of map.buildings){
 assert(isBlocked(map,b.x,b.y),'building collision: '+b.id);
 const path=findPath(map,SPAWN.x,SPAWN.y,b.doorX,b.doorY+1);
 assert(path.length>0,'entrance reachable: '+b.id);
}
for(const [scene,start] of [[map,SPAWN],[forest,{x:3,y:40}],[tavern,{x:12,y:14}]]){
 for(const portal of scene.portals){
  assert(!isBlocked(scene,portal.x,portal.y),'portal is traversable');
  const path=findPath(scene,start.x,start.y,portal.x,portal.y);
  assert(path.length>0,'exit path exists in '+scene.id);
  let prev=start;
  for(const step of path){
   assert.equal(Math.abs(step.x-prev.x)+Math.abs(step.y-prev.y),1,'cardinal path');
   assert(!isBlocked(scene,step.x,step.y),'path avoids solid cells');
   prev=step;
  }
  const next=createMap(portal.to);
  assert(!isBlocked(next,portal.spawn.x,portal.spawn.y),'destination is free');
 }
}
assert.equal(TILE,32);

// Headless DOM/game initialization still checks art, inventories and interactions.
const defaultStyle=new Game(new Canvas('default-npc-style'));
assert.equal(defaultStyle.npcStyle,'vector','vector NPC style is the default');
store.set('tiholesye-npc-style','pixel');
const game=new Game(document.getElementById('game'));
await game.start();
assert.equal(game.location,'village');
assert.equal(game.mobs.length,0,'no combat spawns in the village');
assert.equal(game.npcs.length,7,'seven villagers');
assert.deepEqual(NPC_SPRITES,['elder','smith','merchant','villager','fisher']);
assert.equal(game.npcStyle,'pixel');
for(const npc of game.npcs){
 assert(game.assets.images['vector-'+npc.sprite],npc.sprite+' SVG asset loads');
 for(const [direction,row] of [['down',0],['left',1],['right',2],['up',3]]){
  npc.direction=direction;
  drawCharacter(game.ctx,game.assets,npc,0,'vector');
  const op=game.ctx.ops.at(-1);
  assert.equal(op.op,'drawImage');
  assert(op.args[0].includes('vector-'+npc.sprite+'.svg'),'vector art');
  assert.equal(op.args[2],row*384);
  assert.equal(op.args[7],48);
  assert.equal(op.args[8],48);
 }
 npc.direction='down';
}
game.ui.settings();
assert(game.ui.panel.html.includes('id="npcStyle"'));
game.ui.panel.querySelector('#npcStyle').click();
assert.equal(game.npcStyle,'vector');
assert.equal(store.get('tiholesye-npc-style'),'vector');
const restoredStyle=new Game(new Canvas('restored-style'));
assert.equal(restoredStyle.npcStyle,'vector');
game.ui.close();

// All new houses are sourced from the concept-art atlas (legacy repair used
// clearRect, but replacing that canvas with authored artwork should not).
for(const [sprite,width] of [['cabin',5*TILE],['cottage',5*TILE],['forge',5*TILE],['inn',5*TILE],['market',5*TILE],['chapel',5*TILE]]){
 const image=game.assets.environment[sprite];
 assert.equal(image.width,width,'new art grid width: '+sprite);
 const operations=image.getContext('2d').ops;
 assert(operations.some(op=>op.op==='drawImage'),'new building artwork is drawn: '+sprite);
}
assert.equal(game.assets.environment.fountain.width,3*TILE);
const groundOps=game.renderer.ground.getContext('2d').ops;
assert(!groundOps.some(op=>op.op==='fillRect'&&op.state.fillStyle==='#a68052'),'dirt seam regression');
const paths=map.terrain.flat().filter(t=>t==='path').length;
const pathBases=groundOps.filter(op=>op.op==='fillRect'&&op.state.fillStyle==='#b38c5b'
 &&op.args[2]===TILE&&op.args[3]===TILE).length;
assert.equal(pathBases,paths,'every trail tile uses seamless fill');
for(const row of heroFrames)for(const frame of row){
 const [,,w,h]=frame.source,dx=40-Math.round(frame.anchor[0]*.175),dy=64-Math.round(h*.175);
 assert(dx>=0&&dy>=0&&dx+Math.round(w*.175)<=80&&dy+Math.round(h*.175)<=80,'hero frame fits');
}
assert.equal(game.modelMode,'2d','pixel druid is the default for new players');
assert.deepEqual([game.assets.images.hero.width,game.assets.images.hero.height],[480,192],
 'the hero should have ten 48px frames by four directions, not 80px frames');
const heroOps=[],heroContext={drawImage(...args){heroOps.push(args);}};
drawCharacter(heroContext,game.assets,game.player,0);
assert.deepEqual(heroOps[0].slice(1,5),[0,0,48,48],'48px source frame');
assert.deepEqual(heroOps[0].slice(7),[48,48],'48px rendered hero, without oversize scaling');
game.setModelMode('2d');
assert.equal(game.player.sprite,'hero');
game.setModelMode('3d');
assert.equal(game.player.sprite,'hero3d');

// Clicking a character walks to the nearest free neighboring tile.
const elder=game.npcs.find(n=>n.id==='elder');
const invokeClick=(worldX,worldY,cameraX,cameraY)=>{
 game.camera.x=cameraX;game.camera.y=cameraY;
 const rect=game.canvas.getBoundingClientRect();
 game.click({
  clientX:(worldX-cameraX)/game.canvas.width*rect.width+rect.left,
  clientY:(worldY-cameraY)/game.canvas.height*rect.height+rect.top
 });
};
invokeClick(elder.px,elder.py-18,360,400);
assert.equal(game.target?.id,'elder','NPC is selected');
assert(game.path.length>0,'click routes hero toward the resident');
const tavernDoor=map.buildings.find(b=>b.id==='inn');
invokeClick((tavernDoor.x+2)*TILE,(tavernDoor.y+2)*TILE,270,290);
assert.equal(game.target?.id,'inn','tavern roof click selects the door');
assert(game.path.length>0,'hero automatically approaches the tavern');

// Interact with villagers, quests and existing commerce.
game.stopMovement();
Object.assign(game.player,{x:elder.x,y:elder.y+1,px:(elder.x+.5)*TILE,py:(elder.y+1.8)*TILE});
game.target=elder;game.interactTarget();
assert(game.ui.open,'adjacent NPC dialogue opens');
assert(game.ui.panel.html.includes('questAccept'),'quest controls available');
game.ui.panel.querySelector('#questAccept').click();
assert(game.player.questAccepted);
assert(!game.ui.open);

// Switch to separate tavern interior and test merchant / saving.
game.ready=false; // Avoid recreating a giant synthetic mock render surface.
game.ui.building(tavernDoor);
assert.equal(game.location,'tavern','inn door leads to interior');
assert.equal(game.mobs.length,0);
assert(game.npcs.some(n=>n.id==='innkeeper'),'tavern merchant exists');
const innkeeper=game.npcs.find(n=>n.id==='innkeeper');
game.player.coins=10;
game.ui.dialogue(innkeeper);
game.ui.panel.querySelector('#buyPotion').click();
assert.equal(game.player.coins,5);
assert.equal(game.player.potions,3);
game.ui.close();
game.enterLocation('village',15,16);
assert.equal(game.location,'village');

// Separate forest owns enemies, herbs and the boss.
game.enterLocation('forest',3,40);
assert.equal(game.npcs.length,0,'no village NPCs in forest');
assert.equal(game.mobs.length,7);
assert(game.mobs.some(m=>m.boss),'forest boss exists');
assert(game.herbs.length>0,'forest resources exist');
const mob=game.mobs[0];
Object.assign(game.player,{x:mob.x,y:mob.y+1,px:(mob.x+.5)*TILE,py:(mob.y+1.8)*TILE,mana:60});
game.time+=1000;game.attack(mob);
assert(mob.hp<mob.max,'attack damages forest enemy');
game.time+=700;game.attack(mob);
game.time+=700;game.attack(mob);
assert(!mob.alive,'forest foe defeated');
assert.equal(game.player.kills,1);
assert.equal(game.player.coins,10);
assert.equal(game.player.wood,1);
game.player.hp=40;
game.potion();
assert.equal(game.player.hp,85);
game.save();
const fromForest=new Game(new Canvas('forest-save'));
assert.equal(fromForest.location,'forest','saved forest scene restored');
assert.equal(fromForest.player.coins,game.player.coins);
assert.equal(fromForest.mobs.length,7);

// Defeat returns to village and preserves progress.
game.respawn();
assert.equal(game.location,'village');
assert.equal(game.player.x,SPAWN.x);
assert.equal(game.player.hp,game.player.maxHp);
game.save();
const fromVillage=new Game(new Canvas('village-save'));
assert.equal(fromVillage.location,'village');
assert.equal(fromVillage.player.coins,game.player.coins);
store.set('tiholesye-v01',JSON.stringify({hp:70,maxHp:100,kills:2,coins:10,x:9,y:7}));
const migrated=new Game(new Canvas('old-save'));
assert.equal(migrated.player.hp,70);
assert.equal(migrated.player.kills,2);
assert.equal(migrated.player.x,SPAWN.x,'old save returns to village');
assert.equal(migrated.location,'village');

// A lightweight render snapshot remains available for asset audit tooling.
store.clear();
const fresh=new Game(new Canvas('preview'));await fresh.start();
fresh.renderer.draw(800);fresh.ui.update();
fs.mkdirSync('.qa',{recursive:true});
fs.writeFileSync('.qa/frame.json',JSON.stringify({
 canvas:fresh.canvas.id,
 canvases:canvases.filter(c=>c.id==='game'||c.id==='preview').map(c=>({id:c.id,width:c.width,height:c.height,ops:c.ctx.ops})),
 scale:2
}));
for(const g of [game,fresh,restoredStyle,fromForest,fromVillage,migrated])clearTimeout(g.ui.timer);
console.log('PASS: village/forest/tavern routes, NPC art, click-to-approach, quests, commerce, mobs, saved biomes and pixel rendering.');
