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
  // Verify that the real druid PNG is decoded and mapped to all forty frames,
  // not that the old generated hero silently rendered through the fallback.
  const heroReview=await page.evaluate(async()=>{
   const g=window.tiholesye,hero=g.assets.images.hero;
   const source=await new Promise((ok,fail)=>{
    const img=new Image();img.onload=()=>ok(img);img.onerror=()=>fail(Error('No druid PNG'));
    img.src='/assets/hero-druid-refined.png';
   });
   const ctx=hero.getContext('2d');
   const packed=document.createElement('canvas');
   packed.width=480;packed.height=192;
   const p=packed.getContext('2d');p.imageSmoothingEnabled=false;
   // The new atlas is already baked as 48px cells; no runtime cropping.
   p.drawImage(source,0,0);
   const a=ctx.getImageData(0,0,480,192).data,b=p.getImageData(0,0,480,192).data;
   let diff=0,opaque=0;
   for(let i=0;i<a.length;i+=4){
    opaque+=a[i+3]>160?1:0;
    for(let j=0;j<4;j++)if(a[i+j]!==b[i+j])diff++;
   }
   return {loaded:hero.width===480&&hero.height===192,src:source.width,
    defaultSprite:g.player.sprite,difference:diff,opaque,
    png:hero.toDataURL('image/png').split(',')[1]};
  });
  assert.equal(heroReview.loaded,true,'40 compact 48px atlas cells available');
  assert.equal(heroReview.src,480,'the revised 48px sprite PNG is present');
  assert.equal(heroReview.defaultSprite,'hero','2D druid selected');
  assert.equal(heroReview.difference,0,'new sprite sheet is loaded pixel-for-pixel');
  assert(heroReview.opaque>8000,'all 40 compact poses contain graphics');
  fs.writeFileSync('.qa/hero-druid-sprites.png',Buffer.from(heroReview.png,'base64'));

  // Real Chromium skill controls: mouse button for Q, keyboard R/F, mana and cooldown.
  assert.equal(await page.locator('#skillbar [data-skill]').count(),3,'three accessible druid abilities');
  await page.evaluate(()=>{const g=window.tiholesye;g.player.hp=40;g.player.mana=60;});
  await page.locator('#skill-bolt').click();
  assert(await page.evaluate(()=>window.tiholesye.skillCooldowns.bolt>window.tiholesye.time),
    'button casts emerald bolt');
  await page.keyboard.press('r');
  assert(await page.evaluate(()=>window.tiholesye.skillCooldowns.roots>window.tiholesye.time),
    'R keyboard casts roots');
  await page.keyboard.press('f');
  const skillState=await page.evaluate(()=>{
   const g=window.tiholesye;
   return {mana:g.player.mana,hp:g.player.hp,heal:g.skillCooldowns.heal>g.time,
    fx:g.effects.map(e=>e.type)};
  });
  assert(skillState.heal&&skillState.hp>40,'F heals and enters cooldown');
  assert(skillState.mana<60,'skills consume mana');
  assert(skillState.fx.includes('bolt')&&skillState.fx.includes('roots')&&skillState.fx.includes('heal'),
    'effects rendered by the game state');

  const assets=await page.evaluate(()=>{
   const g=window.tiholesye;
   return g.npcs.map(n=>{
    const im=g.assets.images['vector-'+n.sprite];
    return {name:n.sprite,width:im.naturalWidth,height:im.naturalHeight,complete:im.complete};
   });
  });
  assert.equal(assets.length,7,'all seven village residents have vector art');
  for(const a of assets){
   assert(a.complete && a.width===384 && a.height===1536,
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
  const hiRes=await page.evaluate(()=>{
   const overlay=document.getElementById('npcOverlay');
   const c=overlay.getContext('2d'),data=c.getImageData(0,0,overlay.width,overlay.height).data;
   let nonTransparent=0;
   for(let i=3;i<data.length;i+=4)if(data[i]>16)nonTransparent++;
   return {width:overlay.width,height:overlay.height,cssWidth:overlay.clientWidth,
           nonTransparent,imageRendering:getComputedStyle(overlay).imageRendering};
  });
  assert(hiRes.nonTransparent>200,'Vector NPC overlay should contain visible artwork');
  assert(hiRes.width>=hiRes.cssWidth,'Vector art must be drawn at device resolution');
  assert.notEqual(hiRes.imageRendering,'pixelated','Vector art layer must not use nearest-neighbor scaling');
  await page.screenshot({path:'.qa/npc-vector-in-game.png'});

  await page.reload();
  await page.waitForFunction(()=>window.tiholesye?.ready);
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'vector','style should survive a refresh');
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),7);
  await page.evaluate(()=>window.tiholesye.ui.settings());
  await page.locator('#npcStyle').click();
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'pixel');
  await page.evaluate(()=>window.tiholesye.ui.close());
  await page.waitForTimeout(220);
  await page.screenshot({path:'.qa/npc-pixel-in-game.png'});

  // Real browser regression: dozens of rapid pointer retargets must never
  // snap the druid, change facing during an unfinished step, or rewind gait.
  const rapidClickResult=await page.evaluate(()=>{
   const g=window.tiholesye,p=g.player,T=32;
   const saved={x:p.x,y:p.y,px:p.px,py:p.py,step:p.step,moving:p.moving,
    direction:p.direction,animationTime:p.animationTime,animationState:p.animationState,
    camera:{...g.camera},path:g.path,target:g.target};
   let area;
   for(let y=5;y<g.map.height-5&&!area;y++)for(let x=5;x<g.map.width-5;x++){
    const cells=[[x,y],[x+1,y],[x+2,y],[x+1,y-1],[x+1,y+1]];
    if(cells.every(([cx,cy])=>!g.blocked(cx,cy))&&
       g.npcs.every(n=>Math.abs(n.x-x)>5||Math.abs(n.y-y)>5)){
     area={x,y};break;
    }
   }
   if(!area)throw Error('No free test corridor');
   const {x,y}=area;
   Object.assign(p,{x,y,px:(x+.5)*T,py:(y+.8)*T,step:null,moving:false,
    animationTime:0,animationState:'idle',direction:'down'});
   g.camera={x:(x-3)*T,y:(y-3)*T};g.path=[];g.target=null;
   const tap=(cx,cy)=>{
    const rect=g.canvas.getBoundingClientRect();
    g.click({button:0,clientX:((cx+.5)*T-g.camera.x)/g.canvas.width*rect.width+rect.left,
     clientY:((cy+.5)*T-g.camera.y)/g.canvas.height*rect.height+rect.top});
   };
   const check=(condition,message)=>{if(!condition)throw Error('Rapid-click regression: '+message);};
   try{
    tap(x+1,y);g.update(0);g.update(85);
    const step=p.step,atX=p.px,atY=p.py,gait=p.animationTime;
    check(!!step&&p.direction==='right','expected an active rightward step');
    for(let n=0;n<45;n++)tap(x+1,y);
    check(p.step===step&&p.px===atX&&p.py===atY,'same-point clicks interrupted motion');
    tap(x+2,y);const pending=g.path;
    for(let n=0;n<20;n++)tap(x+2,y);
    check(p.step===step&&g.path===pending,'repeated target restarted the queue');
    tap(x+1,y-1);
    check(p.step===step&&p.direction==='right','new target flipped facing mid-tile');
    check(g.path.length===1&&g.path[0].x===x+1&&g.path[0].y===y-1,
     'new route should start at the committed tile');
    check(p.animationTime===gait,'clicks reset stride');
    g.update(215);
    check(p.x===x+1&&p.px===(x+1.5)*T&&p.py===(y+.8)*T,'step did not land smoothly');
    check(p.direction==='up'&&p.step?.y===y-1,'hero did not turn at cell boundary');
    return {clicks:67,zeroPixelJump:true,turnedAfterLanding:true};
   }finally{
    Object.assign(p,{x:saved.x,y:saved.y,px:saved.px,py:saved.py,
     step:saved.step,moving:saved.moving,direction:saved.direction,
     animationTime:saved.animationTime,animationState:saved.animationState});
    g.camera=saved.camera;g.path=saved.path;g.target=saved.target;
   }
  });
  assert(rapidClickResult.zeroPixelJump&&rapidClickResult.turnedAfterLanding,
   'fast browser clicking preserves motion and direction');
  console.log('PASS: Chromium completed '+rapidClickResult.clicks+
    ' rapid mouse retargets without coordinate snap, flipped facing or gait reset.');

  assert.deepEqual(errors,[]);
  console.log('PASS: seven SVG NPC instances decode in Chromium; pixel and vector contact sheets differ; settings click, instant switch, storage persistence, reload and reversibility all work.');
 }finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
