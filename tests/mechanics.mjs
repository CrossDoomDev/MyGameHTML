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
 addEventListener(type,listener){(this.events??={})[type]??=[];this.events[type].push(listener);}
 emit(type,event){for(const listener of this.events?.[type]||[])listener(event);}
 focus(){document.activeElement=this;}click(){this.onclick?.();}
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
globalThis.window={
 handlers:new Map(),
 addEventListener(type,fn){this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);},
 emit(type,event){for(const fn of this.handlers.get(type)||[])fn(event);}
};
globalThis.document={hidden:false,activeElement:null,addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,['game','portrait','minimap'].includes(id)?new Canvas(id):new Element(id));return nodes.get(id);},querySelectorAll(){return [];},createElement(tag){return tag==='canvas'?new Canvas():new Element();}};
globalThis.Image=class{
 set src(value){this._src=value;const meta=value.includes('village-source')?[1254,1254]:value.includes('guardian')?[512,64]:value.includes('mossling')?[384,48]:value.includes('icons')?[192,24]:value.includes('npc-village-48.avif')?[576,240]:value.includes('class-villagers.png')?[144,1152]:[480,192];[this.width,this.height]=meta;queueMicrotask(()=>this.onload());}
 get src(){return this._src;}
};
globalThis.requestAnimationFrame=()=>{};
const { Game }=await import('../src/world.js');
const { showGroundRoute }=await import('../src/renderer.js');
const { drawCharacter, NPC_SPRITES }=await import('../src/assets.js');
const {CLASS_SPRITES,PATROL_RADIUS}=await import('../src/village-visitors.js');

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

// The hero is strictly 2D, even when a returning browser retains obsolete
// 3D-model preferences. Keep all unrelated save data untouched.
store.set('tiholesye-model','3d');
store.set('tiholesye-compact-hero-48','1');
const defaultStyle=new Game(new Canvas('default-npc-style'));
assert.equal(defaultStyle.npcStyle,'pixel','new generated pixel NPCs are the default');
assert.equal(defaultStyle.player.sprite,'hero','retired 3D setting cannot change the 2D hero');
assert.equal(defaultStyle.modelMode,undefined,'no retired character-model switch remains');
assert.equal(store.get('tiholesye-model'),'3d','legacy settings need not be rewritten');
const restoredChoice=new Game(new Canvas('restored-old-save'));
assert.equal(restoredChoice.player.sprite,'hero','all newly constructed games use the pixel hero');
store.set('tiholesye-npc-style','pixel');
const game=new Game(document.getElementById('game'));
await game.start();
assert.equal(game.location,'village');

// Physical I uses KeyboardEvent.code and works on a Russian keyboard.
let characterHotkeyPrevented=false;
window.emit('keydown',{code:'KeyI',key:'ш',repeat:false,ctrlKey:false,metaKey:false,altKey:false,
 preventDefault(){characterHotkeyPrevented=true;}});
