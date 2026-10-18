const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const root=process.cwd(),errors=[];
 fs.mkdirSync('.qa',{recursive:true});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==="/"?"/index.html":url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
    '.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{
    localStorage.setItem('tiholesye-model','2d');
    // Seed the old pixel preference only on first navigation: a reload must
    // preserve the user's newly selected illustrated style.
    if(!sessionStorage.getItem('seeded-npc-pixel')){
      localStorage.setItem('tiholesye-npc-style','pixel');
      sessionStorage.setItem('seeded-npc-pixel','1');
    }
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.tiholesye?.ready,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'pixel');

  const assets=await page.evaluate(()=>{
   const g=window.tiholesye;
   return g.npcs.map(n=>{
    const im=g.assets.images['vector-'+n.sprite];
    return {name:n.sprite,width:im.naturalWidth,height:im.naturalHeight,complete:im.complete};
   });
  });
  assert.equal(assets.length,5);
  for(const a of assets){
   assert(a.complete && a.width===(a.name==='elder'?48:384) && a.height===(a.name==='elder'?192:1536),
    'Wrong SVG source dimensions: '+JSON.stringify(a));
  }

  async function contactSheet(style,name){
   const data=await page.evaluate(async mode=>{
    const {drawCharacter}=await import('/src/assets.js');
    const g=window.tiholesye,canvas=document.createElement('canvas');
    canvas.width=5*96;canvas.height=4*96;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#71875c';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){
     const npc={...g.npcs[col],direction:['down','left','right','up'][row],
      px:col*96+48,py:row*96+75};
     ctx.fillStyle='#597146';ctx.fillRect(col*96+5,row*96+78,86,3);
     drawCharacter(ctx,g.assets,npc,0,mode);
    }
    return canvas.toDataURL('image/png').split(',')[1];
   },style);
   const bytes=Buffer.from(data,'base64');
   fs.writeFileSync('.qa/'+name,bytes);
   assert(bytes.length>4000,'Contact sheet unexpectedly empty');
   return createHash('sha256').update(bytes).digest('hex');
  }

  const pixelHash=await contactSheet('pixel','npc-pixel.png');
  const vectorHash=await contactSheet('vector','npc-vector.png');
  assert.notEqual(pixelHash,vectorHash,'Vector and pixel representations must visibly differ');

  await page.evaluate(()=>window.tiholesye.ui.settings());
  const btn=page.locator('#npcStyle');
  await btn.waitFor({state:'visible'});
  assert.equal(await btn.getAttribute('aria-pressed'),'false');
  await btn.click();
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'vector');
  assert.equal(await page.locator('#npcStyle').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('tiholesye-npc-style')),'vector');
  await page.evaluate(()=>window.tiholesye.ui.close());
  await page.waitForTimeout(220);
  await page.screenshot({path:'.qa/npc-vector-in-game.png'});

  await page.reload();
  await page.waitForFunction(()=>window.tiholesye?.ready);
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'vector','style should survive a refresh');
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),5);
  await page.evaluate(()=>window.tiholesye.ui.settings());
  await page.locator('#npcStyle').click();
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'pixel');
  await page.evaluate(()=>window.tiholesye.ui.close());
  await page.waitForTimeout(220);
  await page.screenshot({path:'.qa/npc-pixel-in-game.png'});

  assert.deepEqual(errors,[]);
  console.log('PASS: five SVG NPC sprites decode in Chromium; pixel and vector contact sheets differ; settings click, instant switch, storage persistence, reload and reversibility all work.');
 }finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
