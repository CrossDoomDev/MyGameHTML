const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=process.cwd(), errors=[];
 fs.mkdirSync('.qa',{recursive:true});
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(req.url.split('?')[0]);
  const file=path.join(root,rel==='/'?'index.html':rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>localStorage.setItem('tiholesye-model','2d'));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.tiholesye?.ready);
  await page.evaluate(()=>{window.tiholesye.mobs.forEach(m=>m.alive=false);});
  assert.equal(await page.evaluate(()=>window.tiholesye.player.sprite),'hero');
  const startX=await page.evaluate(()=>window.tiholesye.player.x);
  await page.keyboard.down('ArrowRight');await page.waitForFunction(x=>window.tiholesye.player.x>x,startX);await page.keyboard.up('ArrowRight');await page.waitForTimeout(300);
  assert(await page.evaluate(()=>window.tiholesye.player.x)>startX,'keyboard walk moves player');
  assert.equal(await page.evaluate(()=>window.tiholesye.player.moving),false);
  await page.keyboard.press('Space');
  assert(await page.evaluate(()=>window.tiholesye.player.attackUntil>window.tiholesye.time),'keyboard starts attack');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.tiholesye.player.attackDirection),'right');
  await page.keyboard.up('ArrowUp');await page.waitForTimeout(400);
  await page.screenshot({path:'.qa/game-2d.png'});
  const data=await page.evaluate(async()=>{
   const {drawCharacter}=await import('/src/assets.js');const g=window.tiholesye;
   const canvas=document.createElement('canvas');canvas.width=800;canvas.height=440;
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#40583b';c.fillRect(0,0,800,440);
   for(let row=0;row<4;row++)for(let frame=0;frame<10;frame++){
    c.fillStyle='#789a66';c.fillRect(frame*80,row*80+64,80,1);
    c.drawImage(g.assets.images.hero,frame*80,row*80,80,80,frame*80,row*80,80,80);
   }
   for(let row=0;row<2;row++)g.npcs.forEach((npc,i)=>drawCharacter(c,g.assets,{...npc,direction:row?'up':'down',px:80+i*160,py:370+row*55},0));
   return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync('.qa/characters.png',Buffer.from(data,'base64'));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.screenshot({path:'.qa/mobile-2d.png'});
  await page.evaluate(()=>window.tiholesye.setModelMode('3d'));assert.equal(await page.evaluate(()=>window.tiholesye.player.sprite),'hero3d');
  assert.deepEqual(errors,[]);
  console.log('PASS: Chrome load, real keyboard movement/attack, attack facing, 2D/3D switch, mobile rendering, no JS or asset errors.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
