import {TILE,createMap} from './map.js';
import {LOCATIONS,TERRAINS,SCENERY,BUILDINGS,PEOPLE,ENEMIES,buildingTemplate,objectTemplate,
 insideBuilding,sceneSnapshot,normalizeSnapshot,rebuildBlocked,writeEditedMaps,
 exportEditedMaps,importEditedMaps} from './map-editor-data.js';

const htmlEscape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const finite=n=>Number.isInteger(n);
const kinds={terrain:'Тайлы',object:'Природа и декор',building:'Здания',npc:'NPC',mob:'Враги',herb:'Ресурсы',portal:'Переходы'};
const names={village:'Деревня',forest:'Великий лес',tavern:'Таверна'};
const snap=value=>JSON.parse(JSON.stringify(value));
export class MapEditor{
 constructor(game){
  this.g=game;this.active=false;this.tool='select';this.kind='terrain';this.brush='path';
  this.selected=null;this.hover=null;this.drag=null;this.stroke=null;this.undoStack=[];this.redoStack=[];
  this.camera={x:0,y:0};this.seq=0;this.status='';this.panel=document.getElementById('editorPanel');
  this.panel.addEventListener('click',event=>this.handleButton(event));
  this.panel.addEventListener('change',event=>this.handleChange(event));
 }
 open(){
  if(this.active)return;
  if(this.g.ui.open)this.g.ui.close();
  this.g.buildMode=null;this.g.stopMovement();
  this.active=true;this.camera={...this.g.camera};this.hover=null;this.selected=null;
  this.drag=null;this.stroke=null;this.undoStack=[];this.redoStack=[];this.panel.hidden=false;
  this.renderPanel();
 }
 close(){
  if(!this.active)return;
  if(this.stroke)this.finishStroke();
  this.active=false;this.drag=null;this.selected=null;this.panel.hidden=true;
  this.g.save();this.g.canvas.focus({preventScroll:true});
 }
 message(text){this.status=text;const el=this.panel.querySelector('#editorStatus');if(el)el.textContent=text;}
 palette(){
  if(this.kind==='terrain')return TERRAINS;
  if(this.kind==='object')return SCENERY;
  if(this.kind==='building')return BUILDINGS.map(([id,name])=>[id,name]);
  if(this.kind==='npc')return PEOPLE;
  if(this.kind==='mob')return ENEMIES;
  if(this.kind==='herb')return [['herb','Лесная трава']];
  return LOCATIONS.filter(id=>id!==this.g.location).map(id=>[id,'В '+names[id]]);
 }
 renderPanel(){
  if(!this.active)return;
  const g=this.g;
  const selection=this.resolveSelection(),description=selection?
    htmlEscape(this.selectionLabel(selection)):this.hover?'Клетка '+this.hover.x+', '+this.hover.y:'Выберите объект на карте';
  const layerMenu=Object.entries(kinds).map(([key,label])=>
   '<button type="button" class="editor-tab'+(this.kind===key?' active':'')+'" data-layer="'+key+'">'+label+'</button>').join('');
  const palette=this.palette().map(([id,name])=>
   '<button type="button" class="editor-choice'+(this.brush===id?' active':'')+'" data-palette="'+htmlEscape(id)+'">'+htmlEscape(name)+'</button>').join('');
  const tools=[['select','Выбрать'],['move','Переместить'],['erase','Удалить'],['pan','Камера']].map(([id,label])=>
   '<button type="button" class="editor-tool'+(this.tool===id?' active':'')+'" data-tool="'+id+'">'+label+'</button>').join('');
  this.panel.innerHTML=
   '<header class="editor-head"><strong>🛠️ Редактор Тихолесья</strong><button type="button" data-editor="close" aria-label="Закрыть редактор">×</button></header>'+
   '<label class="editor-label">Локация<select id="editorLocation">'+LOCATIONS.map(id=>
    '<option value="'+id+'"'+(g.location===id?' selected':'')+'>'+names[id]+'</option>').join('')+'</select></label>'+
   '<div class="editor-tools">'+tools+'</div>'+
   '<div class="editor-tabs">'+layerMenu+'</div>'+
   '<div class="editor-palette">'+palette+'</div>'+
   '<div class="editor-inspector"><strong>Выделение</strong><p id="editorSelection">'+description+'</p>'+
   this.inspectorFields(selection)+
   '<div class="editor-inline"><button type="button" data-editor="delete" '+(!selection?'disabled':'')+'>Удалить</button>'+
   '<button type="button" data-editor="move" '+(!selection?'disabled':'')+'>Переместить</button></div></div>'+
   '<div class="editor-inline"><button type="button" data-editor="undo" '+(!this.undoStack.length?'disabled':'')+'>↶ Отменить</button>'+
   '<button type="button" data-editor="redo" '+(!this.redoStack.length?'disabled':'')+'>↷ Повторить</button></div>'+
   '<div class="editor-inline"><button type="button" data-editor="export">↓ Экспорт JSON</button>'+
   '<button type="button" data-editor="import">↑ Импорт JSON</button></div>'+
   '<div class="editor-inline"><button type="button" data-editor="reset">Сбросить локацию</button>'+
   '<button type="button" data-editor="close">▶ Играть</button></div>'+
   '<input hidden type="file" accept=".json,application/json" id="editorImport">'+
   '<p id="editorStatus" aria-live="polite">'+htmlEscape(this.status||'ЛКМ/касание: редактировать · ПКМ: двигать карту · WASD: камера · F2: выйти')+'</p>'+
   '<p class="editor-tip">Для рисования выберите слой и элемент, затем проведите по клеткам. Для переноса выделите объект, нажмите «Переместить» и укажите новое место или перетащите его. Ctrl+Z / Ctrl+Y — история.</p>';
 }
 selectionLabel(sel){
  const value=sel.value;
  const label=sel.kind==='npc'?value.name:
   sel.kind==='building'?value.name:
   sel.kind==='mob'?ENEMIES.find(a=>a[0]===value.sprite)?.[1]:
   sel.kind==='object'?SCENERY.find(a=>a[0]===value.sprite)?.[1]:
   sel.kind==='portal'?'Переход в '+names[value.to]:
   'Лесная трава';
  return (label||sel.kind)+' · '+value.x+', '+value.y;
 }
 inspectorFields(sel){
  if(!sel)return '<p class="editor-tip">Режим «Выбрать»: нажмите на NPC, дом, объект, траву или переход.</p>';
  const item=sel.value;
  let out='';
  if(sel.kind==='npc'||sel.kind==='building'){
   out+='<label class="editor-label">Имя<input id="editorName" maxlength="56" value="'+htmlEscape(item.name)+'"></label>';
  }
  if(sel.kind==='npc'){
   out+='<label class="editor-label">Внешний вид<select id="editorSprite">'+PEOPLE.map(([id,label])=>
    '<option value="'+id+'"'+(item.sprite===id?' selected':'')+'>'+label+'</option>').join('')+'</select></label>';
  }
  if(sel.kind==='portal'){
   out+='<label class="editor-label">Куда<select id="editorDestination">'+LOCATIONS.filter(id=>id!==this.g.location).map(id=>
    '<option value="'+id+'"'+(item.to===id?' selected':'')+'>'+names[id]+'</option>').join('')+'</select></label>';
   out+='<div class="editor-inline"><label>Точка X<input id="editorSpawnX" type="number" min="1" max="99" value="'+item.spawn.x+'"></label>'+
    '<label>Точка Y<input id="editorSpawnY" type="number" min="1" max="79" value="'+item.spawn.y+'"></label></div>';
  }
  if(out)out+='<button type="button" data-editor="properties">Сохранить свойства</button>';
  return out;
 }
 handleButton(e){
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.layer){
   this.kind=button.dataset.layer;this.brush=this.palette()[0]?.[0]||null;
   this.tool='place';this.selected=null;this.renderPanel();return;
  }
  if(button.dataset.palette){
   this.brush=button.dataset.palette;this.tool=this.kind==='terrain'?'paint':'place';
   this.renderPanel();return;
  }
  if(button.dataset.tool){
   this.tool=button.dataset.tool;this.renderPanel();return;
  }
  const action=button.dataset.editor;
  if(action==='close')this.close();
  if(action==='undo')this.undo();
  if(action==='redo')this.redo();
  if(action==='move'){this.tool='move';this.renderPanel();}
  if(action==='delete')this.deleteSelection();
  if(action==='reset')this.reset();
  if(action==='export')this.export();
  if(action==='import')this.panel.querySelector('#editorImport').click();
  if(action==='properties')this.updateProperties();
 }
 async handleChange(e){
  if(e.target.id==='editorLocation'){this.switchLocation(e.target.value);return;}
  if(e.target.id==='editorImport'){
   const file=e.target.files?.[0];if(!file)return;
   try{
    if(file.size>3*1024*1024)throw Error('Файл слишком большой (максимум 3 МБ).');
    const maps=importEditedMaps(await file.text());
    const merged={...this.g.worldMaps,...maps};
    writeEditedMaps(merged);
    this.g.worldMaps=merged;this.undoStack=[];this.redoStack=[];
    this.g.loadEditedScene();this.selected=null;this.refreshMap();
    this.renderPanel();this.message('Мир импортирован: '+Object.keys(maps).map(id=>names[id]).join(', '));
   }catch(error){this.message('Импорт отменён: '+error.message);}
  }
 }
 switchLocation(location){
  if(!LOCATIONS.includes(location)||location===this.g.location)return;
  if(this.stroke)this.finishStroke();
  this.selected=null;this.undoStack=[];this.redoStack=[];
  const spawn=location==='village'?{x:30,y:24}:location==='forest'?{x:3,y:40}:{x:12,y:14};
  this.g.enterLocation(location,spawn.x,spawn.y);
  this.camera={...this.g.camera};this.renderPanel();
 }
 pick(x,y){
  const g=this.g;
  const groups=[
   ['npc',g.npcs],['mob',g.mobs],['herb',g.herbs],['portal',g.map.portals],
   ['object',g.map.objects],['building',g.map.buildings]];
  for(const [kind,items]of groups){
   const index=items.findIndex(v=>kind==='building'?insideBuilding(v,x,y):
    (kind==='mob'?v.homeX:v.x)===x&&(kind==='mob'?v.homeY:v.y)===y);
   if(index!==-1)return {kind,index,value:items[index]};
  }
  return null;
 }
 resolveSelection(){
  if(!this.selected)return null;
  const {kind,index}=this.selected;
  const groups={npc:this.g.npcs,mob:this.g.mobs,herb:this.g.herbs,portal:this.g.map.portals,object:this.g.map.objects,building:this.g.map.buildings};
  const value=groups[kind]?.[index];
  if(!value){this.selected=null;return null;}
  return {kind,index,value};
 }
 select(x,y){const found=this.pick(x,y);this.selected=found?{kind:found.kind,index:found.index}:null;this.renderPanel();return found;}
 coords(e){
  const rect=this.g.canvas.getBoundingClientRect();
  const wx=(e.clientX-rect.left)/rect.width*this.g.canvas.width+this.g.camera.x;
  const wy=(e.clientY-rect.top)/rect.height*this.g.canvas.height+this.g.camera.y;
  return {x:Math.floor(wx/TILE),y:Math.floor(wy/TILE)};
 }
 validCell(x,y){return finite(x)&&finite(y)&&x>0&&y>0&&x<this.g.map.width-1&&y<this.g.map.height-1;}
 actorAt(x,y,exclude){
  if(this.g.player.x===x&&this.g.player.y===y)return true;
  return [...this.g.npcs,...this.g.mobs,...this.g.herbs].some(e=>e!==exclude&&(e.kind==='mob'?e.homeX===x&&e.homeY===y:e.x===x&&e.y===y));
 }
 solidAt(x,y,exclude){
  const m=this.g.map;
  return m.buildings.some(b=>b!==exclude&&insideBuilding(b,x,y))||
   m.objects.some(o=>o!==exclude&&o.x===x&&o.y===y)||
   m.portals.some(p=>p!==exclude&&p.x===x&&p.y===y);
 }
 canOccupy(x,y,exclude){
  const m=this.g.map;
  return this.validCell(x,y)&&m.terrain[y][x]!=='water'&&
   !this.solidAt(x,y,exclude)&&!this.actorAt(x,y,exclude);
 }
 canPlaceBuilding(b,exclude){
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(!this.canOccupy(x,y,exclude))return false;
  return this.canOccupy(b.doorX,b.doorY+1,exclude);
 }
 beginChange(){
  if(!this.stroke)this.stroke={before:sceneSnapshot(this.g),changed:false};
 }
 applyAt(x,y){
  const g=this.g,map=g.map;
  if(!this.validCell(x,y))return false;
  if(this.tool==='erase'){
   const found=this.pick(x,y);if(!found)return false;
   this.beginChange();
   const list={npc:g.npcs,mob:g.mobs,herb:g.herbs,portal:map.portals,object:map.objects,building:map.buildings}[found.kind];
   list.splice(found.index,1);this.selected=null;this.stroke.changed=true;return true;
  }
  if(this.tool==='paint'&&this.kind==='terrain'){
   if(map.terrain[y][x]===this.brush)return false;
   if(this.brush==='water'&&(this.solidAt(x,y)||this.actorAt(x,y)))return false;
   this.beginChange();map.terrain[y][x]=this.brush;this.stroke.changed=true;return true;
  }
  if(this.tool!=='place')return false;
  if(this.kind==='terrain'){this.tool='paint';return this.applyAt(x,y);}
  if(this.kind==='building'){
   const id='custom-'+Date.now().toString(36)+'-'+(++this.seq);
   const b=buildingTemplate(this.brush,x,y,id);
   if(!b||!this.canPlaceBuilding(b))return false;
   this.beginChange();map.buildings.push(b);
   this.selected={kind:'building',index:map.buildings.length-1};
  }else if(this.kind==='object'){
   if(!this.canOccupy(x,y))return false;
   const object=objectTemplate(this.brush,x,y);if(!object)return false;
   this.beginChange();map.objects.push(object);
   this.selected={kind:'object',index:map.objects.length-1};
  }else if(this.kind==='npc'){
   if(!this.canOccupy(x,y))return false;
   const item=PEOPLE.find(t=>t[0]===this.brush);if(!item)return false;
   this.beginChange();
   const npc={id:'custom-npc-'+Date.now().toString(36)+'-'+(++this.seq),name:item[1],sprite:item[0],kind:'npc',x,y,
    px:(x+.5)*TILE,py:(y+.8)*TILE,direction:'down',step:null,moving:false,attackUntil:0};
   g.npcs.push(npc);this.selected={kind:'npc',index:g.npcs.length-1};
  }else if(this.kind==='mob'){
   if(g.location!=='forest'||!this.canOccupy(x,y))return false;
   if(!ENEMIES.some(t=>t[0]===this.brush))return false;
   this.beginChange();g.mobs.push(g.makeMob(x,y,this.brush));
   this.selected={kind:'mob',index:g.mobs.length-1};
  }else if(this.kind==='herb'){
   if(!this.canOccupy(x,y))return false;
   this.beginChange();g.herbs.push({kind:'herb',x,y,px:(x+.5)*TILE,py:(y+.8)*TILE,collected:false});
   this.selected={kind:'herb',index:g.herbs.length-1};
  }else if(this.kind==='portal'){
   if(!this.canOccupy(x,y))return false;
   const to=this.brush,spawn=to==='forest'?{x:3,y:40}:to==='tavern'?{x:12,y:14}:{x:30,y:24};
   if(!LOCATIONS.includes(to)||to===g.location)return false;
   this.beginChange();map.portals.push({x,y,to,spawn});
   this.selected={kind:'portal',index:map.portals.length-1};
  }else return false;
  this.stroke.changed=true;return true;
 }
 moveTo(x,y){
  const s=this.resolveSelection();
  if(!s||!this.validCell(x,y))return false;
  const v=s.value,oldX=s.kind==='mob'?v.homeX:v.x,oldY=s.kind==='mob'?v.homeY:v.y;
  if(x===oldX&&y===oldY)return false;
  if(s.kind==='building'){
   const next=buildingTemplate(v.sprite,x,y,v.id);
   if(!next||!this.canPlaceBuilding(next,v))return false;
   this.beginChange();Object.assign(v,{x,y,doorX:next.doorX,doorY:next.doorY});
  }else if(!this.canOccupy(x,y,v))return false;
  else{
   this.beginChange();v.x=x;v.y=y;
   if(s.kind==='mob'){v.homeX=x;v.homeY=y;v.step=null;v.nextThink=0;}
   if(s.kind==='npc'||s.kind==='herb'||s.kind==='mob'){
    v.px=(x+.5)*TILE;v.py=(y+.8)*TILE;v.step=null;
   }
   if(s.kind==='object'){v.px=(x+.5)*TILE;v.py=(y+1)*TILE;}
  }
  this.stroke.changed=true;return true;
 }
 pointerDown(e){
  if(!this.active)return false;
  if(e.button===2||this.tool==='pan'){
   this.drag={mode:'pan',fromX:e.clientX,fromY:e.clientY,camera:{...this.camera}};
   return true;
  }
  if(e.button!==0)return true;
  const {x,y}=this.coords(e);this.hover={x,y};
  if(this.tool==='select'){this.select(x,y);return true;}
  if(this.tool==='move'){
   const hit=this.pick(x,y),s=this.resolveSelection();
   if(s&&!hit){this.moveTo(x,y);this.finishStroke();this.renderPanel();return true;}
   if(hit){this.selected={kind:hit.kind,index:hit.index};this.drag={mode:'move',fromX:x,fromY:y};this.renderPanel();}
   return true;
  }
  if(['paint','place','erase'].includes(this.tool)){
   this.stroke={before:sceneSnapshot(this.g),changed:false};
   this.applyAt(x,y);
   if(this.tool==='paint'||this.tool==='erase')this.drag={mode:'stroke',lastX:x,lastY:y};
   else{this.finishStroke();this.renderPanel();}
  }
  return true;
 }
 pointerMove(e){
  if(!this.active)return;
  const {x,y}=this.coords(e);this.hover={x,y};
  if(!this.drag)return;
  if(this.drag.mode==='pan'){
   const sx=this.g.canvas.width/this.g.canvas.getBoundingClientRect().width;
   const sy=this.g.canvas.height/this.g.canvas.getBoundingClientRect().height;
   this.camera.x=this.drag.camera.x-(e.clientX-this.drag.fromX)*sx;
   this.camera.y=this.drag.camera.y-(e.clientY-this.drag.fromY)*sy;
  }
  if(this.drag.mode==='stroke'){
   const {lastX,lastY}=this.drag,steps=Math.max(Math.abs(x-lastX),Math.abs(y-lastY));
   if(steps>0&&steps<256)for(let n=1;n<=steps;n++){
    this.applyAt(Math.round(lastX+(x-lastX)*n/steps),Math.round(lastY+(y-lastY)*n/steps));
   }
   this.drag.lastX=x;this.drag.lastY=y;
  }
 }
 pointerUp(e){
  if(!this.active||!this.drag)return;
  if(this.drag.mode==='move'){
   const {x,y}=this.coords(e);this.moveTo(x,y);this.finishStroke();this.renderPanel();
  }else if(this.drag.mode==='stroke'){this.finishStroke();this.renderPanel();}
  this.drag=null;
 }
 finishStroke(){
  if(!this.stroke)return;
  const changed=this.stroke.changed;
  if(changed){
   const before=this.stroke.before,after=sceneSnapshot(this.g);
   if(!normalizeSnapshot(this.g.location,after)){
    this.g.restoreEditedScene(before);this.message('Недопустимое пересечение объектов. Действие отменено.');
   }else if(JSON.stringify(before)!==JSON.stringify(after)){
    this.undoStack.push(before);if(this.undoStack.length>25)this.undoStack.shift();
    this.redoStack=[];this.persist();
    this.refreshMap();
   }
  }
  this.stroke=null;
 }
 refreshMap(){
  rebuildBlocked(this.g.map);
  if(this.g.renderer){this.g.renderer.bakeGround();this.g.renderer.bakeMinimap();}
 }
 persist(){
  const current=sceneSnapshot(this.g);
  this.g.worldMaps[this.g.location]=current;
  try{writeEditedMaps(this.g.worldMaps);this.message('Изменения сохранены в этом браузере.');}
  catch(e){this.message('Не удалось сохранить в браузере: '+e.message);}
 }
 restore(snapData){
  this.g.restoreEditedScene(snapData);this.selected=null;this.refreshMap();this.persist();this.renderPanel();
 }
 undo(){
  if(this.stroke)this.finishStroke();
  if(!this.undoStack.length)return;
  this.redoStack.push(sceneSnapshot(this.g));this.restore(this.undoStack.pop());
 }
 redo(){
  if(!this.redoStack.length)return;
  this.undoStack.push(sceneSnapshot(this.g));this.restore(this.redoStack.pop());
 }
 deleteSelection(){
  const s=this.resolveSelection();if(!s)return;
  this.stroke={before:sceneSnapshot(this.g),changed:false};
  const groups={npc:this.g.npcs,mob:this.g.mobs,herb:this.g.herbs,
   portal:this.g.map.portals,object:this.g.map.objects,building:this.g.map.buildings};
  groups[s.kind].splice(s.index,1);this.selected=null;this.stroke.changed=true;
  this.finishStroke();this.renderPanel();
 }
 updateProperties(){
  const s=this.resolveSelection();if(!s)return;
  this.stroke={before:sceneSnapshot(this.g),changed:false};
  const v=s.value;
  if(s.kind==='npc'||s.kind==='building'){
   const name=this.panel.querySelector('#editorName').value.trim().replace(/[<>&"']/g,'').slice(0,56);
   if(name){v.name=name;this.stroke.changed=true;}
  }
  if(s.kind==='npc'){
   const sprite=this.panel.querySelector('#editorSprite').value;
   if(PEOPLE.some(v=>v[0]===sprite)){v.sprite=sprite;this.stroke.changed=true;}
  }
  if(s.kind==='portal'){
   const to=this.panel.querySelector('#editorDestination').value,
    x=Number(this.panel.querySelector('#editorSpawnX').value),
    y=Number(this.panel.querySelector('#editorSpawnY').value);
   const target=createMap(to);
   if(to!==this.g.location&&x>0&&y>0&&x<target.width-1&&y<target.height-1&&finite(x)&&finite(y)){
    v.to=to;v.spawn={x,y};this.stroke.changed=true;
   }else this.message('Точка выхода вне допустимых границ.');
  }
  this.finishStroke();this.renderPanel();
 }
 reset(){
  if(typeof window.confirm==='function'&&!window.confirm('Вернуть исходную карту этой локации? Изменения можно отменить.'))return;
  this.undoStack.push(sceneSnapshot(this.g));this.redoStack=[];
  delete this.g.worldMaps[this.g.location];
  this.g.restoreEditedScene(null);this.selected=null;
  this.refreshMap();
  try{writeEditedMaps(this.g.worldMaps);this.message('Локация восстановлена из оригинала.');}catch(e){this.message(e.message);}
  this.renderPanel();
 }
 export(){
  const maps={...this.g.worldMaps,[this.g.location]:sceneSnapshot(this.g)};
  try{
   const data=exportEditedMaps(maps);
   const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='tiholesye-world.json';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);this.message('Экспортированы текущая и изменённые локации.');
  }catch(e){this.message(e.message);}
 }
 onKey(e){
  if(!this.active)return false;
  if(e.code==='Escape'||e.code==='F2'){e.preventDefault();this.close();return true;}
  if(e.ctrlKey&&(e.code==='KeyZ'||e.code==='KeyY')){
   e.preventDefault();if(e.code==='KeyY'||e.shiftKey)this.redo();else this.undo();return true;
  }
  const tag=document.activeElement?.tagName;
  if(['INPUT','SELECT','TEXTAREA'].includes(tag))return true;
  if(e.code==='Delete'||e.code==='Backspace'){e.preventDefault();this.deleteSelection();return true;}
  const directions={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],
   KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
  if(directions[e.code]){
   e.preventDefault();const [dx,dy]=directions[e.code];this.camera.x+=dx*64;this.camera.y+=dy*64;
   return true;
  }
  return true;
 }
 drawOverlay(c){
  if(!this.active)return;
  const g=this.g,w=g.canvas.width,h=g.canvas.height;
  const left=Math.max(0,Math.floor(g.camera.x/TILE)),right=Math.min(g.map.width,Math.ceil((g.camera.x+w)/TILE)),
   top=Math.max(0,Math.floor(g.camera.y/TILE)),bottom=Math.min(g.map.height,Math.ceil((g.camera.y+h)/TILE));
  c.save();c.lineWidth=1;c.strokeStyle='rgba(255,242,179,.23)';
  for(let x=left;x<=right;x++)c.strokeRect(x*TILE,top*TILE,0,(bottom-top)*TILE);
  for(let y=top;y<=bottom;y++)c.strokeRect(left*TILE,y*TILE,(right-left)*TILE,0);
  for(const portal of g.map.portals){
   c.strokeStyle='#4ee8c4';c.lineWidth=2;c.strokeRect(portal.x*TILE+2,portal.y*TILE+2,28,28);
  }
  const s=this.resolveSelection();
  if(s){
   const v=s.value,x=(s.kind==='mob'?v.homeX:v.x)*TILE,y=(s.kind==='mob'?v.homeY:v.y)*TILE;
   c.strokeStyle='#f7db6e';c.lineWidth=3;
   c.strokeRect(x,y,(s.kind==='building'?v.w:1)*TILE,(s.kind==='building'?v.h:1)*TILE);
  }
  if(this.hover&&this.validCell(this.hover.x,this.hover.y)){
   c.strokeStyle='#ffffff';c.lineWidth=2;c.strokeRect(this.hover.x*TILE+1,this.hover.y*TILE+1,TILE-2,TILE-2);
  }
  c.restore();
 }
}