assert(characterHotkeyPrevented,'I key intercepts browser action');
assert.equal(game.ui.open,true,'I opens the character sheet');
assert.equal(game.ui.characterMenu.active,true);
assert(game.ui.panel.html.includes('data-tab="equipment"'));
assert(game.ui.panel.html.includes('data-tab="inventory"'));
assert(game.ui.panel.html.includes('data-tab="stats"'));
assert(game.ui.panel.html.includes('data-tab="skills"'));
assert(game.ui.panel.html.includes('id="characterFigure"'),'outfit preview exists');
game.ui.characterMenu.open('stats');
assert(game.ui.panel.html.includes('Защита снаряжения'),'equipment affects stats');
game.ui.characterMenu.open('skills');
assert(game.ui.panel.html.includes('Улучшить'),'upgrades have placeholders');
assert(game.ui.panel.html.includes('disabled'),'skill spending not yet enabled');
game.ui.characterMenu.open('inventory');
assert(game.ui.panel.html.includes('data-item="potion"'),'consumables included');
assert(game.ui.panel.html.includes('data-item="shirt"'),'changeable clothes included');
assert(!game.ui.panel.html.includes('data-item="staff"'),'equipped weapon not duplicated in inventory');
assert(!game.ui.panel.html.includes('data-item="hood"'),'equipped hood not duplicated in inventory');
assert(!game.ui.panel.html.includes('data-item="robe"'),'equipped robe not duplicated in inventory');
assert(!game.ui.panel.html.includes('data-item="cloak"'),'equipped cloak not duplicated in inventory');
assert(!game.ui.panel.html.includes('data-item="boots"'),'equipped boots not duplicated in inventory');
assert(game.ui.panel.html.includes('data-icon="staff_crystal"'),'item art uses generated atlas');
assert(game.ui.panel.html.includes('data-icon="potion_red"'),'consumable art uses generated atlas');
assert(!game.ui.panel.html.includes('🧪'),'old emoji is absent from the inventory');
game.ui.characterMenu.open('skills');
for(const icon of ['skill_bolt','skill_roots','skill_heal'])
 assert(game.ui.panel.html.includes('data-icon="'+icon+'"'),'illustrated spell icon '+icon);
game.ui.characterMenu.open('equipment');
assert(game.ui.panel.html.includes('data-icon="staff_basic"'),'equipped items visible in gear slots');
game.ui.characterMenu.open('inventory');
window.emit('keydown',{code:'KeyI',key:'ш',repeat:false,ctrlKey:false,metaKey:false,altKey:false,
 preventDefault(){}});
assert.equal(game.ui.open,false,'second I closes the window');
game.character.equipment.weapon='sword';game.applyEquipment();
assert.equal(game.player.weaponType,'sword');
assert.equal(game.setPrimaryAttack('bolt'),false,'sword cannot use staff-only spell');
game.character.equipment.weapon='staff';game.applyEquipment();
assert.equal(game.player.weaponType,'staff');
game.character.quickSlots[9]='potion';
game.ui.renderQuickbar();
const potionCountBefore=game.player.potions;
game.player.hp=game.player.maxHp-45;
game.ui.slot(9);
assert.equal(game.player.potions,potionCountBefore-1,'mapped key zero uses a potion');
assert.equal(game.player.hp,game.player.maxHp,'mapped potion restores health');
game.player.potions=potionCountBefore; // Restore fixture for existing shop/quest assertions.
game.character.quickSlots[9]=null;game.applyEquipment();

assert.equal(game.mobs.length,0,'no combat spawns in the village');
assert.equal(game.npcs.length,7,'seven villagers');
assert.equal(game.visitors.length,6,'six independently wandering class previews join the village');
assert.deepEqual(game.visitors.map(v=>v.sprite),CLASS_SPRITES,'all six archetypes placed in village');
for(const visitor of game.visitors){
 assert(!isBlocked(game.map,visitor.x,visitor.y),visitor.sprite+' spawns on passable ground');
 assert.equal(visitor.visitor,true);
 assert.equal(visitor.homeX,visitor.x);
 assert.equal(visitor.homeY,visitor.y);
 const img=game.assets.images[visitor.sprite];
 assert.deepEqual([img.width,img.height],[144,192],visitor.sprite+' has twelve isolated 48px poses');
}
const positions=new Map(game.visitors.map(v=>[v.id,new Set([v.x+','+v.y])]));
for(let i=0;i<480;i++){
 game.time+=50;
 game.updateVisitors(50);
 for(const v of game.visitors){
  assert(!isBlocked(game.map,v.x,v.y),v.sprite+' stays off scenery');
  assert(Math.abs(v.x-v.homeX)+Math.abs(v.y-v.homeY)<=PATROL_RADIUS,
   v.sprite+' never wanders further than three tiles from start');
  positions.get(v.id).add(v.x+','+v.y);
  assert(!v.step||Math.abs(v.step.x-v.x)+Math.abs(v.step.y-v.y)===1,
   v.sprite+' uses cardinal one-tile walking, no diagonal or teleport');
 }
 const occupied=new Set();
 for(const v of game.visitors){
  const location=v.x+','+v.y;
  assert(!occupied.has(location),'villagers never share an occupied tile');
  occupied.add(location);
 }
}
assert([...positions.values()].every(cells=>cells.size>=2),
 'every class should visibly take a few short steps');
