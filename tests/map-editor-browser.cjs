// End-to-end Chromium smoke test for the actual F2 editor UI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const root=process.cwd(),errors=[];
 fs.mkdirSync('.qa',{recursive:true});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);
  });
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.tiholesye?.ready,{timeout:30000});
  await page.keyboard.press('F2');
  assert.equal(await page.locator('#editorPanel').isVisible(),true,'F2 opens editor');
  assert.equal(await page.evaluate(()=>window.tiholesye.editor.active),true);

  // Tileset preview is made of real canvases, with labels secondary to art.
  const terrainCells=page.locator('#editorPanel .editor-sprite');
  assert.equal(await terrainCells.count(),6,'six graphical terrain tiles');
  assert.equal(await page.locator('[data-palette="path"] .editor-sprite').count(),1);
  const tileSamples=await page.evaluate(()=>{
   const pixel=selector=>{
    const c=document.querySelector(selector);
    return Array.from(c.getContext('2d').getImageData(36,36,1,1).data);
   };
   return {
    grass:pixel('[data-palette="grass"] .editor-sprite'),
    path:pixel('[data-palette="path"] .editor-sprite'),
    water:pixel('[data-palette="water"] .editor-sprite')
   };
  });
  assert.notDeepEqual(tileSamples.grass,tileSamples.path,'ground tile preview has real terrain textures');
  assert.notDeepEqual(tileSamples.path,tileSamples.water,'water preview differs from paths');

  for(const layer of ['object','building','npc','mob','herb','portal']){
   await page.locator('[data-layer="'+layer+'"]').click();
   const canvases=page.locator('#editorPanel .editor-sprite');
   assert(await canvases.count()>0,layer+' tileset must have pictures');
   const samples=await page.evaluate(()=>[...document.querySelectorAll('#editorPanel .editor-sprite')].map(c=>
    c.toDataURL('image/png').slice(0,1500)));
   assert(samples.every(x=>x.length>200),layer+' sprite thumbnails must be painted');
   if(['object','building','npc'].includes(layer))
    assert.notEqual(samples[0],samples[1],layer+' palette displays distinct real sprites');
  }
  // The middle button pans without changing active brush or editing anything.
  for(const tool of ['select','move','erase']){
   await page.locator('[data-tool="'+tool+'"]').click();
   const before=await page.evaluate(()=>({
    x:window.tiholesye.camera.x,
    y:window.tiholesye.camera.y,
    count:window.tiholesye.map.objects.length,
    kind:window.tiholesye.editor.kind,
    tool:window.tiholesye.editor.tool
   }));
   await page.mouse.move(510,410);
   await page.mouse.down({button:'middle'});
   await page.mouse.move(430,440,{steps:5});
   await page.mouse.up({button:'middle'});
   await page.waitForTimeout(60);
   const after=await page.evaluate(()=>({
    x:window.tiholesye.camera.x,
    y:window.tiholesye.camera.y,
    count:window.tiholesye.map.objects.length,
    kind:window.tiholesye.editor.kind,
    tool:window.tiholesye.editor.tool
   }));
   assert(after.x>before.x,tool+' middle-button drag pans world');
   assert.equal(after.count,before.count,tool+' middle-drag does not erase or place objects');
   assert.equal(after.tool,before.tool,tool+' middle-drag preserves selected tool');
   assert.equal(after.kind,before.kind,tool+' middle-drag preserves layer');
  }
  await page.locator('[data-layer="terrain"]').click();
  await page.locator('[data-palette="grass"]').click();
  const beforePaintPan=await page.evaluate(()=>({x:window.tiholesye.camera.x,brush:window.tiholesye.editor.brush}));
  await page.mouse.move(510,410);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(450,410,{steps:5});
  await page.mouse.up({button:'middle'});
  await page.waitForTimeout(60);
  assert(await page.evaluate(x=>window.tiholesye.camera.x>x,beforePaintPan.x),'paint brush middle-drag pans');
  assert.equal(await page.evaluate(()=>window.tiholesye.editor.brush),beforePaintPan.brush);

  async function freeCell(){
   return page.evaluate(()=>{
    const g=window.tiholesye,e=g.editor,p=g.player;
    for(let radius=3;radius<=9;radius++){
     for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const x=p.x+dx,y=p.y+dy;
      if(e.canOccupy(x,y)){
       const rect=g.canvas.getBoundingClientRect();
       const sx=rect.left+((x+.5)*32-g.camera.x)*rect.width/g.canvas.width;
       const sy=rect.top+((y+.5)*32-g.camera.y)*rect.height/g.canvas.height;
       if(sx>30&&sy>30&&sx<rect.width-360&&sy<rect.height-30)return {x,y,sx,sy};
      }
     }
    }
    throw Error('No nearby editable cell');
   });
  }
  async function tileScreen(x,y){return page.evaluate(({x,y})=>{
   const g=window.tiholesye,rect=g.canvas.getBoundingClientRect();
   return {sx:rect.left+((x+.5)*32-g.camera.x)*rect.width/g.canvas.width,
    sy:rect.top+((y+.5)*32-g.camera.y)*rect.height/g.canvas.height};
  },{x,y});}
  await page.locator('[data-layer="npc"]').click();
  await page.locator('[data-palette="villager"]').click();
  const target=await freeCell();
  const before=await page.evaluate(()=>window.tiholesye.npcs.length);
  await page.mouse.click(target.sx,target.sy);
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),before+1,'NPC added');
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.at(-1).sprite),'villager');
  assert(await page.evaluate(()=>localStorage.getItem('tiholesye-editor-maps-v1')?.includes('custom-npc')),'edits autosaved');
  await page.locator('[data-tool="select"]').click();
  await page.mouse.click(target.sx,target.sy);
  assert.equal(await page.evaluate(()=>window.tiholesye.editor.resolveSelection()?.kind),'npc','NPC selected');
  await page.locator('#editorName').fill('Новый житель');
  await page.locator('[data-editor="properties"]').click();
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.at(-1).name),'Новый житель');

  // Move using inspector + second-click destination.
  await page.locator('[data-editor="move"]').first().click();
  const dest=await freeCell();
  if(dest.x===target.x&&dest.y===target.y){
   const nearby=await page.evaluate(({x,y})=>{
    const e=window.tiholesye.editor;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(e.canOccupy(x+dx,y+dy))return {x:x+dx,y:y+dy};
    throw Error('No move destination');
   },target);
   Object.assign(dest,nearby,await tileScreen(nearby.x,nearby.y));
  }
  await page.mouse.click(dest.sx,dest.sy);
  assert.deepEqual(await page.evaluate(()=>[window.tiholesye.npcs.at(-1).x,window.tiholesye.npcs.at(-1).y]),[dest.x,dest.y],'NPC moved');
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual(await page.evaluate(()=>[window.tiholesye.npcs.at(-1).x,window.tiholesye.npcs.at(-1).y]),[target.x,target.y],'undo restores NPC position');
  await page.keyboard.down('Control');await page.keyboard.press('y');await page.keyboard.up('Control');
  assert.deepEqual(await page.evaluate(()=>[window.tiholesye.npcs.at(-1).x,window.tiholesye.npcs.at(-1).y]),[dest.x,dest.y],'redo restores moved NPC');

  await page.locator('[data-tool="erase"]').click();
  await page.mouse.click(dest.sx,dest.sy);
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),before,'eraser removes NPC');
  await page.locator('[data-editor="undo"]').click();
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),before+1,'restore deleted NPC');

  await page.locator('[data-layer="terrain"]').click();
  await page.locator('[data-palette="wood"]').click();
  const tile=await freeCell();
  const previous=await page.evaluate(({x,y})=>window.tiholesye.map.terrain[y][x],tile);
  await page.mouse.click(tile.sx,tile.sy);
  assert.equal(await page.evaluate(({x,y})=>window.tiholesye.map.terrain[y][x],tile),'wood','tile painted');
  await page.locator('[data-editor="undo"]').click();
  assert.equal(await page.evaluate(({x,y})=>window.tiholesye.map.terrain[y][x],tile),previous,'tile undo');

  await page.screenshot({path:'.qa/map-editor.png'});
  const downloaded=page.waitForEvent('download');
  await page.locator('[data-editor="export"]').click();
  const download=await downloaded;
  assert.equal(download.suggestedFilename(),'tiholesye-world.json');
  const exported=fs.readFileSync(await download.path(),'utf8');
  assert(JSON.parse(exported).maps.village,'export contains village');
  await page.locator('#editorImport').setInputFiles({name:'tiholesye-world.json',mimeType:'application/json',buffer:Buffer.from(exported)});
  await page.waitForFunction(()=>window.tiholesye.editor.status.includes('Мир импортирован'));

  await page.locator('#editorLocation').selectOption('forest');
  assert.equal(await page.evaluate(()=>window.tiholesye.location),'forest','switch location');
  assert.equal(await page.evaluate(()=>window.tiholesye.mobs.length),7);
  await page.locator('[data-editor="close"]').last().click();
  assert.equal(await page.evaluate(()=>window.tiholesye.editor.active),false,'return to game');

  await page.reload();
  await page.waitForFunction(()=>window.tiholesye?.ready);
  const savedData=await page.evaluate(()=>({
   location:window.tiholesye.location,
   npcsSaved:JSON.parse(localStorage.getItem('tiholesye-editor-maps-v1')).maps.village.npcs.length
  }));
  assert.equal(savedData.location,'forest','scene preserved across reload');
  assert.equal(savedData.npcsSaved,before+1,'NPC edits persisted across reload');
  assert.deepEqual(errors,[],'no browser runtime errors or missing assets');
  console.log('PASS: F2 panel, NPC place/rename/move/delete, undo/redo, painted tiles, JSON export/import and reload.');
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
