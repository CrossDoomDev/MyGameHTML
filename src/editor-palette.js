// Real in-game atlas previews for the map editor, not decorative icons.
// Terrain is rendered with the exact same tile painter as the active world.
import {TILE} from './map.js';
import {Renderer} from './renderer.js';
import {buildingTemplate} from './map-editor-data.js';
import {buildingPlacement,sceneryPlacement} from './visibility.js';

const cell=72;
const checker=c=>{
 c.fillStyle='#213327';c.fillRect(0,0,cell,cell);
 c.fillStyle='#2c4030';
 for(let y=0;y<cell;y+=12)for(let x=0;x<cell;x+=12)if((x+y)/12%2===0)c.fillRect(x,y,12,12);
};
const terrainCache=new Map();
export function terrainThumbnail(type){
 if(terrainCache.has(type))return terrainCache.get(type);
 const ground=document.createElement('canvas');ground.width=3*TILE;ground.height=3*TILE;
 const terrain=Array.from({length:3},()=>Array(3).fill(type));
 Renderer.prototype.bakeGround.call({game:{map:{width:3,height:3,terrain}},ground});
 const image=document.createElement('canvas');image.width=TILE;image.height=TILE;
 image.getContext('2d').drawImage(ground,TILE,TILE,TILE,TILE,0,0,TILE,TILE);
 terrainCache.set(type,image);return image;
}
function fit(c,image,source){
 if(!image)return;
 const [sx,sy,sw,sh]=source||[0,0,image.width,image.height];
 if(!sw||!sh)return;
 const scale=Math.min(66/sw,65/sh,2.6);
 const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
 c.drawImage(image,sx,sy,sw,sh,Math.round((cell-w)/2),Math.round((cell-h)/2),w,h);
}
export function drawPaletteThumbnail(canvas,game,kind,id){
 if(!canvas||!game?.assets)return false;
 canvas.width=cell;canvas.height=cell;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 checker(c);
 const {images,environment}=game.assets;
 if(kind==='terrain'){
  const img=terrainThumbnail(id);c.drawImage(img,0,0,TILE,TILE,4,4,64,64);
 }else if(kind==='building'||kind==='object'){
  fit(c,environment[id]);
 }else if(kind==='npc'){
  if(game.npcStyle==='vector'&&images['vector-'+id]){
   c.imageSmoothingEnabled=true;fit(c,images['vector-'+id],[0,0,384,384]);
  }else fit(c,images[id],[0,0,48,48]);
 }else if(kind==='mob'){
  const size=id==='guardian'?64:48;fit(c,images[id],[0,0,size,size]);
 }else if(kind==='herb'){
  fit(c,images.icons,[24,0,24,24]);
 }else if(kind==='portal'){
  c.fillStyle='#41795c';c.fillRect(8,8,56,56);
  c.strokeStyle='#b4e9c3';c.lineWidth=4;c.strokeRect(14,14,44,44);
  c.fillStyle='#f4e7a1';c.font='bold 44px sans-serif';c.textAlign='center';
  c.fillText('➜',36,52);
 }
 return true;
}
export function drawPlacementGhost(c,game,kind,id,x,y,valid=true){
 const {environment,images}=game.assets||{};
 if(!environment||!images)return;
 const wx=x*TILE,wy=y*TILE;
 c.save();c.globalAlpha=valid?.68:.3;c.imageSmoothingEnabled=false;
 if(kind==='terrain'){
  c.drawImage(terrainThumbnail(id),wx,wy,TILE,TILE);
 }else if(kind==='object'){
  const img=environment[id];
  if(img){
   const obj={sprite:id,x,y,px:(x+.5)*TILE,py:(y+1)*TILE};
   const placement=sceneryPlacement(obj,img);
   c.drawImage(img,Math.round(placement.x),Math.round(placement.y));
  }
 }else if(kind==='building'){
  const b=buildingTemplate(id,x,y),img=environment[id];
  if(b&&img){const p=buildingPlacement(b,img,TILE);c.drawImage(img,Math.round(p.x),Math.round(p.y));}
 }else if(kind==='npc'||kind==='mob'){
  const image=kind==='npc'&&game.npcStyle==='vector'?images['vector-'+id]:images[id];
  const size=kind==='mob'&&id==='guardian'?64:48;
  const cellSize=kind==='npc'&&game.npcStyle==='vector'?384:size;
  if(image){
   const px=(x+.5)*TILE,py=(y+.8)*TILE;
   const w=kind==='npc'?48:size;
   const anchor=kind==='mob'&&id==='guardian'?56:kind==='npc'?42:42;
   c.drawImage(image,0,0,cellSize,cellSize,Math.round(px-w/2),Math.round(py-anchor),w,w);
  }
 }else if(kind==='herb'){
  c.drawImage(images.icons,24,0,24,24,wx+4,wy,24,24);
 }else if(kind==='portal'){
  c.fillStyle='#4ee8c4';c.fillRect(wx+4,wy+4,24,24);
  c.fillStyle='#194b39';c.fillRect(wx+8,wy+8,16,16);
 }
 c.restore();
}