game.time=0;
for(const v of game.visitors){
 v.x=v.homeX;v.y=v.homeY;
 v.px=(v.x+.5)*TILE;v.py=(v.y+.8)*TILE;
 v.step=null;v.moving=false;v.nextThink=420+v.seed*245;
}

assert.deepEqual(NPC_SPRITES,['elder','smith','merchant','villager','fisher']);
assert.equal(game.npcStyle,'pixel');
for(const npc of game.npcs){
 const atlas=game.assets.images[npc.sprite];
 assert.equal(atlas.width,144,'NPC '+npc.sprite+' has 3 frames at 48px');
 assert.equal(atlas.height,192,'NPC '+npc.sprite+' has 4 directions');
 for(const [direction,row] of [['down',0],['left',1],['right',2],['up',3]]){
  npc.direction=direction;npc.moving=false;
  drawCharacter(game.ctx,game.assets,npc,0,'pixel');
  const op=game.ctx.ops.at(-1);
  assert.equal(op.op,'drawImage');
  assert.equal(op.args[0],atlas.id,'new character sheet is used');
  assert.equal(op.args[2],row*48,'native 48px direction row');
  assert.equal(op.args[3],48);
  assert.equal(op.args[4],48);
  assert.equal(op.args[7],48);
  assert.equal(op.args[8],48);
 }
 npc.direction='right';npc.moving=true;npc.animationTime=130;
 drawCharacter(game.ctx,game.assets,npc,0,'pixel');
 assert.equal(game.ctx.ops.at(-1).args[1],48,'walking animates to second real frame');
 npc.moving=false;npc.direction='down';
}
game.ui.settings();
assert(game.ui.panel.html.includes('Пиксельный стиль'),'settings show permanent pixel NPC art');
assert(!game.ui.panel.html.includes('id="npcStyle"'),'old vector switch is retired');
store.set('tiholesye-npc-style','vector');
const restoredStyle=new Game(new Canvas('restored-style'));
assert.equal(restoredStyle.npcStyle,'pixel','old stored vector mode migrates to pixel');
assert.equal(store.get('tiholesye-npc-style'),'pixel','pixel mode persists');
game.ui.close();

// Regression: rapid left clicks must only replace the queued route.
// No mid-tile coordinate rounding, reversal, diagonal jump or walk reset.
const originalMove={
 x:game.player.x,y:game.player.y,px:game.player.px,py:game.player.py,
 direction:game.player.direction,animationTime:game.player.animationTime,
 animationState:game.player.animationState,camera:{...game.camera}
};
let clickArea;
for(let y=5;y<game.map.height-5&&!clickArea;y++)for(let x=5;x<game.map.width-5;x++){
 const cells=[[x,y],[x+1,y],[x+2,y],[x+1,y-1],[x+1,y+1],[x+2,y+1]];
 if(cells.every(([cx,cy])=>!game.blocked(cx,cy))&&
    game.npcs.every(n=>Math.abs(n.x-x)>5||Math.abs(n.y-y)>5)){
  clickArea={x,y};break;
 }
}
assert(clickArea,'village contains a walkable test cross');
const p=game.player;
Object.assign(p,{x:clickArea.x,y:clickArea.y,px:(clickArea.x+.5)*TILE,
 py:(clickArea.y+.8)*TILE,step:null,moving:false,direction:'down',animationTime:0,animationState:'idle'});
