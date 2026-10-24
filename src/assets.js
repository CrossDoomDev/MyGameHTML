// Generated environment artwork is sampled onto fixed integer-sized sprites.
// Source rectangles isolate each illustration; gameplay never relies on image borders.
import { heroFrames } from './hero-frames.js';
import { characterFrame } from './animation.js';
import { assetURL } from './asset-url.js';
import { repairForgeRoof } from './forge-animation.js';
import {ART_ATLAS,ATLAS_SOURCE,HOUSES,FOUNTAIN} from './village-art.js';
import {sharpenCanvas} from './pixel-art-sharp.js';
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
   // Sharpen at native atlas resolution first, then scale with nearest pixels.
   // Directly stretching an 80px picture to 160px retained the soft edges
   // baked into the original compressed atlas.
   const sourceWidth=Math.max(1,ex-ox),sourceHeight=Math.max(1,ey-oy);
   const native=document.createElement('canvas');
   native.width=sourceWidth;native.height=sourceHeight;
   const nativeCtx=native.getContext('2d');nativeCtx.imageSmoothingEnabled=false;
   nativeCtx.drawImage(buildingAtlas,ox,oy,sourceWidth,sourceHeight,0,0,sourceWidth,sourceHeight);
   if(name!=='fountain')sharpenCanvas(native,{strength:1.45,threshold:6});
   const canvas=document.createElement('canvas');
   [canvas.width,canvas.height]=size;
   const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
   context.drawImage(native,0,0,sourceWidth,sourceHeight,0,0,...size);
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
 // The illustrated red-roof tavern is a separate hand-authored 160px sprite.
 // It replaces only the inn, leaving all other compact five-cell houses intact.
 // Retain the original atlas as a fallback if an asset download fails.
 const tavern=await new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=assetURL('tavern-redrawn.webp');
 });
 if(tavern&&tavern.width===160&&tavern.height===160){
  const canvas=document.createElement('canvas');
  canvas.width=160;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.drawImage(tavern,0,0);
  environment.inn=canvas;
  if(ctx.getImageData){
   const pixels=ctx.getImageData(0,0,160,160).data;
   environmentMasks.inn=Uint8Array.from({length:160*160},(_,i)=>pixels[i*4+3]>=32?1:0);
  }
 }
 // A compact 48px village NPC sheet generated from the five-row artwork.
 // The source holds 12 frames per NPC: three frames for each cardinal view.
 // Repack once into the same four-row 48x48 layout as the player character.
 const villagePixels=await new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error('Не удалось загрузить пиксельных жителей'));
  image.src=assetURL('npc-village-48.avif');
 });
 if(villagePixels.width!==576||villagePixels.height!==240)
  throw new Error('Неверные размеры атласа NPC: ожидается 576×240');
 for(const [index,name] of NPC_SPRITES.entries()){
  const sheet=document.createElement('canvas');sheet.width=144;sheet.height=192;
  const context=sheet.getContext('2d');context.imageSmoothingEnabled=false;
  for(let view=0;view<4;view++)for(let pose=0;pose<3;pose++)
   context.drawImage(villagePixels,(view*3+pose)*48,index*48,48,48,
    pose*48,view*48,48,48);
  images[name]=sheet;
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
 // The new pixel druid uses compact 48x48 cells. Import the original 80px
 // painted frames, then bake the smaller atlas ONCE at startup. A generous
 // transparent inset leaves room for the staff and magical attacks. Never
 // crop a pose by drawing a large frame inside a too-small destination cell.
 const redesigned=await new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=assetURL('hero-druid.png');
 });
 const originalReady=redesigned?.width===640&&redesigned?.height===320;
 const compact=document.createElement('canvas');
 compact.width=480;compact.height=192; // 10 columns x 4 rows, 48 pixels per cell
 const compactCtx=compact.getContext('2d');compactCtx.imageSmoothingEnabled=false;
 const source=originalReady?redesigned:hero;
 const sourceColumns=originalReady?[0,0,1,2,3,4,5,6,7,0]:[0,0,2,3,4,5,6,7,8,0];
 for(let row=0;row<4;row++)for(let col=0;col<10;col++){
  // Original foot anchor (40,64) maps to (24,43) at 0.575x.
  // Every opaque pixel remains >=2px from the 48px frame boundaries.
  compactCtx.drawImage(source,sourceColumns[col]*80,row*80,80,80,
   col*48+1,row*48+7,46,46);
 }
 // Apply the latest hand-refined compact sprite sheet when available.
 // Four independently drawn profiles, no horizontal mirroring, 48px frames.
 // Keep the former hero atlas as fallback only if the new artwork fails.
 const refined=await new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=assetURL('hero-druid-refined.png');
 });
 if(refined?.width===480&&refined?.height===192){
  compactCtx.clearRect(0,0,480,192);
  compactCtx.drawImage(refined,0,0);
 }
 images.hero=compact;
 images.hero3d=images['hero-3d-atlas'];
 return {images,environment,environmentMasks};
}
export const directions=['down','left','right','up'];
export function drawCharacter(c,assets,entity,time,npcStyle='pixel') {
 const npc=NPC_SPRITES.includes(entity.sprite);
 const attacking=time<entity.attackUntil;
 const frame=npc
  ?(entity.moving?Math.floor((entity.animationTime||0)/120)%3:0)
  :characterFrame(entity,time);
 const direction=attacking?(entity.attackDirection||entity.direction):entity.direction;
 const row=Math.max(0,directions.indexOf(direction||'down'));
 const is3d=entity.sprite==='hero3d',isPixelHero=entity.sprite==='hero';
 const image=assets.images[entity.sprite||'hero'];
 const sourceCell=is3d?128:48;
 // New villagers and hero have identical native 48x48 frames. Never use
 // browser interpolation, even for direction changes or walking cycles.
 const size=is3d?80:48,anchorX=is3d?40:24,anchorY=is3d?64:isPixelHero?43:42;
 c.drawImage(image,frame*sourceCell,row*sourceCell,sourceCell,sourceCell,
  Math.round(entity.px)-anchorX,Math.round(entity.py)-anchorY,size,size);
}
