// Authored from the six-building pixel-art concept sheet. Every facade has
// an odd-width grid footprint; the door's center is at tile w // 2.
// Artwork is sliced from one compact transparent atlas.
export const TILE_ART=32;
export const ART_ATLAS='village-buildings.webp';
export const ATLAS_SOURCE=[864,416];
export const HOUSES={
 cabin: {name:'Домик',w:5,h:5,atlas:[64,0,160,160],chimneys:[[126,9]],
  lights:[[80,63],[46,117],[115,117],[82,113]]},
 cottage: {name:'Большой дом',w:7,h:5,atlas:[320,0,224,160],chimneys:[[161,7]],
  lights:[[112,62],[67,115],[166,114],[111,137]]},
 inn: {name:'Таверна',w:9,h:5,atlas:[576,0,288,160],chimneys:[[72,18],[225,18]],
  lights:[[79,65],[144,78],[218,67],[95,115],[196,111]]},
 forge: {name:'Кузница',w:7,h:5,atlas:[32,160,224,160],chimneys:[[44,30]],
  lights:[[122,59],[159,117]],hearth:[54,131]},
 market: {name:'Лавка',w:7,h:5,atlas:[320,160,224,160],chimneys:[[159,30]],
  lights:[[111,72],[76,118],[165,118]]},
 chapel: {name:'Часовня',w:7,h:5,atlas:[608,160,224,160],chimneys:[],
  lights:[[112,123],[46,116],[180,116]]}
};
export const FOUNTAIN={w:3,h:3,atlas:[0,320,96,96]};

// Separate footprint from display texture: the scene and editor both use
// these dimensions, so an entrance always occupies the central grid cell.
export function facadeFootprint(id){
 const model=HOUSES[id];
 if(!model)return null;
 return {w:model.w,h:model.h,doorOffset:(model.w-1)/2};
}
export function fountainFootprint(id){
 return id==='fountain'?{w:3,h:3}: {w:1,h:1};
}
// Coordinates measured on the individual sprite, not on the game map.
export function drawSmoke(c,chimneys,x,y,time=0,opacity=1){
 c.save();const baseAlpha=c.globalAlpha*opacity;
 const phase=time/2250;
 for(const [index,[cx,cy]] of chimneys.entries())for(let n=0;n<3;n++){
  const t=((phase+n/3+index*.19)%1+1)%1;
  const radius=2+Math.floor(t*4);
  const offset=Math.round(t*t*11+Math.sin(6*t+index)*2);
  const px=Math.round(x+cx+offset-2),py=Math.round(y+cy-5-t*39);
  c.globalAlpha=baseAlpha*.12*(1-t);
  c.fillStyle=n===0?'#cfcbbd':'#9c9990';
  c.fillRect(px-radius,py-2,radius*2+1,radius+1);
  c.globalAlpha=baseAlpha*.08*(1-t);
  c.fillStyle='#e6dfce';
  c.fillRect(px-radius+2,py-4,radius*2,2);
 }
 c.restore();
}
export function drawBuildingLights(c,id,x,y,time=0){
 const model=HOUSES[id];if(!model)return;
 c.save();
 const baseAlpha=c.globalAlpha;
 // Windows are already painted yellow; tiny inset highlights give a subtle pulse.
 for(let i=0;i<model.lights.length;i++){
  const [lx,ly]=model.lights[i];
  const pulse=.035+.08*(.5+.5*Math.sin(time/(500+i*93)+i*1.8+x*.002));
  c.globalAlpha=baseAlpha*pulse;
  c.fillStyle='#fff4b2';
  c.fillRect(Math.round(x+lx-3),Math.round(y+ly-4),6,7);
  c.globalAlpha=baseAlpha*pulse*.7;
  c.fillStyle='#ffe075';
  c.fillRect(Math.round(x+lx-6),Math.round(y+ly-1),12,2);
 }
 if(model.hearth){
  const [hx,hy]=model.hearth;
  const phase=Math.floor(time/210)%4;
  for(let i=0;i<3;i++){
   const height=[6,9,7,11][(phase+i)%4];
   c.globalAlpha=baseAlpha*.68;
   c.fillStyle='#f35a19';c.fillRect(x+hx-8+i*6,y+hy-height,5,height);
   c.fillStyle='#ffe370';c.fillRect(x+hx-6+i*6,y+hy-height+3,2,Math.max(2,height-4));
  }
 }
 c.restore();
}
// Four low-cost animated water phases built over the static pixel-art fountain.
// Water stays inside the bowl, and the effect follows its placed grid footprint.
export function drawFountainWater(c,x,y,time=0){
 const phase=Math.floor(time/180)%4;
 c.save();
 const base=c.globalAlpha;
 for(let k=0;k<4;k++){
  const px=Math.round(x+49+Math.sin(time/320+k)*5),py=Math.round(y+33+((k*7+phase*3)%19));
  c.globalAlpha=base*(.64-k*.09);
  c.fillStyle=k%2?'#66c9eb':'#c4effd';
  c.fillRect(px,py,2,3+(k%2));
 }
 for(let k=0;k<7;k++){
  const wave=(phase+k*5)%19;
  c.globalAlpha=base*.24;
  c.fillStyle='#d6f8ff';
  c.fillRect(x+23+k*8,y+57+Math.floor(Math.sin((time/250)+k)*2),3,1);
  if(k%2===0)c.fillRect(x+29+k*7,y+48+wave%8,2,1);
 }
 c.restore();
}