game.path=[];game.target=null;game.camera={x:(clickArea.x-3)*TILE,y:(clickArea.y-3)*TILE};
const tileClick=(x,y,button=0)=>game.click({
 button,
 clientX:((x+.5)*TILE-game.camera.x)/game.canvas.width*1280,
 clientY:((y+.5)*TILE-game.camera.y)/game.canvas.height*720
});
const testX=clickArea.x,testY=clickArea.y;
tileClick(testX+1,testY);
assert.deepEqual(game.path,[{x:testX+1,y:testY}],'click starts a cardinal route');
assert.equal(showGroundRoute(game),true,'ordinary terrain clicks retain their destination square');
game.update(0);game.update(90);
const midX=p.px,midY=p.py,activeStep=p.step,phase=p.animationTime;
assert(activeStep&&p.direction==='right','hero is travelling right');
assert(midX>(testX+.5)*TILE&&midX<(testX+1.5)*TILE,'hero is inside the tile');
for(let i=0;i<35;i++)tileClick(testX+1,testY);
assert.strictEqual(p.step,activeStep,'repeat-click never cancels the current step');
assert.equal(p.px,midX,'repeat-click does not snap pixels or teleport');
assert.equal(p.py,midY,'repeat-click leaves vertical coordinate intact');
assert.equal(p.direction,'right','facing stays stable mid-stride');
assert.equal(p.animationTime,phase,'gait phase is not reset by input');
tileClick(testX+2,testY);
assert.strictEqual(p.step,activeStep,'new destination queues after the ongoing step');
assert.deepEqual(game.path,[{x:testX+2,y:testY}],'path is based on step destination');
const keptRoute=game.path;
for(let i=0;i<25;i++)tileClick(testX+2,testY);
assert.strictEqual(game.path,keptRoute,'repeated target does not recompute or jitter');
tileClick(testX+1,testY-1);
assert.strictEqual(p.step,activeStep,'even a sharp turn does not reverse in mid-cell');
assert.deepEqual(game.path,[{x:testX+1,y:testY-1}],'the next tile is cardinal, no backwards zero-length hop');
tileClick(testX+2,testY+1,2);
assert.deepEqual(game.path,[{x:testX+1,y:testY-1}],'right mouse clicks do not navigate');
tileClick(-1,testY);
assert.deepEqual(game.path,[{x:testX+1,y:testY-1}],'invalid click retains current route');
assert.equal(p.px,midX,'frequent input alone never changes actual position');
game.update(210);
assert.equal(p.x,testX+1,'first step lands on its originally committed cell');
assert.equal(p.px,(testX+1.5)*TILE,'step ends at the exact cell center');
assert.equal(p.py,(testY+.8)*TILE,'no diagonal y drift at the turn');
assert.equal(p.direction,'up','hero turns only after landing');
assert.deepEqual([p.step?.x,p.step?.y],[testX+1,testY-1],'next step uses new destination');
game.update(90);
assert(p.py<(testY+.8)*TILE&&p.py>(testY-.2)*TILE,'next step interpolates smoothly');
assert.equal(p.px,(testX+1.5)*TILE,'no sideways jitter after turning');
Object.assign(p,originalMove);delete p.camera;p.step=null;p.moving=false;
game.camera=originalMove.camera;game.path=[];game.target=null;

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
assert.equal(game.player.sprite,'hero','pixel druid is the only available hero');
assert.deepEqual([game.assets.images.hero.width,game.assets.images.hero.height],[480,192],
 'the hero should have ten 48px frames by four directions, not 80px frames');
