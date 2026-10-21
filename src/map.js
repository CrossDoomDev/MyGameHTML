// Separate connected locations. Every cell is 32 x 32 pixels; no diagonal movement.
export const TILE=32, WIDTH=64, HEIGHT=48;
export const SPAWN={x:30,y:24};
export const rand=(x,y,seed=0)=>{let n=Math.imul(x+13+seed,374761393)+Math.imul(y+29,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295};
export const buildings=[
 {id:'inn',name:'Таверна «Зелёный лист»',sprite:'inn',x:12,y:10,w:6,h:5,doorX:15,doorY:14},
 {id:'forge',name:'Кузница Брана',sprite:'forge',x:29,y:9,w:4,h:5,doorX:31,doorY:13},
 {id:'market',name:'Лавка Миры',sprite:'market',x:44,y:16,w:4,h:3,doorX:46,doorY:18},
 {id:'cottage',name:'Дом старосты',sprite:'cottage',x:12,y:29,w:5,h:4,doorX:14,doorY:32},
 {id:'cabin',name:'Дом травницы',sprite:'cabin',x:35,y:30,w:4,h:4,doorX:37,doorY:33},
 {id:'cabin-west',name:'Дом лесника',sprite:'cabin',x:7,y:34,w:4,h:4,doorX:9,doorY:37},
 {id:'cottage-east',name:'Дом ремесленника',sprite:'cottage',x:48,y:31,w:5,h:4,doorX:50,doorY:34}
];
const inRect=(x,y,r)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
const setTerrain=(terrain,x,y,t)=>{if(terrain[y]?.[x]!==undefined)terrain[y][x]=t;};
function baseMap(id,width,height,fill){
 const terrain=Array.from({length:height},()=>Array(width).fill(fill));
 const objects=[], placed=new Set();
 const add=(sprite,x,y,extra={})=>{
  if(x<1||y<1||x>=width-1||y>=height-1||placed.has(y*width+x))return;
  placed.add(y*width+x);objects.push({sprite,x,y,px:(x+.5)*TILE,py:(y+1)*TILE,...extra});
 };
 const road=(x1,y1,x2,y2,halfWidth=1)=>{
  // L-shaped or straight dirt trails, wide enough for click-to-move.
  let x=x1,y=y1;
  while(true){
   for(let dy=-halfWidth;dy<=halfWidth;dy++)for(let dx=-halfWidth;dx<=halfWidth;dx++)setTerrain(terrain,x+dx,y+dy,'path');
   if(x===x2&&y===y2)break;
   if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);
  }
 };
 return {id,label:id,width,height,terrain,objects,buildings:[],add,road};
}
function finish(m){
 const {width,height,terrain,objects}=m;
 // Every map edge is blocked, except its explicitly marked exits.
 const blocked=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>
   x===0||y===0||x===width-1||y===height-1||terrain[y][x]==='water'||
   m.buildings.some(b=>inRect(x,y,b))||objects.some(o=>o.block&&o.x===x&&o.y===y)
 ));
 for(const portal of m.portals||[])blocked[portal.y][portal.x]=false;
 const {add,road,...map}=m;
 return {...map,blocked};
}
function village(){
 const m=baseMap('village',WIDTH,HEIGHT,'grass');m.label='Деревня Тихолесье';m.buildings=buildings.map(b=>({...b}));
 // Village is an open settlement, NOT a dense wood with scattered cabins.
 // Main square, streets, residential lanes and four roads to the forest.
 m.road(1,24,62,24,2);m.road(30,1,30,46,2);
 m.road(15,15,15,39,1);m.road(15,19,49,19,1);
 m.road(14,34,50,34,1);m.road(46,19,46,35,1);
 m.road(9,37,9,42,1);m.road(9,42,30,42,1);
 for(let y=18;y<=30;y++)for(let x=24;x<=37;x++)setTerrain(m.terrain,x,y,'path');
 // Clear walkable ground around homes and doorways; street furniture in dedicated pockets.
 for(const b of m.buildings){
  for(let y=b.y-2;y<b.y+b.h+3;y++)for(let x=b.x-2;x<b.x+b.w+3;x++)if(m.terrain[y]?.[x]!==undefined)setTerrain(m.terrain,x,y,'path');
 }
 for(const [x,y] of [[21,16],[39,16],[22,29],[40,29],[7,26],[56,27],[20,40],[43,41]])m.add('lamp',x,y,{block:true,glow:true});
 for(const [x,y] of [[9,17],[23,15],[41,23],[54,34],[18,37]])m.add('barrel',x,y,{block:true});
 for(const [x,y] of [[10,18],[40,35],[54,35]])m.add('crates',x,y,{block:true});
 m.add('anvil',34,14,{block:true});m.add('logs',7,31,{block:true});
 for(let x=3;x<=7;x++)m.add('fence',x,28,{block:true});
 for(let x=3;x<=7;x++)m.add('fence',x,33,{block:true});
 for(let y=29;y<=32;y++){m.add('fence',3,y,{block:true});m.add('fence',7,y,{block:true});}
 for(let y=29;y<=32;y++)for(let x=4;x<=6;x++)if(rand(x,y,63)>.25)m.add('crops',x,y);
 // Gardens and fringe vegetation: few trees, mostly decorative flowers/bushes.
 for(let y=2;y<HEIGHT-2;y++)for(let x=2;x<WIDTH-2;x++){
  if(m.terrain[y][x]!=='grass'||m.buildings.some(b=>inRect(x,y,{x:b.x-3,y:b.y-3,w:b.w+6,h:b.h+6})))continue;
  const r=rand(x,y,20),edge=x<5||y<5||x>WIDTH-6||y>HEIGHT-6;
  if(r>(edge?.83:.975))m.add(r>.93?'oak':'pine',x,y,{block:true,tree:true,variant:r});
  else if(r>.89)m.add('bush',x,y,{variant:r});
 }
 m.portals=[
  {x:1,y:24,to:'forest',spawn:{x:96,y:40}},
  {x:62,y:24,to:'forest',spawn:{x:3,y:40}},
  {x:30,y:1,to:'forest',spawn:{x:50,y:76}},
  {x:30,y:46,to:'forest',spawn:{x:50,y:3}}
 ];
 return finish(m);
}
function forest(){
 const w=100,h=80,m=baseMap('forest',w,h,'grass');m.label='Великий лес';
 // Multiple long, non-linear routes and clearings; do not create a tiny arena.
 m.road(1,40,98,40,1);m.road(50,1,50,78,1);
 m.road(9,40,17,22,1);m.road(17,22,37,17,1);m.road(37,17,50,40,1);
 m.road(50,40,69,20,1);m.road(69,20,88,32,1);m.road(88,32,98,40,1);
 m.road(15,57,36,64,1);m.road(36,64,50,40,1);m.road(50,61,80,63,1);
 m.road(80,63,88,40,1);
 for(const [cx,cy,r] of [[16,40,5],[50,40,7],[70,20,4],[34,63,5],[81,63,5],[88,33,5],[49,13,4]]){
  for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++)if((x-cx)**2+(y-cy)**2<=r*r)setTerrain(m.terrain,x,y,'path');
 }
 // Forest is intentionally denser than the village. Canopies overlap visually;
 // solid trunks are spaced out so players can follow 3-cell-wide paths.
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  if(m.terrain[y][x]!=='grass')continue;
  const nearbyRoad=[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>m.terrain[y+dy]?.[x+dx]==='path');
  const r=rand(x,y,43);
  if(r>(nearbyRoad?.87:.63))m.add(r>.81?'oak':'pine',x,y,{block:true,tree:true,variant:r});
  else if(r>.47&&rand(x,y,5)>.52)m.add('bush',x,y,{variant:r});
 }
 // Clear some predictable combat spaces and enemy spawn points.
 m.portals=[
  {x:1,y:40,to:'village',spawn:{x:60,y:24}},
  {x:98,y:40,to:'village',spawn:{x:3,y:24}},
  {x:50,y:1,to:'village',spawn:{x:30,y:44}},
  {x:50,y:78,to:'village',spawn:{x:30,y:3}}
 ];
 return finish(m);
}
function tavern(){
 const m=baseMap('tavern',24,18,'wood');m.label='Таверна «Зелёный лист»';
 // One cozy accessible room, with the exit opposite the serving area.
 for(const [x,y] of [[4,4],[5,4],[4,5],[19,4],[20,4],[19,5],[5,11],[6,11],[18,12],[19,12]])m.add('barrel',x,y,{block:true});
 for(const [x,y] of [[9,4],[10,4],[11,4],[12,4]])m.add('crates',x,y,{block:true});
 for(const [x,y] of [[3,9],[20,9]])m.add('lamp',x,y,{block:true,glow:true});
 m.portals=[{x:12,y:16,to:'village',spawn:{x:15,y:16}}];
 return finish(m);
}
export function createMap(id='village'){return id==='forest'?forest():id==='tavern'?tavern():village();}
export function isBlocked(map,x,y){return !Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=map.width||y>=map.height||map.blocked[y][x];}
export function removeScenery(map,predicate){
 const removed=map.objects.filter(predicate),removedSet=new Set(removed);
 map.objects=map.objects.filter(object=>!removedSet.has(object));
 for(const {x,y} of removed)map.blocked[y][x]=x===0||y===0||x===map.width-1||y===map.height-1||map.terrain[y][x]==='water'||map.buildings.some(b=>inRect(x,y,b))||map.objects.some(o=>o.block&&o.x===x&&o.y===y);
 return removed;
}
// A* with Manhattan heuristic on the same four-direction grid.
export function findPath(map,sx,sy,tx,ty,occupied=()=>false){
 if(isBlocked(map,tx,ty)||occupied(tx,ty))return [];
 if(sx===tx&&sy===ty)return [];
 const key=(x,y)=>y*map.width+x,start=key(sx,sy),end=key(tx,ty);
 const heap=[],score=new Map([[start,0]]),parents=new Map(),closed=new Set();
 const push=(id,priority)=>{const item={id,priority};heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].priority<=priority)break;heap[i]=heap[p];i=p;}heap[i]=item;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let c=2*i+1;if(c+1<heap.length&&heap[c+1].priority<heap[c].priority)c++;if(heap[c].priority>=last.priority)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
 push(start,Math.abs(sx-tx)+Math.abs(sy-ty));
 while(heap.length){
  const current=pop().id;
  if(closed.has(current))continue;
  if(current===end){const result=[];let at=end;while(at!==start){result.push({x:at%map.width,y:Math.floor(at/map.width)});at=parents.get(at);}return result.reverse();}
  closed.add(current);const x=current%map.width,y=Math.floor(current/map.width);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,id=key(nx,ny);
   if(closed.has(id)||isBlocked(map,nx,ny)||occupied(nx,ny))continue;
   const next=score.get(current)+1;
   if(next<(score.get(id)??Infinity)){parents.set(id,current);score.set(id,next);push(id,next+Math.abs(nx-tx)+Math.abs(ny-ty));}
  }
 }
 return [];
}
