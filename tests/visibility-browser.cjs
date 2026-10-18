const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=process.cwd(),errors=[];fs.mkdirSync('.qa',{recursive:true});
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,rel==='/'?'index.html':rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{localStorage.setItem('tiholesye-model','2d');window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.tiholesye?.ready);
  const scene=await page.evaluate(async()=>{
   const {coversActor,sceneryPlacement}=await import('/src/visibility.js');
   const g=window.tiholesye;g.mobs=[];g.renderer.draw(g.time);
   const important=[...g.npcs,...g.herbs,...g.map.buildings.map(b=>({px:(b.doorX+.5)*32,py:(b.doorY+.8)*32}))];
   return {npcCount:g.npcs.length,coverings:g.map.objects.filter(o=>important.some(n=>coversActor(sceneryPlacement(o,g.assets.environment[o.sprite]),n,g.assets.environmentMasks[o.sprite]))).map(o=>o.sprite)};
  });
  assert.equal(scene.npcCount,5);assert.deepEqual(scene.coverings,[],'existing scenery must not hide residents, pickups or doorways');
  await page.screenshot({path:'.qa/clear-village.png'});
  const fading=await page.evaluate(async()=>{
   const {sceneryPlacement,buildingPlacement,coversActor}=await import('/src/visibility.js');
   const g=window.tiholesye,p=g.player,results=[];
   const originalObjects=g.map.objects,originalBuildings=g.map.buildings;g.map.objects=[];g.map.buildings=[];
   const reset=()=>{Object.assign(p,{px:560,py:505.6,x:17,y:15,hitUntil:0,step:null,moving:false,attackUntil:0});};
   const draw=dt=>{g.time+=dt;g.renderer.draw(g.time);};
   for(const sprite of ['oak','pine','bush','lamp','barrel','crates','fence','logs','anvil','crops']){
    reset();const object={sprite,px:p.px,py:p.py+8,tree:['oak','pine'].includes(sprite)};
    g.map.objects=[object];const placement=sceneryPlacement(object,g.assets.environment[sprite]);
    if(!coversActor(placement,p,g.assets.environmentMasks[sprite]))throw Error('Expected actual sprite pixels to overlap player: '+sprite);
    draw(16);const start=g.renderer.occlusionAlpha.get(object);draw(300);const faded=g.renderer.occlusionAlpha.get(object);
    p.py=object.py+60;draw(16);const recovering=g.renderer.occlusionAlpha.get(object);draw(500);const restored=g.renderer.occlusionAlpha.get(object);
    results.push({sprite,start,faded,recovering,restored,contextAlpha:g.ctx.globalAlpha});
   }
   reset();const building={sprite:'cottage',x:15,y:12,w:5,h:4};g.map.objects=[];g.map.buildings=[building];
   const placement=buildingPlacement(building,g.assets.environment.cottage);p.px=placement.x+placement.width/2;p.py=placement.depth-12;
   if(!coversActor(placement,p,g.assets.environmentMasks.cottage))throw Error('Building must overlap player in test');
   draw(16);draw(300);const buildingAlpha=g.renderer.occlusionAlpha.get(building);
   // Two overlapping crowns must both fade, including scenery placed later.
   reset();const pair=['oak','pine'].map(sprite=>({sprite,px:p.px,py:p.py+8,tree:true}));g.map.objects=pair;g.map.buildings=[];draw(16);draw(400);
   const multiple=pair.map(o=>g.renderer.occlusionAlpha.get(o));
   g.map.objects=originalObjects;g.map.buildings=originalBuildings;reset();
   return {results,buildingAlpha,multiple};
  });
  for(const r of fading.results){assert(r.start>.25&&r.start<1,r.sprite+' fades smoothly');assert(r.faded<.28,r.sprite+' becomes transparent');assert(r.recovering>r.faded,r.sprite+' restores smoothly');assert(r.restored>.99,r.sprite+' becomes solid again');assert.equal(r.contextAlpha,1,'transparency does not leak into player/UI');}
  assert(fading.buildingAlpha<.28);assert(fading.multiple.every(a=>a<.28));
  await page.evaluate(()=>{const g=window.tiholesye;g.time+=500;g.renderer.draw(g.time);});
  const clickTile=async(x,y)=>{const pos=await page.evaluate(({x,y})=>{const g=window.tiholesye,r=g.canvas.getBoundingClientRect();return {x:r.left+((x+.5)*32-g.camera.x)/g.canvas.width*r.width,y:r.top+((y+.5)*32-g.camera.y)/g.canvas.height*r.height};},{x,y});await page.mouse.click(pos.x,pos.y);};
  for(const [x,y]of [[22,15],[19,12],[11,15]]){
   await page.evaluate(()=>{window.tiholesye.path=[{x:18,y:15}];});await clickTile(x,y);
   assert.deepEqual(await page.evaluate(()=>[window.tiholesye.path.length,window.tiholesye.player.moving,window.tiholesye.target]),[0,false,null],'blocked click must never substitute an entrance or actor approach');
  }
  await clickTile(18,15);
  assert(await page.evaluate(()=>window.tiholesye.path.at(-1)?.x===18&&window.tiholesye.path.at(-1)?.y===15));
  await page.evaluate(()=>{const g=window.tiholesye;g.time+=16;g.update(16);g.time+=70;g.update(70);g.renderer.draw(g.time);});
  const stopped=await page.evaluate(()=>[window.tiholesye.player.px,window.tiholesye.player.py]);await clickTile(22,15);
  await page.evaluate(()=>{const g=window.tiholesye;for(let i=0;i<10;i++){g.time+=50;g.update(50);}});
  assert.deepEqual(await page.evaluate(()=>[window.tiholesye.player.px,window.tiholesye.player.py]),stopped,'invalid click stops mid-step immediately');
  await clickTile(17,15);await page.evaluate(()=>{const g=window.tiholesye;for(let i=0;i<20;i++){g.time+=50;g.update(50);}});
  assert.deepEqual(await page.evaluate(()=>[window.tiholesye.player.x,window.tiholesye.player.y,window.tiholesye.player.px,window.tiholesye.player.py]),[17,15,560,505.6]);
  await page.evaluate(()=>{const g=window.tiholesye;g.map.objects.push({sprite:'oak',px:g.player.px,py:g.player.py+8,tree:true});g.time+=500;g.renderer.draw(g.time);g.time+=500;g.renderer.draw(g.time);});
  await page.screenshot({path:'.qa/player-behind-tree.png'});
  await page.evaluate(()=>window.tiholesye.setModelMode('3d'));
  await page.evaluate(()=>{const g=window.tiholesye;g.time+=400;g.renderer.draw(g.time);});
  assert(await page.evaluate(()=>window.tiholesye.renderer.occlusionAlpha.get(window.tiholesye.map.objects.at(-1))<.28),'3D hero also reveals behind scenery');
  assert.deepEqual(errors,[]);
  console.log('PASS: five clear NPC sightlines, ten prop types + buildings + multiple occluders, fade/restore in 2D/3D, real blocked/valid clicks and immediate mid-step stop.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