const heroOps=[],heroContext={drawImage(...args){heroOps.push(args);}};
drawCharacter(heroContext,game.assets,game.player,0);
assert.deepEqual(heroOps[0].slice(1,5),[0,0,48,48],'48px source frame');
assert.deepEqual(heroOps[0].slice(7),[48,48],'48px rendered hero, without oversize scaling');
assert.equal(game.assets.images.hero3d,undefined,'3D sprite atlas is no longer loaded');
for(const retired of [
 'assets/hero-3d.glb','assets/hero-3d-atlas.png',
 'assets/hero-3d-preview.png','tools/create_hero_3d.py'
])assert(!fs.existsSync(retired),'obsolete 3D hero resource is removed: '+retired);
assert.equal(game.setModelMode,undefined,'3D selection API is removed');
game.ui.settings();
assert(!game.ui.panel.html.includes('modelMode'),'settings contain no retired model button');
assert(!game.ui.panel.html.includes('hero-3d'),'settings contain no old 3D preview or download');
assert(!game.ui.panel.html.includes('GLB'),'settings contain no model download');
game.ui.close();
assert.equal(game.player.sprite,'hero','settings leave the 2D hero unchanged');

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
assert.equal(showGroundRoute(game),false,'approaching an NPC has no destination square');
const tavernDoor=map.buildings.find(b=>b.id==='inn');
invokeClick((tavernDoor.x+2)*TILE,(tavernDoor.y+2)*TILE,270,290);
assert.equal(game.target?.id,'inn','tavern roof click selects the door');
assert(game.path.length>0,'hero automatically approaches the tavern');
assert.equal(showGroundRoute(game),false,'approaching a building/door has no destination square');

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
// Combat focus persists and initiates movement to a suitable attack position;
// manual keyboard movement can still take priority without dropping the focus.
const focusedBoss=game.mobs.find(m=>m.boss);
const focusHero=game.player;
for(const dy of [1,2,3,4])game.clearSpawn(focusedBoss.x,focusedBoss.y+dy);
Object.assign(focusHero,{
 x:focusedBoss.x,y:focusedBoss.y+3,
 px:(focusedBoss.x+.5)*TILE,py:(focusedBoss.y+3.8)*TILE,
 step:null,moving:false,direction:'down',mana:60,hp:120,weaponType:'staff',classId:'druid'
});
game.path=[];game.target=null;game.keys.clear();game.ui.open=false;
game.time=10000;game.lastAttack=-1000;game.skillCooldowns={};game.ready=true;
const focusClick=(wx,wy,button=0)=>{
 game.camera.x=wx-180;game.camera.y=wy-180;
 const rect=game.canvas.getBoundingClientRect();
 game.click({button,
  clientX:(wx-game.camera.x)/game.canvas.width*rect.width+rect.left,
  clientY:(wy-game.camera.y)/game.canvas.height*rect.height+rect.top});
};
focusClick(focusedBoss.px,focusedBoss.py-17);
assert.strictEqual(game.combatTarget,focusedBoss,'click on hostile sets combat focus');
assert.equal(game.target,null,'combat focus does not become NPC interaction target');
assert(game.path.length>0,'selecting a distant hostile queues approach to melee range');
assert.equal(showGroundRoute(game),false,'tracking a hostile never shows the attack-position square');
game.ui.update();
assert.equal(document.getElementById('combatFocus').hidden,false,'target status visible');
assert.equal(document.getElementById('combatFocusName').textContent,'Лесной страж');
const firstHp=focusedBoss.hp;
// Staff is the default attack and does not automatically fire from a distance.
assert.equal(game.primaryAttackMode,'staff','melee staff is selected by default');
game.keys.add('KeyD');
game.update(16);
assert.equal(focusedBoss.hp,firstHp,'default staff never attacks from three tiles away');
assert.equal(focusHero.direction,'right','WASD overrides automatic pursuit immediately');
const manaBeforeSelection=focusHero.mana;
const app=document.getElementById('app');
const rightClickIcon=id=>{
 let pressPrevented=false,menuPrevented=false;
 const target={closest:()=>document.getElementById(id)};
 app.emit('pointerdown',{button:2,target,preventDefault(){pressPrevented=true;}});
 app.emit('contextmenu',{target,preventDefault(){menuPrevented=true;}});
 assert(pressPrevented,'RMB press is handled by the game');
 assert(menuPrevented,'browser context menu is suppressed');
};
rightClickIcon('skill-bolt');
assert.equal(game.primaryAttackMode,'bolt','RMB on emerald bolt equips it as primary');
assert.equal(store.get('tiholesye-primary-attack'),'bolt','primary attack persisted');
game.update(60);
assert.strictEqual(game.combatTarget,focusedBoss,'WASD keeps focused enemy selected');
assert.equal(focusHero.direction,'right','walking sprite faces movement, not enemy aim');
assert.equal(focusHero.step?.x,focusedBoss.x+1,'keyboard keeps moving while auto firing');
assert(focusedBoss.hp<firstHp,'automatic ranged attack damages the locked enemy');
assert(game.effects.some(e=>e.type==='bolt'),'auto ranged fire draws a visible projectile');
const firstAutoCooldown=game.skillCooldowns.bolt;
assert(firstAutoCooldown>game.time,'auto ranged spell observes normal cooldown');
assert.equal(focusHero.attackUntil<game.time,true,'auto shot does not force attack pose during walking');
rightClickIcon('skill-bolt');
assert.equal(game.primaryAttackMode,'bolt','RMB keeps bolt selected during cooldown');
let canvasPrevented=false;
game.canvas.emit('pointerdown',{button:2,preventDefault(){canvasPrevented=true;}});
assert(canvasPrevented,'RMB on the game canvas is intercepted');
let contextPrevented=false;
app.emit('contextmenu',{target:{closest:()=>null},preventDefault(){contextPrevented=true;}});
assert(contextPrevented,'RMB on the game world cannot show a browser menu');
assert.strictEqual(game.combatTarget,focusedBoss,'world right click never clears focus');
const focusedHp=focusedBoss.hp;
game.update(100);
assert.equal(focusedBoss.hp,focusedHp,'cooldown prevents repeated hits every frame');
game.keys.delete('KeyD');
assert.strictEqual(game.combatTarget,focusedBoss,'releasing WASD keeps focus');
focusClick((focusedBoss.x+3.5)*TILE,(focusedBoss.y+3.5)*TILE,2);
assert.strictEqual(game.combatTarget,focusedBoss,'right mouse button does not clear focus');
game.clearSpawn(focusedBoss.x+2,focusedBoss.y+3);
focusClick((focusedBoss.x+2.5)*TILE,(focusedBoss.y+3.5)*TILE);
assert.equal(game.combatTarget,null,'left mouse movement removes combat focus immediately');
assert.equal(document.getElementById('combatFocus').hidden,true,'HUD clears immediately on ground click');
game.time+=2500;game.update(60);game.ui.update();
assert.equal(focusedBoss.hp,focusedHp,'no more auto damage after ground click');
assert.equal(document.getElementById('combatFocus').hidden,true,'HUD hides without a target');
// Switching back to staff disables ranged autofire and performs a mana-free
// automatic melee strike only when a focused enemy is within touching range.
rightClickIcon('primaryStaff');
assert.equal(game.primaryAttackMode,'staff','RMB on staff restores melee as primary');
assert.equal(store.get('tiholesye-primary-attack'),'staff','staff selection persists');
game.combatTarget=focusedBoss;
Object.assign(focusHero,{x:focusedBoss.x,y:focusedBoss.y+1,
 px:(focusedBoss.x+.5)*TILE,py:(focusedBoss.y+1.8)*TILE,
 step:null,moving:false});
