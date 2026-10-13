export const TILE=32, WIDTH=40, HEIGHT=30;
export const SPAWN={x:17,y:15};
export const rand=(x,y,seed=0)=>{let n=Math.imul(x+13+seed,374761393)+Math.imul(y+29,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295};
export const buildings=[
 {id:'inn',name:'Таверна «Зелёный лист»',sprite:'inn',x:9,y:10,w:6,h:5,doorX:12,doorY:14},
 {id:'forge',name:'Кузница Брана',sprite:'forge',x:18,y:10,w:4,h:5,doorX:20,doorY:14},
 {id:'cottage',name:'Дом старосты',sprite:'cottage',x:13,y:18,w:5,h:4,doorX:15,doorY:21},
 {id:'cabin',name:'Дом травницы',sprite:'cabin',x:7,y:19,w:4,h:4,doorX:9,doorY:22},
 {id:'market',name:'Лавка Миры',sprite:'market',x:25,y:12,w:4,h:3,doorX:27,doorY:14}
];
const inRect=(x,y,r)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
export function createMap(){
 const terrain=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>{
  if(x>=22&&x<=24)return 'water';
  if((x===17)||(y===15&&x>=3&&x<=34)||(y===22&&x>=5&&x<=31)||(y===17&&x>=17&&x<=30)||(x===28&&y>=14&&y<=23)||(x===12&&y>=14&&y<=15)||(x===15&&y>=21&&y<=22)||(x===9&&y>=22&&y<=24))return 'path';
  return 'grass';
 }));
 for(let y=16;y<=17;y++)for(let x=21;x<=25;x++)terrain[y][x]='bridge';
 const objects=[];
 const add=(sprite,x,y,extra={})=>objects.push({sprite,x,y,px:(x+.5)*TILE,py:(y+1)*TILE,...extra});
 const nearRoad=(x,y)=>terrain[y]?.[x]!=='grass'||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>terrain[y+dy]?.[x+dx]==='path');
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  if(terrain[y][x]!=='grass'||buildings.some(b=>inRect(x,y,{x:b.x-1,y:b.y-1,w:b.w+2,h:b.h+2})))continue;
  const core=x>=6&&x<=29&&y>=10&&y<=24;
  const edge=x<2||y<2||x>=WIDTH-2||y>=HEIGHT-2;
  const clear=(x>=7&&x<=14&&y>=16&&y<=18)||(x>=29&&x<=36&&y>=4&&y<=10);
  if(!clear&&!nearRoad(x,y)&&(edge||rand(x,y)>(core?.78:.43))){
   add(rand(x,y,7)>.55?'oak':'pine',x,y,{block:true,variant:rand(x,y,2),tree:true});
  }else if(!clear&&rand(x,y,8)>.88)add('bush',x,y,{variant:rand(x,y,2)});
 }
 // Landmarks are authored on the same 32px grid.
 for(const [x,y,sprite] of [[7,12,'pine'],[15,11,'pine'],[15,16,'oak'],[12,18,'pine'],[19,18,'pine'],[6,18,'oak'],[19,24,'oak'],[26,10,'oak'],[29,11,'pine'],[28,19,'oak'],[21,21,'pine']]){
  const existing=objects.findIndex(o=>o.x===x&&o.y===y); if(existing>=0)objects.splice(existing,1);
  if(terrain[y][x]==='grass')add(sprite,x,y,{block:true,tree:true,variant:.5});
 }
 for(const [x,y] of [[8,14],[15,14],[18,9],[21,15],[20,19],[18,23],[29,16],[26,21],[12,22]])add('lamp',x,y,{block:true,glow:true});
 for(const [x,y] of [[8,14],[14,14],[21,14],[26,15],[29,14],[12,21],[18,21],[6,22]])add('barrel',x,y,{block:true});
 for(const [x,y] of [[7,14],[15,14],[19,14],[29,14]])add('crates',x,y,{block:true,offset:10});
 add('logs',11,22,{block:true});add('anvil',19,15,{block:true});
 for(let x=7;x<=12;x++){add('fence',x,16,{block:true});add('fence',x,19,{block:true});}
 for(let y=17;y<19;y++){add('fence',7,y,{block:true});add('fence',12,y,{block:true});}
 for(let x=8;x<=11;x++)for(let y=17;y<=18;y++)add('crops',x,y,{offset:3});
 for(let x=10;x<=14;x++)add('fence',x,24,{block:true});
 for(let x=19;x<=21;x++)add('fence',x,15,{block:true,offset:8});
 // Keep an approach to the forge and a clear route toward the bridge.
 const clearCells=[[17,15],[17,14],[17,16],[17,17],[20,15],[21,16],[25,16],[26,16],[27,15],[12,15],[15,22],[9,23],[20,14]];
 for(const [x,y] of clearCells){for(let i=objects.length-1;i>=0;i--)if(objects[i].x===x&&objects[i].y===y)objects.splice(i,1);}
 const blocked=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>{
  return x===0||y===0||x===WIDTH-1||y===HEIGHT-1||terrain[y][x]==='water'||
   buildings.some(b=>inRect(x,y,b))||objects.some(o=>o.block&&o.x===x&&o.y===y);
 }));
 return {terrain,objects,buildings,blocked};
}
export function isBlocked(map,x,y){return !Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=WIDTH||y>=HEIGHT||map.blocked[y][x];}
export function findPath(map,sx,sy,tx,ty,occupied=()=>false){
 if(isBlocked(map,tx,ty)||occupied(tx,ty))return [];
 const key=(x,y)=>y*WIDTH+x,start=key(sx,sy),end=key(tx,ty);
 const queue=[[sx,sy]],seen=new Set([start]),parents=new Map();
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];if(key(x,y)===end){
   const result=[];let at=end;
   while(at!==start){result.push({x:at%WIDTH,y:Math.floor(at/WIDTH)});at=parents.get(at);}
   return result.reverse();
  }
  for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,k=key(nx,ny);
   if(!seen.has(k)&&!isBlocked(map,nx,ny)&&!occupied(nx,ny)){seen.add(k);parents.set(k,key(x,y));queue.push([nx,ny]);}
  }
 }
 return [];
}
