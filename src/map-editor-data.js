// Validated browser-local map editing and JSON world interchange.
import {createMap,TILE} from './map.js';
import {HOUSES,facadeFootprint,fountainFootprint} from './village-art.js';
export const EDITOR_STORAGE='tiholesye-editor-maps-v1';
export const LOCATIONS=['village','forest','tavern'];
export const TERRAINS=[['grass','Трава'],['path','Дорога'],['water','Вода'],['wood','Доски'],['rug','Ковёр'],['bridge','Мост']];
export const SCENERY=[['oak','Дуб'],['pine','Ель'],['birch','Берёза'],['bush','Куст'],['lamp','Фонарь'],['barrel','Бочка'],['crates','Ящики'],['anvil','Наковальня'],['logs','Брёвна'],['fence','Забор'],['crops','Грядка'],['fountain','Фонтан']];
export const BUILDINGS=Object.entries(HOUSES).map(([id,d])=>[id,d.name,d.w,d.h,(d.w-1)/2]);
export const PEOPLE=[['elder','Староста'],['smith','Кузнец'],['merchant','Торговец'],['villager','Житель'],['fisher','Рыбак']];
export const ENEMIES=[['mossling','Лесное существо'],['goblin','Гоблин'],['guardian','Страж']];
const keys=list=>new Set(list.map(t=>t[0]));
const terrainKeys=keys(TERRAINS),objectKeys=keys(SCENERY),buildingKeys=keys(BUILDINGS),npcKeys=keys(PEOPLE),enemyKeys=keys(ENEMIES);
const clean=s=>String(s??'').replace(/[<>&"']/g,'').trim().slice(0,64);
const within=(map,x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&y>=1&&x<map.width-1&&y<map.height-1;
export const insideBuilding=(b,x,y)=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h;
export function buildingTemplate(sprite,x,y,id){
 const d=BUILDINGS.find(item=>item[0]===sprite);if(!d)return null;
 return {id:id||('custom-'+Date.now().toString(36)),name:d[1],sprite,x,y,w:d[2],h:d[3],doorX:x+d[4],doorY:y+d[3]-1};
}
export function objectTemplate(sprite,x,y){
 if(!objectKeys.has(sprite))return null;
 const {w,h}=fountainFootprint(sprite);
 return {sprite,x,y,w,h,px:(x+w/2)*TILE,py:(y+h)*TILE,block:!['bush','crops'].includes(sprite),tree:['oak','pine','birch'].includes(sprite),glow:sprite==='lamp'};
}
export function rebuildBlocked(map){
 const solid=new Set(),key=(x,y)=>y*map.width+x;
 for(const b of map.buildings)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)solid.add(key(x,y));
 for(const o of map.objects)if(o.block){
  const {w,h}=fountainFootprint(o.sprite);
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)solid.add(key(o.x+dx,o.y+dy));
 }
 map.blocked=Array.from({length:map.height},(_,y)=>Array.from({length:map.width},(_,x)=>
  x===0||y===0||x===map.width-1||y===map.height-1||map.terrain[y][x]==='water'||solid.has(key(x,y))));
 for(const p of map.portals||[])if(within(map,p.x,p.y))map.blocked[p.y][p.x]=false;
 return map;
}
export function sceneSnapshot(game){
 const map=game.map;
 return {
  location:game.location,width:map.width,height:map.height,
  terrain:map.terrain.map(row=>row.slice()),
  buildings:map.buildings.map(b=>({id:b.id,name:b.name,sprite:b.sprite,x:b.x,y:b.y,w:b.w,h:b.h,doorX:b.doorX,doorY:b.doorY})),
  objects:map.objects.map(o=>({sprite:o.sprite,x:o.x,y:o.y})),
  portals:(map.portals||[]).map(p=>({x:p.x,y:p.y,to:p.to,spawn:{x:p.spawn.x,y:p.spawn.y}})),
  npcs:game.npcs.map(n=>({id:n.id,name:n.name,sprite:n.sprite,x:n.x,y:n.y})),
  mobs:game.mobs.map(e=>({sprite:e.sprite,x:e.homeX,y:e.homeY})),
  herbs:game.herbs.map(h=>({x:h.x,y:h.y}))
 };
}
export function normalizeSnapshot(id,raw){
 if(!LOCATIONS.includes(id)||!raw||typeof raw!=='object')return null;
 const m=createMap(id),out={location:id,width:m.width,height:m.height,terrain:[],buildings:[],objects:[],portals:[],npcs:[],mobs:[],herbs:[]};
 if(raw.location!==id||raw.width!==m.width||raw.height!==m.height)return null;
 if(!Array.isArray(raw.terrain)||raw.terrain.length!==m.height||!raw.terrain.every(row=>Array.isArray(row)&&row.length===m.width&&row.every(t=>terrainKeys.has(t))))return null;
 out.terrain=raw.terrain.map(row=>row.slice());
 const limits={buildings:300,objects:8000,portals:40,npcs:300,mobs:400,herbs:500};
 for(const [field,limit]of Object.entries(limits))if(!Array.isArray(raw[field])||raw[field].length>limit)return null;
 const ids=new Set();
 for(const b of raw.buildings){
  if(!b||!buildingKeys.has(b.sprite)||!within(m,b.x,b.y))return null;
  const d=BUILDINGS.find(t=>t[0]===b.sprite);
  // Old editor snapshots used even-width houses. Keep the original door
  // column while migrating each facade to an odd-width footprint.
  const x=Number.isInteger(b.doorX)&&b.w!==d[2] ? b.doorX-d[4] : b.x;
  if(!within(m,x,b.y)||x+d[2]>=m.width||b.y+d[3]>=m.height)return null;
  const key=clean(b.id);if(!key||ids.has(key))return null;ids.add(key);
  out.buildings.push({...buildingTemplate(b.sprite,x,b.y,key),name:clean(b.name)||d[1]});
 }
 for(const o of raw.objects){
  if(!o||!objectKeys.has(o.sprite)||!within(m,o.x,o.y))return null;
  const {w,h}=fountainFootprint(o.sprite);
  if(o.x+w>=m.width||o.y+h>=m.height)return null;
  out.objects.push(objectTemplate(o.sprite,o.x,o.y));
 }
 for(const p of raw.portals){
  if(!p||!within(m,p.x,p.y)||!LOCATIONS.includes(p.to)||!p.spawn)return null;
  if(!within(createMap(p.to),p.spawn.x,p.spawn.y))return null;
  out.portals.push({x:p.x,y:p.y,to:p.to,spawn:{x:p.spawn.x,y:p.spawn.y}});
 }
 const actorIds=new Set();
 for(const n of raw.npcs){
  if(!n||!npcKeys.has(n.sprite)||!within(m,n.x,n.y))return null;
  const key=clean(n.id);if(!key||actorIds.has(key))return null;actorIds.add(key);
  out.npcs.push({id:key,name:clean(n.name)||'Житель',sprite:n.sprite,x:n.x,y:n.y});
 }
 for(const e of raw.mobs){
  if(!e||!enemyKeys.has(e.sprite)||!within(m,e.x,e.y))return null;
  out.mobs.push({sprite:e.sprite,x:e.x,y:e.y});
 }
 for(const h of raw.herbs){if(!h||!within(m,h.x,h.y))return null;out.herbs.push({x:h.x,y:h.y});}
 // Reject invalid overlap and water under objects, actors and entrances.
 const blocked=new Set(),occupied=new Set(),cell=(x,y)=>y*m.width+x;
 for(const b of out.buildings)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
  const k=cell(x,y);if(blocked.has(k)||out.terrain[y][x]==='water')return null;blocked.add(k);
 }
 for(const o of out.objects)if(o.block){
  const {w,h}=fountainFootprint(o.sprite);
  for(let y=o.y;y<o.y+h;y++)for(let x=o.x;x<o.x+w;x++){
   const k=cell(x,y);if(blocked.has(k)||out.terrain[y][x]==='water')return null;blocked.add(k);
  }
 }
 for(const p of out.portals){
  const k=cell(p.x,p.y);if(blocked.has(k)||out.terrain[p.y][p.x]==='water')return null;blocked.add(k);
 }
 for(const e of [...out.npcs,...out.mobs,...out.herbs]){
  const k=cell(e.x,e.y);if(blocked.has(k)||occupied.has(k)||out.terrain[e.y][e.x]==='water')return null;occupied.add(k);
 }
 return out;
}
export function hydratedMap(id,raw){
 const base=createMap(id),data=normalizeSnapshot(id,raw);
 if(!data)return base;
 base.terrain=data.terrain;base.objects=data.objects;base.buildings=data.buildings;base.portals=data.portals;
 return rebuildBlocked(base);
}
export function readEditedMaps(storage=globalThis.localStorage){
 try{
  const value=JSON.parse(storage.getItem(EDITOR_STORAGE)||'{}');
  if(value?.version!==1||!value.maps)return {};
  return Object.fromEntries(LOCATIONS.flatMap(id=>{const data=normalizeSnapshot(id,value.maps[id]);return data?[[id,data]]:[];}));
 }catch{return {};}
}
export function writeEditedMaps(maps,storage=globalThis.localStorage){
 const valid={};
 for(const id of LOCATIONS)if(maps[id]){
  const data=normalizeSnapshot(id,maps[id]);if(!data)throw Error('Ошибка данных карты: '+id);valid[id]=data;
 }
 storage.setItem(EDITOR_STORAGE,JSON.stringify({version:1,maps:valid}));return valid;
}
export function exportEditedMaps(maps){return JSON.stringify({format:'tiholesye-world',version:1,maps},null,2);}
export function importEditedMaps(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(!data||data.format!=='tiholesye-world'||data.version!==1||!data.maps||typeof data.maps!=='object')throw Error('Неверный формат мира.');
 const out={};
 for(const id of LOCATIONS)if(data.maps[id]!==undefined){
  const scene=normalizeSnapshot(id,data.maps[id]);if(!scene)throw Error('Повреждена карта: '+id);out[id]=scene;
 }
 if(!Object.keys(out).length)throw Error('В файле нет карт.');
 return out;
}