game.path=[];game.target=null;game.keys.clear();game.lastAttack=-1000;
const nearHp=focusedBoss.hp,nearMana=focusHero.mana;
game.time+=700;game.update(16);
assert(focusedBoss.hp<nearHp,'focused staff automatically damages at melee distance');
assert(Math.abs(focusHero.mana-nearMana-16*.004)<.001,
 'staff strike costs no mana apart from normal regeneration');
const secondHp=focusedBoss.hp;
game.time+=700;game.update(16);
assert(focusedBoss.hp<secondHp,'a locked melee target receives repeated blows without another click');
game.combatTarget=focusedBoss;
game.enterLocation('village',15,16);
assert.equal(game.combatTarget,null,'combat focus is released when leaving location');
game.enterLocation('forest',3,40);
game.skillCooldowns={};game.lastAttack=-1000;
// Cast all druid spells against a durable enemy; preserve normal mob reward test.
const boss=game.mobs.find(m=>m.boss);
const beforeBoss=boss.hp;
Object.assign(game.player,{
 x:boss.x,y:boss.y+2,px:(boss.x+.5)*TILE,py:(boss.y+2.8)*TILE,
 direction:'up',mana:60,hp:35
});
game.time=5000;game.ready=true;
assert.equal(game.castSkill('bolt'),true,'Q casts emerald bolt');
assert(boss.hp<beforeBoss,'bolt damages enemy directly ahead');
assert(game.effects.some(e=>e.type==='bolt'),'projectile effect spawned');
const afterBoltMana=game.player.mana;
assert.equal(game.castSkill('bolt'),false,'spell cannot be recast during cooldown');
assert.equal(game.player.mana,afterBoltMana,'failed skill consumes no mana');
assert.equal(game.castSkill('roots'),true,'R creates roots');
assert(boss.rootedUntil>game.time,'nearby boss is rooted');
assert(game.effects.some(e=>e.type==='roots'),'roots effect spawned');
const oldBossPx=boss.px;
boss.step={x:boss.x+1,y:boss.y,fromX:boss.px,fromY:boss.py,elapsed:0,duration:300};
game.update(80);
assert.equal(boss.px,oldBossPx,'root immobilizes an enemy mid-stride');
boss.step=null;
assert.equal(game.castSkill('heal'),true,'F restores health');
assert(game.player.hp>35,'healing improves HP');
assert(game.effects.some(e=>e.type==='heal'),'healing particles spawned');
assert(game.player.mana>15&&game.player.mana<17,'three spells spend 44 mana');
// A single focus runs the entire fight through repeated staff strikes,
 // awarding a kill and clearing the selection after the opponent dies.
