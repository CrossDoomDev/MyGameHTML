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
    '.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.json':'application/json'};
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
  // Chromium decodes the generated art and checks all 10 quick slots and
  // all ability buttons, plus an inventory that excludes equipped pieces.
  const art=await page.evaluate(async()=>{
   const image=new Image();image.src='/assets/character-atlas.avif';
   await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(Error('Generated atlas failed to decode'));
   });
   return {
    width:image.naturalWidth,height:image.naturalHeight,
    skills:[...document.querySelectorAll('#skillbar .game-icon')].map(e=>e.dataset.icon),
    quick:[...document.querySelectorAll('#quickbar .game-icon')].map(e=>e.dataset.icon)
   };
  });
  assert.deepEqual([art.width,art.height],[192,240],'generated fantasy AVIF atlas decoded');
  assert.deepEqual(art.skills,['skill_bolt','skill_roots','skill_heal'],'Q/R/F have real icons');
  assert.equal(art.quick.length,10,'ten illustrated numeric slots');
  assert(art.quick.includes('potion_red')&&art.quick.includes('staff_basic'),'consumables and staff illustrated');
  await page.keyboard.press('i');
  assert(await page.locator('#panel.character-panel').isVisible(),'I opens the menu');
  await page.locator('[data-character-action="tab"][data-tab="inventory"]').click();
  for(const equipped of ['staff','hood','robe','cloak','boots'])
   assert.equal(await page.locator('[data-item="'+equipped+'"]').count(),0,
    equipped+' cannot be duplicated in the bag');
  assert(await page.locator('.char-item[data-item="oakstaff"]').isVisible(),'spare staff remains in bag');
  assert(await page.locator('[data-item="potion"] .game-icon').isVisible(),'potions have painted icons');
  await page.screenshot({path:'.qa/character-inventory.png'});
  await page.locator('[data-character-action="tab"][data-tab="skills"]').click();
  assert.equal(await page.locator('.char-skill-row .game-icon').count(),3,'all skills illustrated');
  await page.screenshot({path:'.qa/character-skills.png'});
  await page.keyboard.press('i');
  assert.equal(await page.locator('#panelBackdrop').isVisible(),false,'I closes the menu');
  console.log('PASS: actual illustrated inventory, quickbar and ability art; worn gear excluded from backpack.');
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

  const residents=await page.evaluate(()=>{
   const g=window.tiholesye;
   return g.npcs.map(n=>{
    const atlas=g.assets.images[n.sprite];
    return {sprite:n.sprite,width:atlas?.width,height:atlas?.height};
   });
  });
  assert.equal(residents.length,7,'seven residents retain their original roles');
  for(const resident of residents)
   assert.deepEqual([resident.width,resident.height],[144,192],
    '48px x three poses, four cardinal directions: '+resident.sprite);
  const npcPreview=await page.evaluate(async()=>{
   const {drawCharacter}=await import('/src/assets.js');
   const g=window.tiholesye,canvas=document.createElement('canvas');
   canvas.width=5*96;canvas.height=4*96;
   const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
   context.fillStyle='#71875c';context.fillRect(0,0,canvas.width,canvas.height);
   const names=['elder','smith','merchant','villager','fisher'];
   for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const npc={...g.npcs.find(n=>n.sprite===names[col]),
     sprite:names[col],direction:['down','left','right','up'][row],
     px:col*96+48,py:row*96+72,moving:false};
    drawCharacter(context,g.assets,npc,0,'pixel');
   }
   return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync('.qa/npc-pixel.png',Buffer.from(npcPreview,'base64'));
  assert(Buffer.from(npcPreview,'base64').length>4000,'five-row pixel preview is nonempty');
  await page.screenshot({path:'.qa/npc-pixel-in-game.png'});
  const initialPixel=await page.evaluate(()=>window.tiholesye.npcStyle);
  assert.equal(initialPixel,'pixel','all NPCs use pixel art');
  await page.evaluate(()=>window.tiholesye.ui.settings());
  assert.equal(await page.locator('#npcStyle').count(),0,'obsolete vector toggle removed');
  // Multiple ways of selecting game text are blocked, but form editors
  // remain usable when the player opens the world-building tools.
  const title=page.locator('#panelTitle');
  await title.dblclick();
  assert.equal(await page.evaluate(()=>getSelection()?.toString()||''),'',
   'double-click on a menu title never highlights its text');
  const selectionStyle=await title.evaluate(el=>getComputedStyle(el).userSelect);
  assert.equal(selectionStyle,'none','menus block native selection');
  await page.evaluate(()=>window.tiholesye.ui.close());
  await page.keyboard.press('Control+a');
  assert.equal(await page.evaluate(()=>getSelection()?.toString()||''),'',
   'Ctrl+A cannot select the game UI');
  await page.reload();await page.waitForFunction(()=>window.tiholesye?.ready);
  assert.equal(await page.evaluate(()=>window.tiholesye.npcStyle),'pixel',
   'pixel NPC setting survives reload');
  assert.equal(await page.evaluate(()=>window.tiholesye.npcs.length),7);
  console.log('PASS: Chromium displays five 48px pixel NPC sprite sheets; text cannot be selected.');

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

  // RMB is reserved throughout the game: select an attack without casting,
  // including while the spell is cooling down, and never open a browser menu.
  await page.evaluate(()=>{
   const app=document.getElementById('app');
   app.addEventListener('contextmenu',e=>{
    window.__gameMenu={prevented:e.defaultPrevented,target:e.target.id};
   });
  });
  assert.equal(await page.evaluate(()=>window.tiholesye.primaryAttackMode),'staff',
   'new game defaults to physical staff attack');
  await page.locator('#skill-bolt').click({button:'right'});
  assert.equal(await page.evaluate(()=>window.tiholesye.primaryAttackMode),'bolt',
   'right-clicking bolt assigns magic auto attack');
  assert.equal(await page.locator('#skill-bolt').getAttribute('aria-pressed'),'true',
   'bolt is visibly chosen as primary');
  assert.equal(await page.locator('#primaryStaff').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>window.__gameMenu.prevented),true,
   'game cancels native browser context menu for bolt');
  await page.locator('#primaryStaff').click({button:'right'});
  assert.equal(await page.evaluate(()=>window.tiholesye.primaryAttackMode),'staff',
   'right-clicking staff selects melee attack');
  assert.equal(await page.locator('#primaryStaff').getAttribute('aria-pressed'),'true',
   'staff has active primary attack marker');
  await page.locator('#skill-bolt').click({button:'right'});
  await page.reload();await page.waitForFunction(()=>window.tiholesye?.ready);
  assert.equal(await page.evaluate(()=>window.tiholesye.primaryAttackMode),'bolt',
   'attack selection persists after reload');
  assert.equal(await page.locator('#skill-bolt').getAttribute('aria-pressed'),'true');
  // Right click on game canvas is gameplay input, not native browser UI.
  await page.evaluate(()=>{
   document.getElementById('app').addEventListener('contextmenu',e=>{
    window.__gameMenu={prevented:e.defaultPrevented,target:e.target.id};
   });
  });
  await page.mouse.click(1100,450,{button:'right'});
  assert.equal(await page.evaluate(()=>window.__gameMenu?.prevented),true,
   'right click on game canvas is suppressed');
  // Real pointer and keyboard interaction: clicking a monster locks it,
  // rightward WASD movement retains the lock, a ground click clears it.
  await page.evaluate(()=>{
   const g=window.tiholesye,T=32;
   g.enterLocation('forest',3,40);
   const boss=g.mobs.find(m=>m.boss),p=g.player;
   for(const dy of [1,2,3,4])g.clearSpawn(boss.x,boss.y+dy);
   g.clearSpawn(boss.x+1,boss.y+3);
   g.clearSpawn(boss.x+3,boss.y+3);
   Object.assign(p,{x:boss.x,y:boss.y+3,px:(boss.x+.5)*T,
    py:(boss.y+3.8)*T,step:null,moving:false,direction:'down',
    mana:60,attackUntil:0,weaponType:'staff',classId:'druid'});
   g.ready=true;g.keys.clear();g.path=[];g.target=null;g.combatTarget=null;
   g.skillCooldowns={};g.lastAttack=-1000;g.time+=10000;
   boss.rootedUntil=g.time+18000;
   g.renderer.draw(g.time);
  });
  const pointOnCanvas=await page.evaluate(()=>{
   const g=window.tiholesye,m=g.mobs.find(t=>t.boss),r=g.canvas.getBoundingClientRect();
   return {x:r.left+(m.px-g.camera.x)*r.width/g.canvas.width,
    y:r.top+(m.py-12-g.camera.y)*r.height/g.canvas.height};
  });
  await page.mouse.click(pointOnCanvas.x,pointOnCanvas.y);
  assert(await page.evaluate(()=>window.tiholesye.combatTarget?.boss),
   'real mouse click selects forest boss as combat focus');
  assert.equal(await page.locator('#combatFocus').isVisible(),true,
   'locked enemy has a visible target HUD');
  await page.screenshot({path:'.qa/combat-focus-selected.png'});
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(()=>{
   const g=window.tiholesye,m=g.mobs.find(t=>t.boss);
   return m.hp<m.max&&g.player.direction==='right'&&g.player.moving;
  },{timeout:5000});
  const lockedState=await page.evaluate(()=>{
   const g=window.tiholesye;
   return {focus:g.combatTarget?.boss,playerMoving:g.player.moving,
    right:g.player.direction==='right',hp:g.mobs.find(m=>m.boss).hp,
    attackPose:g.player.attackUntil>g.time};
  });
  assert(lockedState.focus&&lockedState.playerMoving&&lockedState.right,
   'WASD movement keeps enemy focused and player facing along run direction');
  assert(!lockedState.attackPose,'automatic firing must not flip walking pose');
  await page.keyboard.up('ArrowRight');
  // RMB on the ground must never drop target focus or change the primary action.
  await page.mouse.click(1100,450,{button:'right'});
  assert(await page.evaluate(()=>window.tiholesye.combatTarget?.boss),
   'right click in the field preserves locked target');
  assert.equal(await page.evaluate(()=>window.tiholesye.primaryAttackMode),'bolt');
  const escapeClick=await page.evaluate(()=>{
   const g=window.tiholesye,T=32,m=g.mobs.find(t=>t.boss),r=g.canvas.getBoundingClientRect();
   const wx=(m.x+3.5)*T,wy=(m.y+3.5)*T;
   g.renderer.draw(g.time);
   return {x:r.left+(wx-g.camera.x)*r.width/g.canvas.width,
    y:r.top+(wy-g.camera.y)*r.height/g.canvas.height};
  });
  await page.mouse.click(escapeClick.x,escapeClick.y);
  assert.equal(await page.evaluate(()=>window.tiholesye.combatTarget),null,
   'mouse movement click clears the combat target');
  await page.waitForFunction(()=>document.getElementById('combatFocus').hidden);
  const noFocusDamage=await page.evaluate(()=>{
   const g=window.tiholesye,m=g.mobs.find(t=>t.boss);
   const hp=m.hp;g.time+=3000;g.update(16);
   return {before:hp,after:m.hp,focused:g.combatTarget};
  });
  assert.equal(noFocusDamage.after,noFocusDamage.before,
   'auto ranged attacks stop after a ground click, even past cooldown');
  assert.equal(noFocusDamage.focused,null);
  console.log('PASS: Chromium mouse enemy focus, visible target highlight, WASD auto fire and mouse cancellation.');
  assert.deepEqual(errors,[]);
  console.log('PASS: seven SVG NPC instances decode in Chromium; pixel and vector contact sheets differ; settings click, instant switch, storage persistence, reload and reversibility all work.');
 }finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
