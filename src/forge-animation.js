// Compact pixel-art animation anchored to the forge sprite (144 x 144).
// The collision footprint and the hand-painted house itself stay unchanged.
export const FORGE_SIZE=144;
export const FORGE_CHIMNEY=Object.freeze({x:87,y:27});
export const FORGE_HEARTH=Object.freeze({x:87,y:119});
export const FORGE_FRAME_MS=180;
const px=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};

// Prepare the source sprite once. Remove its baked-in stationary smoke and
// finish the roof-to-chimney joint with small slate/lead flashing.
export function repairForgeRoof(c){
 c.clearRect(73,0,38,27);
 // Mouth directly over the existing masonry shaft.
 px(c,75,27,28,3,'#302c2a');
 px(c,76,26,26,2,'#a69b82');
 px(c,79,27,19,3,'#282824');
 px(c,78,30,22,2,'#464037');
 px(c,75,30,3,4,'#696454');
 px(c,100,30,3,4,'#585448');
 px(c,78,31,2,2,'#b4aa92');
 px(c,99,31,2,2,'#938978');
 // Flashing under the chimney foot follows both adjoining roof slopes.
 px(c,71,76,6,2,'#292d2b');
 px(c,75,78,7,3,'#555b56');
 px(c,79,80,27,3,'#333630');
 px(c,78,79,25,1,'#999382');
 px(c,82,83,27,3,'#454641');
 px(c,84,83,23,1,'#8d8979');
 px(c,105,83,5,3,'#4c4d42');
 px(c,106,86,5,1,'#343c36');
 for(let i=0;i<6;i++){
  const x=73+i*5,y=84+Math.floor(i*.55);
  px(c,x,y,5,2,i%2?'#4a4e48':'#5b5e54');
  px(c,x+1,y,3,1,'#7d7e70');
 }
}

// Called while drawing each forge, in its depth-sorted building draw.
// Smoke starts at the mouth (87,27), never at the roof or furnace.
export function drawForgeEffects(c,x,y,time){
 const phase=((Math.floor(time/FORGE_FRAME_MS)%4)+4)%4;
 c.save();
 const baseAlpha=c.globalAlpha;
 const cx=x+FORGE_HEARTH.x,by=y+FORGE_HEARTH.y;
 const flames=[
  {dx:-8,h:[6,8,7,5][phase]},
  {dx:-2,h:[10,8,12,9][phase]},
  {dx:4,h:[7,11,8,10][phase]},
  {dx:10,h:[5,6,7,6][phase]}
 ];
 for(const [i,f] of flames.entries()){
  const x0=cx+f.dx,y0=by-f.h;
  px(c,x0-1,y0+3,6,f.h-1,'#db4d15');
  px(c,x0,y0+1,4,Math.max(2,f.h-2),'#ff9b1e');
  px(c,x0+1,y0,2,Math.max(2,f.h-3),'#ffe267');
  if(i%2===phase%2)px(c,x0+1,y0-2,2,2,'#fff0aa');
 }
 const mouthX=x+FORGE_CHIMNEY.x,mouthY=y+FORGE_CHIMNEY.y;
 for(let i=0;i<4;i++){
  const t=((time/2400+i*.25)%1+1)%1;
  const drift=Math.round(t*t*12+Math.sin(t*7+i)*2);
  const sx=mouthX+drift-2,sy=mouthY-4-Math.round(t*37);
  const radius=2+Math.floor(t*5);
  c.globalAlpha=baseAlpha*(1-t)*.38;
  px(c,sx-radius,sy-1,radius*2+1,Math.max(3,radius),'#595a57');
  px(c,sx-radius+1,sy-3,radius*2,Math.max(2,radius-1),'#928c83');
  px(c,sx,sy-4,radius,2,'#b1a79b');
 }
 c.restore();
}