game.ready=true;
const mob=game.mobs[0];
Object.assign(game.player,{x:mob.x,y:mob.y+1,px:(mob.x+.5)*TILE,py:(mob.y+1.8)*TILE,mana:60,step:null,moving:false});
game.combatTarget=mob;game.path=[];game.keys.clear();game.lastAttack=-1000;
let meleeStrikes=0;
for(let i=0;i<8&&mob.alive;i++){
 const oldHp=mob.hp;
 game.time+=700;game.update(16);
 if(mob.hp<oldHp)meleeStrikes++;
}
assert(meleeStrikes>=3,'locked target receives multiple automatic staff attacks');
assert(!mob.alive,'one target selection continues until the foe is defeated');
assert.equal(game.combatTarget,null,'combat focus clears on victory');
assert.equal(game.path.length,0,'pursuit route clears on victory');
game.ready=false;
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

// Generated art is a real committed AVIF atlas, not emoji text.
const atlasBytes=fs.readFileSync('assets/character-atlas.avif');
assert(atlasBytes.length>7000,'illustration atlas is a nonempty image file');
assert.equal(atlasBytes.toString('ascii',4,12),'ftypavif','atlas is correctly encoded AVIF');
const atlasStyles=fs.readFileSync('style.css','utf8');
assert(atlasStyles.includes("url('assets/character-atlas.avif')"),'styles load committed art');
for(const icon of ['staff_basic','potion_red','herb_bundle','slot_plus','skill_bolt','skill_roots','skill_heal'])
 assert(atlasStyles.includes('data-icon="'+icon+'"'),'atlas includes icon '+icon);
const skillMarkup=fs.readFileSync('index.html','utf8');
for(const icon of ['skill_bolt','skill_roots','skill_heal'])
 assert(skillMarkup.includes('data-icon="'+icon+'"'),'QRF button has '+icon);
