import { TILE, WIDTH, HEIGHT, rand } from './map.js';
import { drawCharacter } from './assets.js';
import { sceneryPlacement, buildingPlacement, coversActor } from './visibility.js';
import { drawForgeEffects } from './forge-animation.js';

const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
export class Renderer{
 constructor(game){this.game=game;this.c=game.ctx;const WIDTH=game.map.width,HEIGHT=game.map.height;
  const overlay=document.getElementById('npcOverlay');
  this.npcOverlay=overlay&&typeof overlay.getContext==='function'?overlay:null;
  this.occlusionAlpha=new WeakMap();this.ground=document.createElement('canvas');this.ground.width=WIDTH*TILE;this.ground.height=HEIGHT*TILE;this.bakeGround();this.miniBase=document.createElement('canvas');this.miniBase.width=WIDTH*4;this.miniBase.height=HEIGHT*4;this.bakeMinimap();}
 sceneryOpacity(object,placement){
  const g=this.game,mask=g.assets.environmentMasks?.[object.sprite];
  const obscures=this.protectedActors.some(actor=>coversActor(placement,actor,mask));
  const target=obscures ? .25 : 1,previous=this.occlusionAlpha.get(object)??1;
  const alpha=previous+(target-previous)*(1-Math.exp(-this.fadeDelta/75));
  this.occlusionAlpha.set(object,alpha);return alpha;
 }
 bakeGround(){
  const c=this.ground.getContext('2d'),map=this.game.map,WIDTH=map.width,HEIGHT=map.height;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const X=x*TILE,Y=y*TILE,type=map.terrain[y][x];
   if(type==='water'){rect(c,X,Y,32,32,['#195469','#1c5c70','#1c6070'][Math.floor(rand(x,y)*3)]);continue;}
   if(type==='bridge'){rect(c,X,Y,32,32,'#365c47');continue;}
   if(type==='rug'){rect(c,X,Y,32,32,'#8b3934');rect(c,X+2,Y+2,28,28,'#a14c3d');rect(c,X+5,Y+5,22,22,'#743d35');continue;}
   if(type==='wood'){
    rect(c,X,Y,32,32,'#684528');
    for(let z=0;z<3;z++){rect(c,X,Y+z*11,32,1,'#3c291c');rect(c,X+Math.floor(rand(x,y+z,9)*26),Y+z*11+3,1,7,'#835637');}
    continue;
   }
   // Use one continuous base color for all connected dirt and grass cells.
   // Per-cell shades and full-length top/left path strokes exposed a 32px
   // checkerboard even on a straight road.
   const grassColor='#58793e';
   rect(c,X,Y,TILE,TILE,type==='path'?'#b38c5b':grassColor);
   if(type==='path'){
    // Small, deterministic, non-grid-aligned grit keeps the road textured.
    for(let n=0;n<9;n++){
     const a=rand(x*11+n,y,3),b=rand(x,y*11+n,8);
     rect(c,X+1+Math.floor(a*(TILE-2)),Y+1+Math.floor(b*(TILE-2)),
      1+(n%3===0?1:0),1,n%2?'#c99f69':'#a47f51');
    }
    // Only blend the *outer* border against grass. Between path/path tiles
    // there are no seams or dark outlines. Subtle 4px groups give the dirt
    // a continuous irregular contour instead of perfectly square edges.
    const fringe=(neighbor,side)=>{
     if(neighbor!=='grass')return;
     for(let i=0;i<TILE;i++){
      const group=Math.floor(i/4);
      const thickness=1+Math.floor(rand(side<2?x*8+group:x,side<2?y:y*8+group,51+side)*3);
      if(side===0)rect(c,X+i,Y,1,thickness,grassColor);          // north
      else if(side===1)rect(c,X+i,Y+TILE-thickness,1,thickness,grassColor); // south
      else if(side===2)rect(c,X,Y+i,thickness,1,grassColor);     // west
      else rect(c,X+TILE-thickness,Y+i,thickness,1,grassColor); // east
     }
    };
    fringe(map.terrain[y-1]?.[x],0);
    fringe(map.terrain[y+1]?.[x],1);
    fringe(map.terrain[y]?.[x-1],2);
    fringe(map.terrain[y]?.[x+1],3);
   }else{
    for(let n=0;n<38;n++){
     const a=rand(x*51+n,y,5),b=rand(x,y*51+n,13),color=['#789548','#466b34','#688741','#8b9d50','#3f622f'][n%5];
     rect(c,X+Math.floor(a*32),Y+Math.floor(b*32),n%7===0?2:1,n%3===0?2:1,color);
    }
    const borders=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy]of borders)if(map.terrain[y+dy]?.[x+dx]==='path'){
     for(let n=0;n<12;n++){const v=Math.floor(rand(x+n,y,9)*32),h=1+Math.floor(rand(y+n,x,1)*4);
      rect(c,X+(dx===1?31-h:dx===-1?0:v),Y+(dy===1?31-h:dy===-1?0:v),dx? h:1,dy?h:2,'#73934a');
     }
    }
    if(rand(x,y,20)>.69)for(let n=0;n<4;n++){const fx=X+4+Math.floor(rand(x+n,y,33)*24),fy=Y+6+Math.floor(rand(y+n,x,6)*23);rect(c,fx,fy,1,3,'#52743c');rect(c,fx-1,fy-1,3,1,n%3?'#e9e5b4':'#d4b657');rect(c,fx,fy-2,1,3,'#f2eac9');}
   }
  }

 }
 bakeMinimap(){
  const c=this.miniBase.getContext('2d'),g=this.game,WIDTH=g.map.width,HEIGHT=g.map.height;c.imageSmoothingEnabled=false;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){const t=g.map.terrain[y][x];rect(c,x*4,y*4,4,4,t==='water'?'#347688':t==='path'?'#b39960':t==='bridge'?'#aeb19b':'#60824c');}
  for(const o of g.map.objects)if(o.tree)rect(c,o.x*4,o.y*4,4,4,'#284c36');
  for(const b of g.map.buildings){rect(c,b.x*4,b.y*4,b.w*4,b.h*4,b.sprite==='cottage'?'#4a6570':'#72593f');rect(c,b.doorX*4,b.doorY*4,3,3,'#debd65');}
 }
 minimap(canvas,large=false){
  const c=canvas.getContext('2d'),g=this.game,WIDTH=g.map.width,HEIGHT=g.map.height;c.imageSmoothingEnabled=false;
  c.drawImage(this.miniBase,0,0,canvas.width,canvas.height);
  const sx=canvas.width/(WIDTH*TILE),sy=canvas.height/(HEIGHT*TILE);
  for(const n of g.npcs)rect(c,n.px*sx-1,n.py*sy-1,2,2,'#ead09c');
  if(large)for(const m of g.mobs)if(m.alive)rect(c,m.px*sx-2,m.py*sy-2,4,4,m.boss?'#da774d':'#bd9854');
  c.strokeStyle='#f2e8b4';c.lineWidth=1;c.beginPath();const x=Math.round(g.player.px*sx),y=Math.round(g.player.py*sy);c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();rect(c,x-1,y-1,3,3,'#fff6cb');
  if(large){c.fillStyle='#f1e2b8';c.font='10px Georgia';c.fillText(g.map.label,Math.max(4,WIDTH*.1)*32*sx,Math.max(5,HEIGHT*.12)*32*sy);}
 }
 environment(o){
  const c=this.c,s=this.game.assets.environment[o.sprite];if(!s)return;
  const placement=sceneryPlacement(o,s),alpha=this.sceneryOpacity(o,placement);
  c.save();
  if(o.tree){c.globalAlpha=.16*alpha;rect(c,o.px-30,o.py-10,63,12,'#1a3921');}
  c.globalAlpha=alpha;c.drawImage(s,placement.x,placement.y);c.restore();
 }
 bridge(){
  if(!this.game.map.hasBridge)return;
  const c=this.c,X=21*TILE,Y=16*TILE;
  rect(c,X-2,Y-7,164,79,'#343e39');rect(c,X,Y-5,160,74,'#777a6b');
  for(let y=0;y<4;y++)for(let x=0;x<10;x++){
   const bx=X+x*16+(y%2?8:0),by=Y+y*16;
   if(bx<X+158){rect(c,bx+1,by,14,14,['#959586','#898c7c','#a0a091'][Math.floor(rand(x,y)*3)]);rect(c,bx+1,by,14,2,'#b0ae9a');}
  }
  // Upper balustrade, visible arch beneath the crossing.
  for(const dy of [-10,62]){
   rect(c,X-4,Y+dy,168,10,'#484e45');
   for(let x=0;x<11;x++){rect(c,X-3+x*15,Y+dy,13,8,'#939486');rect(c,X-3+x*15,Y+dy,13,2,'#b3b3a0');}
  }
  for(const dx of [-6,154])for(const dy of [-12,55]){rect(c,X+dx,Y+dy,12,18,'#646c5e');rect(c,X+dx,Y+dy,12,3,'#aaa995');}
  // Stone face with an open central arch. The river remains visible underneath.
  for(let px=0;px<160;px++){
   const top=Y+54-Math.round(Math.sin(px/160*Math.PI)*9),arch=Math.abs(px-80)<31;
   const bottom=arch?Y+80-Math.round(Math.sqrt(Math.max(0,31*31-(px-80)*(px-80)))):Y+83;
   rect(c,X+px,top,1,Math.max(0,bottom-top),'#757b6c');
   if(px%17===0)rect(c,X+px,top,1,Math.max(0,bottom-top),'#4b564b');
   rect(c,X+px,top,1,2,'#a2a392');
   if(bottom>top+12)rect(c,X+px,Y+66,1,1,'#505c4e');
   rect(c,X+px,bottom-2,1,2,'#3d4e43');
  }
  for(let i=0;i<14;i++){
   const a=Math.PI+i/13*Math.PI,x=X+80+Math.cos(a)*34,y=Y+80+Math.sin(a)*34;
   rect(c,x-3,y-3,7,7,'#9a9b89');rect(c,x-3,y-3,7,2,'#b4b49f');
  }
 }
 water(time){
  const c=this.c,g=this.game,WIDTH=g.map.width,HEIGHT=g.map.height;
  for(let y=Math.max(0,Math.floor(g.camera.y/TILE)-1);y<Math.min(HEIGHT,Math.ceil((g.camera.y+g.canvas.height)/TILE)+1);y++){
   for(let x=Math.max(0,Math.floor(g.camera.x/TILE)-1);x<Math.min(WIDTH,Math.ceil((g.camera.x+g.canvas.width)/TILE)+1);x++){
    if(g.map.terrain[y][x]!=='water')continue;
    const X=x*TILE,Y=y*TILE;
    for(let n=0;n<3;n++){const ry=(n*11+Math.floor(time/150)+Math.floor(rand(x+n,y)*20))%32;rect(c,X+Math.floor(rand(x,y+n)*24),Y+ry,4+n%2,1,'#327f89');}
   }
  }
 }
 // Illustrations must be rendered at *screen* resolution. #game is intentionally
 // pixelated for terrain; drawing SVG NPCs into that low-resolution canvas
 // would turn even perfect vector curves into blocks after CSS upscaling.
 drawNPCOverlay(){
  const overlay=this.npcOverlay,g=this.game;
  if(!overlay)return;
  const cssW=overlay.clientWidth||g.canvas.clientWidth||innerWidth;
  const cssH=overlay.clientHeight||g.canvas.clientHeight||innerHeight;
  const pixelRatio=Math.min(window.devicePixelRatio||1,2);
  const neededW=Math.max(1,Math.round(cssW*pixelRatio)),neededH=Math.max(1,Math.round(cssH*pixelRatio));
  if(overlay.width!==neededW)overlay.width=neededW;
  if(overlay.height!==neededH)overlay.height=neededH;
  const c=overlay.getContext('2d');
  c.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  c.clearRect(0,0,cssW,cssH);
  if(g.npcStyle!=='vector'||!g.assets)return;
  const sx=cssW/g.canvas.width,sy=cssH/g.canvas.height;
  c.save();
  c.imageSmoothingEnabled=true;
  c.imageSmoothingQuality='high';
  for(const npc of g.npcs){
   const image=g.assets.images['vector-'+npc.sprite];
   if(!image)continue;
   const row={down:0,left:1,right:2,up:3}[npc.direction||'down']??0;
   const x=(npc.px-g.camera.x-24)*sx,y=(npc.py-g.camera.y-42)*sy;
   // Same 48x48 world-space footprint and 42px foot anchor as pixel NPCs.
   // Drawing directly on this device-resolution layer preserves smooth lines.
   c.drawImage(image,0,row*384,384,384,x,y,48*sx,48*sy);
  }
  if(g.night){
   c.globalCompositeOperation='source-atop';
   c.fillStyle='#13284755';
   c.fillRect(0,0,cssW,cssH);
  }
  c.restore();
 }
 draw(time){
  const g=this.game,c=this.c,w=g.canvas.width,h=g.canvas.height,p=g.player,WIDTH=g.map.width,HEIGHT=g.map.height;
  this.fadeDelta=this.lastDrawTime===undefined?16:Math.max(0,time-this.lastDrawTime);this.lastDrawTime=time;
  this.protectedActors=[p,...g.npcs,...g.herbs.filter(herb=>!herb.collected)];
  // Small interiors stay centered even on ultra-wide desktop screens.
  g.camera.x=WIDTH*TILE<=w?-Math.round((w-WIDTH*TILE)/2):Math.round(Math.max(0,Math.min(WIDTH*TILE-w,p.px-w/2)));
  g.camera.y=HEIGHT*TILE<=h?-Math.round((h-HEIGHT*TILE)/2):Math.round(Math.max(0,Math.min(HEIGHT*TILE-h,p.py-h/2)));
  c.fillStyle=g.location==='tavern'?'#201a14':'#3c5c38';c.fillRect(0,0,w,h);c.save();c.translate(-g.camera.x,-g.camera.y);
  const sx=Math.max(0,Math.floor(g.camera.x)),sy=Math.max(0,Math.floor(g.camera.y));
  const sw=Math.min(w,this.ground.width-sx),sh=Math.min(h,this.ground.height-sy);
  if(sw>0&&sh>0)c.drawImage(this.ground,sx,sy,sw,sh,sx,sy,sw,sh);
  this.water(time);this.bridge();
  if(g.path.length){c.globalAlpha=.26;for(const step of g.path){rect(c,step.x*TILE+14,step.y*TILE+14,4,4,'#ece5b1');}c.globalAlpha=1;const end=g.path.at(-1);c.strokeStyle='#e6d48d';c.strokeRect(end.x*TILE+7,end.y*TILE+7,18,18);}
  // Cull world decoration before depth-sorting to keep large biomes fast on phones.
  const objects=g.map.objects.filter(o=>o.px>g.camera.x-110&&o.px<g.camera.x+w+110&&o.py>g.camera.y-110&&o.py<g.camera.y+h+140).map(o=>({y:o.py,draw:()=>this.environment(o)}));
  for(const b of g.map.buildings){
   const sprite=g.assets.environment[b.sprite],placement=buildingPlacement(b,sprite,TILE),py=(b.y+b.h)*TILE;
   objects.push({y:placement.depth,draw:()=>{const alpha=this.sceneryOpacity(b,placement);c.save();c.globalAlpha=.17*alpha;rect(c,b.x*TILE-2,py-12,b.w*TILE+4,17,'#182b1a');c.globalAlpha=alpha;c.drawImage(sprite,placement.x,placement.y);
    if(b.sprite==='forge')drawForgeEffects(c,placement.x,placement.y,time);
    c.restore();}});
  }
  for(const herb of g.herbs)if(!herb.collected)objects.push({y:herb.py,draw:()=>{
   c.drawImage(g.assets.images.icons,24,0,24,24,herb.px-12,herb.py-21,24,24);
   if(Math.floor(time/700)%3===0){rect(c,herb.px+8,herb.py-21,1,5,'#ebe9af');rect(c,herb.px+6,herb.py-19,5,1,'#ebe9af');}
  }});
  for(const entity of [...g.npcs,...g.mobs.filter(m=>m.alive),p]){
   objects.push({y:entity.py,draw:()=>{
    c.globalAlpha=.25;rect(c,entity.px-10,entity.py-4,21,5,'#233426');c.globalAlpha=1;
    if(entity.hitUntil>time&&Math.floor(time/60)%2===0)c.globalAlpha=.45;
    if(entity.sprite==='guardian'||entity.sprite==='mossling'){
     const cell=entity.boss?64:48,frame=Math.floor(time/(entity.moving?130:250))%8,anchor=entity.boss?56:42;
     c.drawImage(g.assets.images[entity.sprite],frame*cell,0,cell,cell,Math.round(entity.px-cell/2),Math.round(entity.py-anchor),cell,cell);
    }else if(!(this.npcOverlay&&g.npcStyle==='vector'&&entity.kind==='npc')){
     drawCharacter(c,g.assets,entity,time,g.npcStyle);
    }
    c.globalAlpha=1;
    if(entity.max&&entity.hp<entity.max){rect(c,entity.px-15,entity.py-(entity.boss?64:44),30,4,'#283427');rect(c,entity.px-14,entity.py-(entity.boss?63:43),Math.round(28*entity.hp/entity.max),2,entity.boss?'#cd9651':'#ba5741');}
    if(entity.kind==='npc'&&entity.id==='elder'&&!p.questReward){const y=entity.py-49+Math.round(Math.sin(time/450)*2);rect(c,entity.px-3,y-2,8,13,'#3d482c');c.fillStyle='#e4c85e';c.font='bold 12px Georgia';c.fillText('!',entity.px-1,y+8);}
   }});
  }
  // Fishing line and bobber from the little dock.
  if(g.map.hasPier){const fx=27*TILE+14,fy=21*TILE+4;c.strokeStyle='#bfa87e';c.lineWidth=1;c.beginPath();c.moveTo(fx,fy-18);c.lineTo(fx+34,fy+12);c.lineTo(fx+34,fy+40);c.stroke();rect(c,fx+32,fy+40+Math.round(Math.sin(time/650)),3,3,'#d87752');}
  objects.sort((a,b)=>a.y-b.y);
  for(const o of objects)if(o.y>g.camera.y-100&&o.y<g.camera.y+h+180)o.draw();
  // Attack arcs and hit particles are kept on the same native pixel grid.
  if(p.attackUntil>time){
   const progress=(time-p.attackStarted)/360,angles={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2};
   const a=angles[p.attackDirection||p.direction]-1.15+progress*2.3;c.globalAlpha=.85;
   for(let i=0;i<8;i++){const angle=a-i*.07;rect(c,p.px+Math.cos(angle)*28,p.py-15+Math.sin(angle)*25,2,2,i%2?'#c9e0a0':'#7bb888');}c.globalAlpha=1;
  }
  for(const e of g.effects){
   const age=time-e.time;
   if(e.type==='text'){c.globalAlpha=Math.max(0,1-age/900);c.font='bold 9px Georgia';c.textAlign='center';c.fillStyle='#273526';c.fillText(e.text,e.x+1,e.y-27-age/45+1);c.fillStyle=e.color||'#f1d59b';c.fillText(e.text,e.x,e.y-27-age/45);c.textAlign='left';}
   else{c.globalAlpha=Math.max(0,1-age/450);for(let i=0;i<6;i++){const a=i*Math.PI/3;rect(c,e.x+Math.cos(a)*age/25,e.y-19+Math.sin(a)*age/25,2,2,e.color||'#dbba74');}}
   c.globalAlpha=1;
  }
  // Lantern light, fireplace sparks and smoke: understated and never blurred.
  for(const o of g.map.objects)if(o.glow){
   const x=o.px+9,y=o.py-49,alpha=this.occlusionAlpha.get(o)??1;
   for(let i=3;i>0;i--){c.globalAlpha=(.025+.012*Math.sin(time/350+o.x))*i*alpha;rect(c,x-7-i*4,y-7-i*4,14+i*8,14+i*8,'#ffd16e');}
   c.globalAlpha=alpha;rect(c,x-1,y-1,3,3,'#ffe9a1');c.globalAlpha=1;
  }
  // Forge smoke now rises from the chimney outlet inside drawForgeEffects.
  for(const b of g.map.buildings)if(b.sprite==='inn'){
   const X=(b.x+b.w*.68)*TILE,Y=b.y*TILE+8;
   for(let i=0;i<4;i++){const age=(time/80+i*8)%38;c.globalAlpha=(1-age/38)*.2;rect(c,X+Math.sin(age/9)*4,Y-age*1.3,4+i,4+i,'#c6c6b0');}
   c.globalAlpha=1;
  }
  c.restore();
  if(g.night){c.fillStyle='#13284755';c.fillRect(0,0,w,h);}
  // Warm late-afternoon color grade.
  c.fillStyle='#d5b65408';c.fillRect(0,0,w,h);
  this.drawNPCOverlay();
  this.minimap(document.getElementById('minimap'));
 }
}
