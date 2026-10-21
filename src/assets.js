// Generated environment artwork is sampled onto fixed integer-sized sprites.
// Source rectangles isolate each illustration; gameplay never relies on image borders.
import { heroFrames } from './hero-frames.js';
import { characterFrame } from './animation.js';
import { assetURL } from './asset-url.js';
import { repairForgeRoof } from './forge-animation.js';
import {ART_ATLAS,ATLAS_SOURCE,HOUSES,FOUNTAIN} from './village-art.js';
export const NPC_SPRITES=['elder','smith','merchant','villager','fisher'];
export const ENVIRONMENT = {
 inn: {source:[0,0,402,355],size:[192,160]},
 cottage: {source:[402,0,267,355],size:[144,152]},
 forge: {source:[669,0,337,355],size:[144,144]},
 cabin: {source:[1006,0,248,355],size:[112,144]},
 oak: {source:[0,355,389,352],size:[112,112]},
 pine: {source:[389,355,281,352],size:[80,112]},
 birch: {source:[670,355,334,352],size:[104,104]},
 bush: {source:[1004,466,250,242],size:[44,40]},
 market: {source:[0,708,389,294],size:[128,96]},
 lamp: {source:[422,707,187,295],size:[36,76]},
 barrel: {source:[710,745,197,257],size:[23,30]},
 crates: {source:[960,729,294,273],size:[38,35]},
 anvil: {source:[0,1004,363,250],size:[44,32]},
 logs: {source:[364,1004,305,250],size:[44,36]},
 fence: {source:[670,1004,285,250],size:[36,28]},
 crops: {source:[955,1004,299,250],size:[48,44]}
};
export async function loadAssets() {
 const names=['village-source','hero-source','hero-walk','hero-3d-atlas','hero','elder','smith','merchant','villager','fisher','goblin','mossling','guardian','icons'];
 // Preserve the original pixel NPC art; SVG sheets are fully separate.
 const files=[...names.map(name=>[name,name+'.png']),
  ...NPC_SPRITES.map(name=>['vector-'+name,'vector-'+name+'.svg'])];
 const images=Object.fromEntries(await Promise.all(files.map(([name,file])=>new Promise((resolve,reject)=>{
  const image=new Image(); image.onload=()=>resolve([name,image]); image.onerror=()=>reject(new Error('Asset unavailable: '+file)); image.src=assetURL(file);
 }))));
 const environment={},environmentMasks={};
 for(const [name,{source,size}] of Object.entries(ENVIRONMENT)){
  const canvas=document.createElement('canvas'); [canvas.width,canvas.height]=size;
  const c=canvas.getContext('2d'); c.imageSmoothingEnabled=false;
  c.drawImage(images['village-source'],...source,0,0,...size);
  // The generated atlas has detached 1–2 px dark vertical fragments on the
  // far-left edge of the cottage (three streaks) and forge (one streak).
  // Their actual connected artwork starts at x=9 and x=5 respectively.
  // Clear only that stray edge area; do not modify the buildings themselves.
  if(name==='cottage')c.clearRect(0,0,3,canvas.height);
  if(name==='forge'){
   c.clearRect(0,0,2,canvas.height);
   repairForgeRoof(c);
  }
  environment[name]=canvas;
  if(c.getImageData){
   const pixels=c.getImageData(0,0,...size).data;
   environmentMasks[name]=Uint8Array.from({length:size[0]*size[1]},(_,i)=>pixels[i*4+3]>=32?1:0);
  }
 }
 // Replace the previous facade illustrations with the six custom tile-aligned
 // transparent pixel-art sprites. Keep fallback art if the new WebP is blocked,
 // so the whole game can still start and the player can report an asset error.
 let buildingAtlas=null;
 try{
  buildingAtlas=await new Promise(resolve=>{
   const image=new Image();image.onload=()=>resolve(image);
   image.onerror=()=>resolve(null);image.src=assetURL(ART_ATLAS);
  });
 }catch{}
 if(!buildingAtlas){
  // Graceful fallback when the optional atlas has not reached the CDN yet.
  // All facades retain the correct odd-width collision dimensions.
  for(const [name,model] of Object.entries(HOUSES)){
   const old=environment[name]||environment.cottage;
   const canvas=document.createElement('canvas');
   canvas.width=model.w*32;canvas.height=model.h*32;
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
   if(old)c.drawImage(old,0,0,old.width,old.height,0,0,canvas.width,canvas.height);
   if(name==='chapel'){
    c.fillStyle='#324d68';c.fillRect(Math.round(canvas.width/2)-16,22,32,32);
    c.fillStyle='#d7c492';c.fillRect(Math.round(canvas.width/2)-9,10,18,15);
   }
   environment[name]=canvas;
  }
  const fountain=document.createElement('canvas');
  fountain.width=96;fountain.height=96;
  const c=fountain.getContext('2d');c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  // Small stone octagon with bright water and a three-tier center jet.
  for(let row=0;row<6;row++){
   let edge=[18,12,8,8,12,18][row];
   rect(edge,34+row*8,96-edge*2,8,['#7c7c69','#a7a18a','#696e61'][row%3]);
  }
  rect(20,42,56,32,'#417d9c');rect(26,47,44,22,'#298ab1');
  for(let i=0;i<7;i++)rect(28+i*6,49+(i%3)*4,3,2,'#b6e9f0');
  rect(45,26,6,27,'#83d6eb');rect(43,20,10,5,'#bdeefa');
  environment.fountain=fountain;
 }
 if(buildingAtlas){
  const importSprite=(name,rect,size)=>{
   const [x,y,w,h]=rect;
   const sx=buildingAtlas.width/ATLAS_SOURCE[0],sy=buildingAtlas.height/ATLAS_SOURCE[1];
   const ox=Math.round(x*sx),oy=Math.round(y*sy);
   const ex=Math.round((x+w)*sx),ey=Math.round((y+h)*sy);
   const canvas=document.createElement('canvas');
   [canvas.width,canvas.height]=size;
   const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
   context.drawImage(buildingAtlas,ox,oy,Math.max(1,ex-ox),Math.max(1,ey-oy),0,0,...size);
   environment[name]=canvas;
   if(context.getImageData){
    const pixels=context.getImageData(0,0,...size).data;
    environmentMasks[name]=Uint8Array.from({length:size[0]*size[1]},(_,i)=>pixels[i*4+3]>=32?1:0);
   }
  };
  for(const [name,house] of Object.entries(HOUSES))
   importSprite(name,house.atlas,[house.w*32,house.h*32]);
  importSprite('fountain',FOUNTAIN.atlas,[FOUNTAIN.w*32,FOUNTAIN.h*32]);
 }
 // Normalize generated poses into 10 equal 80px cells per direction. Foot
 // anchors prevent jitter; attacks retain their extended staff inside each cell.
 const hero=document.createElement('canvas');hero.width=800;hero.height=320;
 const hc=hero.getContext('2d');hc.imageSmoothingEnabled=false;
 const poses=[0,1,2,3,4,5,6,7,6,0];
 for(let row=0;row<4;row++)for(let col=0;col<10;col++){
  if(col>=2&&col<=5){
   // Authored contacts/passing poses, packed with fixed body anchors.
   hc.drawImage(images['hero-walk'],(col-2)*80,row*80,80,80,col*80,row*80,80,80);
   continue;
  }
  // The supplied left attack faces right: mirror the matching right pose.
  const flip=row===1&&col>=6&&col<=8;
  const f=heroFrames[flip?2:row][poses[col]],[sx,sy,sw,sh]=f.source;
  const scale=.175,w=Math.round(sw*scale),h=Math.round(sh*scale);
  const anchor=Math.round(f.anchor[0]*scale),dx=col*80+40-anchor,dy=row*80+64-Math.round(f.anchor[1]*scale);
  hc.save();
  if(flip){hc.translate(col*80+40,0);hc.scale(-1,1);}
  hc.drawImage(images['hero-source'],sx,sy,sw,sh,flip?-anchor:dx,dy,w,h);
  hc.restore();
 }
 images.hero=hero;
 images.hero3d=images['hero-3d-atlas'];
 return {images,environment,environmentMasks};
}
export const directions=['down','left','right','up'];
export function drawCharacter(c,assets,entity,time,npcStyle='pixel') {
 const attacking=time<entity.attackUntil;
 const frame=NPC_SPRITES.includes(entity.sprite)?0:characterFrame(entity,time);
 const direction=attacking?(entity.attackDirection||entity.direction):entity.direction;
 const row=Math.max(0,directions.indexOf(direction||'down'));
 const is3d=entity.sprite==='hero3d',hero=entity.sprite==='hero'||is3d;
 const vectorNPC=npcStyle==='vector'&&NPC_SPRITES.includes(entity.sprite);
 const image=vectorNPC?assets.images['vector-'+entity.sprite]:assets.images[entity.sprite||'hero'];
 const sourceCell=vectorNPC?384:is3d?128:hero?80:48;
 const size=hero?80:48,anchorX=hero?40:24,anchorY=hero?64:42;
 // Smooth SVG source art in canvases that draw it at native screen resolution.
 if(vectorNPC){c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';}
 c.drawImage(image,frame*sourceCell,row*sourceCell,sourceCell,sourceCell,Math.round(entity.px)-anchorX,Math.round(entity.py)-anchorY,size,size);
 if(vectorNPC)c.restore();
}