// One shared row contains Q/R/F first, followed by ten numeric key slots.
const layout=fs.readFileSync('index.html','utf8');
const startBar=layout.indexOf('<div id="hotbar"'),endBar=layout.indexOf('<div id="actions">',startBar);
const barMarkup=layout.slice(startBar,endBar);
assert(startBar>=0&&endBar>startBar,'the unified hotbar wraps both ability and numeric slots');
assert(barMarkup.indexOf('id="skillbar"')<barMarkup.indexOf('id="quickbar"'),
 'letter abilities precede numeric slots');
assert.equal((barMarkup.match(/data-skill=/g)||[]).length,3,'three letter-bound druid abilities');
assert.equal((barMarkup.match(/data-slot=/g)||[]).length,10,'all 10 numeric slots are present');
for(let i=0;i<10;i++)assert(barMarkup.includes('data-slot="'+i+'"'),'missing numeric slot '+i);
assert(barMarkup.includes('<kbd>0</kbd>'),'tenth slot visibly uses key zero');
game.ui.slot(9);
assert.equal(game.ui.toastEl.textContent,'Ячейка 0 пока свободна.','zero selects the tenth placeholder');

// Marker visibility is independent of how a route was found. It is only
// appropriate for explicitly selected ground tiles, not any interaction path.
for(const kind of ['npc','building','herb','chest','lever']){
 const scene={path:[{x:8,y:9}],target:{kind},combatTarget:null};
 assert.equal(showGroundRoute(scene),false,kind+' approach hides path dots and destination square');
}
assert.equal(showGroundRoute({path:[{x:8,y:9}],target:null,combatTarget:{alive:true}}),false,
 'combat approach is hidden even if the NPC interaction target is null');
assert.equal(showGroundRoute({path:[{x:8,y:9}],target:null,combatTarget:null}),true,
 'free movement still shows route and destination square');
assert.equal(showGroundRoute({path:[],target:null,combatTarget:null}),false,
 'standing still never shows an expired destination square');

// A drawn 18×18 destination rectangle must be produced ONLY for ground clicks.
const testOverlay=new Game(new Canvas('marker-test'));await testOverlay.start();
const markerTile={x:testOverlay.player.x+2,y:testOverlay.player.y+2};
const markerArgs=[markerTile.x*TILE+7,markerTile.y*TILE+7,18,18];
const drawMarker=()=>{
 const ctx=testOverlay.canvas.ctx;
 const previous=ctx.ops.length;
 testOverlay.renderer.draw(320);
 return ctx.ops.slice(previous).filter(op=>op.op==='strokeRect'&&
  op.args.every((v,i)=>v===markerArgs[i])).length;
};
testOverlay.path=[markerTile];testOverlay.target=null;testOverlay.combatTarget=null;
assert.equal(drawMarker(),1,'ground-click route draws exactly one destination rectangle');
for(const kind of ['npc','building','herb']){
 testOverlay.target={kind};assert.equal(drawMarker(),0,kind+' hides the destination rectangle during movement');
}
testOverlay.target=null;testOverlay.combatTarget={alive:true};
assert.equal(drawMarker(),0,'enemy pursuit hides the destination rectangle');
testOverlay.path=[];testOverlay.combatTarget=null;
assert.equal(drawMarker(),0,'arrived route has no destination rectangle');

// Asset is an actual generated 5x12 atlas, not a CSS replacement.
const npcAtlas=fs.readFileSync('assets/npc-village-48.avif');
assert(npcAtlas.length>10000,'generated 48px NPC atlas was committed');
assert.equal(npcAtlas.toString('ascii',4,12),'ftypavif','atlas is a valid AVIF container');
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
for(const g of [game,fresh,testOverlay,restoredStyle,fromForest,fromVillage,migrated])clearTimeout(g.ui.timer);
console.log('PASS: village/forest/tavern routes, NPC art, click-to-approach, quests, commerce, mobs, saved biomes and pixel rendering.');
