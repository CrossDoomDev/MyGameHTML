// Authored from the six-building pixel-art concept sheet. Every facade has
// an odd-width grid footprint; the door's center is at tile w // 2.
// Artwork is sliced from one compact transparent atlas.
export const TILE_ART=32;
// New compact art from the final six-row concept. All facades occupy an odd
// five-column footprint; each doorway is precisely on the middle tile.
export const ART_ATLAS='village-compact.webp';
export const ATLAS_SOURCE=[240,160];
export const HOUSES={
 cabin: {name:'Домик',w:5,h:5,atlas:[80,0,80,80],chimneys:[[113,12]],
  lights:[[80,66],[49,112],[113,113]],lanterns:[[40,113]]},
 cottage: {name:'Большой дом',w:5,h:5,atlas:[80,0,80,80],chimneys:[[113,12]],
  lights:[[80,66],[49,112],[113,113]],lanterns:[[40,113]]},
 inn: {name:'Таверна',w:5,h:5,atlas:[0,0,80,80],chimneys:[[104,15]],
  lights:[[63,67],[48,111],[112,113]],lanterns:[[27,106],[111,111]]},
 forge: {name:'Кузница',w:5,h:5,atlas:[160,0,80,80],chimneys:[[111,19]],
  lights:[[81,69]],hearth:[114,119],lanterns:[]},
 market: {name:'Лавка',w:5,h:3,atlas:[0,112,80,48],chimneys:[],
  lights:[[70,52]],lanterns:[[129,33]]},
 chapel: {name:'Часовня',w:5,h:5,atlas:[80,80,80,80],chimneys:[],
  lights:[[80,74]],lanterns:[[36,116],[121,116]]}
};
export const FOUNTAIN={w:3,h:3,atlas:[160,80,80,80]};

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
 // Pixel-sized glows at actual lantern positions; no blurred effects.
 for(let i=0;i<(model.lanterns?.length||0);i++){
  const [lx,ly]=model.lanterns[i];
  const phase=.5+.5*Math.sin(time/(355+i*77)+i*1.8+x*.002);
  const alpha=baseAlpha*(.06+phase*.11);
  c.globalAlpha=alpha;c.fillStyle='#ffb446';
  c.fillRect(Math.round(x+lx-5),Math.round(y+ly-6),11,13);
  c.globalAlpha=alpha*.8;c.fillStyle='#fff3b1';
  c.fillRect(Math.round(x+lx-2),Math.round(y+ly-3),5,7);
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
