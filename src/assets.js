// Generated environment artwork is sampled onto fixed integer-sized sprites.
// Source rectangles isolate each illustration; gameplay never relies on image borders.
import { heroFrames } from './hero-frames.js';
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
 const names=['village-source','hero-source','hero','elder','smith','merchant','villager','goblin','mossling','guardian','icons'];
 const images=Object.fromEntries(await Promise.all(names.map(name=>new Promise((resolve,reject)=>{
  const image=new Image(); image.onload=()=>resolve([name,image]); image.onerror=()=>reject(new Error('Asset unavailable: '+name)); image.src='assets/'+name+'.png';
 }))));
 const environment={};
 for(const [name,{source,size}] of Object.entries(ENVIRONMENT)){
  const canvas=document.createElement('canvas'); [canvas.width,canvas.height]=size;
  const c=canvas.getContext('2d'); c.imageSmoothingEnabled=false;
  c.drawImage(images['village-source'],...source,0,0,...size); environment[name]=canvas;
 }
 // Normalize generated poses into 10 equal 80px cells per direction. Foot
 // anchors prevent jitter; attacks retain their extended staff inside each cell.
 const hero=document.createElement('canvas');hero.width=800;hero.height=320;
 const hc=hero.getContext('2d');hc.imageSmoothingEnabled=false;
 const poses=[0,1,2,3,4,5,6,6,7,7];
 for(let row=0;row<4;row++)for(let col=0;col<10;col++){
  const f=heroFrames[row][poses[col]],[sx,sy,sw,sh]=f.source;
  const scale=.175,w=Math.round(sw*scale),h=Math.round(sh*scale);
  const anchor=Math.round(f.anchor[0]*scale),dx=col*80+40-anchor,dy=row*80+64-h;
  hc.drawImage(images['hero-source'],sx,sy,sw,sh,dx,dy,w,h);
 }
 images.hero=hero;
 return {images,environment};
}
export const directions=['down','left','right','up'];
export function drawCharacter(c,assets,entity,time) {
 const moving=entity.moving, attacking=time<entity.attackUntil;
 const frame=attacking?6+Math.min(3,Math.floor((time-entity.attackStarted)/90)):
  moving?2+Math.floor(time/125)%4:Math.floor(time/650)%2;
 const row=Math.max(0,directions.indexOf(entity.direction||'down'));
 const image=assets.images[entity.sprite||'hero'],hero=entity.sprite==='hero';
 const cell=hero?80:48,anchorX=hero?40:24,anchorY=hero?64:42;
 c.drawImage(image,frame*cell,row*cell,cell,cell,Math.round(entity.px)-anchorX,Math.round(entity.py)-anchorY,cell,cell);
}
