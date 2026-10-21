import assert from 'node:assert/strict';
import {createMap,TILE,isBlocked} from '../src/map.js';
import {MapEditor} from '../src/map-editor.js';
import {sceneSnapshot,normalizeSnapshot,hydratedMap,readEditedMaps,importEditedMaps,exportEditedMaps,
 writeEditedMaps,EDITOR_STORAGE,rebuildBlocked} from '../src/map-editor-data.js';

const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
globalThis.window={confirm:()=>true};
const panel={hidden:true,innerHTML:'',classList:{toggle(){},remove(){}},addEventListener(){},querySelector(){return {textContent:'',value:'Новое имя'};}};
globalThis.document={getElementById:()=>panel,activeElement:null};
const g={
 location:'village',map:createMap('village'),worldMaps:{},
 npcs:[],mobs:[],herbs:[],player:{x:30,y:24,px:30.5*TILE,py:24.8*TILE},
 camera:{x:0,y:0},path:[],target:null,effects:[],
 renderer:{bakeGround(){},bakeMinimap(){}},ready:false,
 canvas:{width:1280,height:720,focus(){},getBoundingClientRect(){return {left:0,top:0,width:1280,height:720};}},
 ui:{open:false,close(){}},save(){},stopMovement(){},makeMob(x,y,sprite){
  return {kind:'mob',sprite,x,y,homeX:x,homeY:y,px:(x+.5)*TILE,py:(y+.8)*TILE};
 },
 restoreEditedScene(snap){
  if(snap)this.worldMaps[this.location]=snap;else delete this.worldMaps[this.location];
  this.map=snap?hydratedMap(this.location,snap):createMap(this.location);
  this.npcs=(snap?.npcs||[]).map(n=>({...n,kind:'npc',px:(n.x+.5)*TILE,py:(n.y+.8)*TILE}));
  this.mobs=(snap?.mobs||[]).map(n=>this.makeMob(n.x,n.y,n.sprite));
  this.herbs=(snap?.herbs||[]).map(n=>({...n,kind:'herb',px:(n.x+.5)*TILE,py:(n.y+.8)*TILE}));
 }
};
const editor=new MapEditor(g);g.editor=editor;editor.open();
assert.equal(editor.active,true);
assert.equal(panel.hidden,false);
assert(normalizeSnapshot('village',sceneSnapshot(g)));
const apply=(kind,brush,x,y)=>{editor.kind=kind;editor.brush=brush;editor.tool=kind==='terrain'?'paint':'place';editor.stroke={before:sceneSnapshot(g),changed:false};const ok=editor.applyAt(x,y);editor.finishStroke();return ok;};
const empty=(()=>{for(let y=21;y<28;y++)for(let x=23;x<28;x++)if(editor.canOccupy(x,y))return {x,y};throw Error('no valid cell');})();
assert(apply('npc','villager',empty.x,empty.y),'place custom villager');
assert.equal(g.npcs.length,1);
assert(g.npcs[0].id.startsWith('custom-npc-'));
assert.equal(normalizeSnapshot('village',sceneSnapshot(g)).npcs.length,1);
assert(saved.has(EDITOR_STORAGE),'autosaved JSON');
const npc={...g.npcs[0]};
editor.selected={kind:'npc',index:0};
let to=null;
for(let y=21;y<29;y++)for(let x=23;x<29;x++)if(editor.canOccupy(x,y)&&!to)to={x,y};
assert(to);
assert(editor.moveTo(to.x,to.y),'move custom villager');
editor.finishStroke();
assert.deepEqual([g.npcs[0].x,g.npcs[0].y],[to.x,to.y]);
editor.undo();assert.deepEqual([g.npcs[0].x,g.npcs[0].y],[npc.x,npc.y]);
editor.redo();assert.deepEqual([g.npcs[0].x,g.npcs[0].y],[to.x,to.y]);
const tile={x:25,y:27},before=g.map.terrain[tile.y][tile.x];
assert(apply('terrain','water',tile.x,tile.y),'paint water');
assert.equal(g.map.terrain[tile.y][tile.x],'water');
assert(isBlocked(g.map,tile.x,tile.y),'painted water blocks movement');
editor.undo();assert.equal(g.map.terrain[tile.y][tile.x],before);
assert(apply('terrain','path',tile.x,tile.y)||before==='path','paint road');
const fixture=JSON.stringify(sceneSnapshot(g));
const world=importEditedMaps(exportEditedMaps({village:sceneSnapshot(g)}));
assert.deepEqual(world.village,normalizeSnapshot('village',sceneSnapshot(g)));
assert.deepEqual(readEditedMaps().village,normalizeSnapshot('village',sceneSnapshot(g)));
const invalid=JSON.parse(exportEditedMaps({village:sceneSnapshot(g)}));
invalid.maps.village.width=900000;assert.throws(()=>importEditedMaps(invalid),/Повреждена карта/);
const invalid2=JSON.parse(fixture);invalid2.objects.push({sprite:'unknown',x:2,y:2});
assert.equal(normalizeSnapshot('village',invalid2),null);
assert.equal(editor.canOccupy(30,24),false,'cannot place a tree on hero');
const building=g.map.buildings[0];
editor.selected={kind:'building',index:0};
assert(editor.resolveSelection()?.value===building,'select house');
editor.deleteSelection();assert.equal(g.map.buildings.length,7);
editor.undo();assert.equal(g.map.buildings.length,8);
editor.tool='erase';editor.stroke={before:sceneSnapshot(g),changed:false};
assert(editor.applyAt(g.npcs[0].x,g.npcs[0].y),'eraser removes resident');
editor.finishStroke();assert.equal(g.npcs.length,0);
editor.undo();assert.equal(g.npcs.length,1);
editor.close();assert.equal(editor.active,false);
assert.equal(panel.hidden,true);
console.log('PASS: persistent map editor, NPC place/move/erase, brush, collisions, undo/redo, JSON validation.');
