const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const root=process.cwd(),errors=[];
 fs.mkdirSync('.qa',{recursive:true});
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(req.url.split('?')[0]);
  const file=path.join(root,relative==='/'?'index.html':relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
   res.end(data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&!response.url().includes('favicon'))errors.push(response.status()+' '+response.url());});
  await page.addInitScript(()=>{
   localStorage.setItem('tiholesye-model','2d');
   // Advance the real game with exact deltas so checks include each tile seam.
   window.requestAnimationFrame=()=>0;
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.tiholesye?.ready);
  const artwork=await page.evaluate(async()=>{
   const {drawCharacter,directions}=await import('/src/assets.js');
   const game=window.tiholesye;
   const source=new Image();source.src='/assets/hero-walk.png';await source.decode();
   const expected=document.createElement('canvas');expected.width=expected.height=320;
   const ec=expected.getContext('2d');ec.drawImage(source,0,0);
   const atlas=document.createElement('canvas');atlas.width=800;atlas.height=320;
   const ac=atlas.getContext('2d');ac.drawImage(game.assets.images.hero,0,0);
   const cells=[];
   for(let row=0;row<4;row++)for(let pose=0;pose<4;pose++){
    const wanted=ec.getImageData(pose*80,row*80,80,80).data;
    const loaded=ac.getImageData((pose+2)*80,row*80,80,80).data;
    let mismatchedBytes=0,opaquePixels=0;
    for(let i=0;i<wanted.length;i++)if(wanted[i]!==loaded[i])mismatchedBytes++;
    for(let i=3;i<wanted.length;i+=4)if(wanted[i])opaquePixels++;
    cells.push({direction:directions[row],pose,mismatchedBytes,opaquePixels});
   }
   const rendered=document.createElement('canvas');rendered.width=rendered.height=80;
   const context=rendered.getContext('2d');context.imageSmoothingEnabled=false;
   const capture=()=>{
    context.clearRect(0,0,80,80);let operation;
    drawCharacter({drawImage(...args){operation=args;context.drawImage(...args);}},game.assets,{...game.player,px:40,py:64},game.time);
    const pixels=context.getImageData(0,0,80,80).data;
    let bottom=-1;
    for(let y=0;y<80;y++)for(let x=0;x<80;x++)if(pixels[(y*80+x)*4+3]>=128)bottom=y;
    return {column:operation[1]/80,row:operation[2]/80,bottom,x:game.player.x,y:game.player.y,moving:game.player.moving,state:game.player.animationState,phase:game.player.animationTime};
   };
   game.npcs=[];game.mobs=[];
   for(let y=11;y<=21;y++)for(let x=11;x<=21;x++)game.clearSpawn(x,y);
   window.__heroWalkTest={
    reset(direction='down'){
     game.keys.clear();game.path=[];game.target=null;game.stick={x:0,y:0};
     Object.assign(game.player,{x:16,y:16,px:16.5*32,py:16.8*32,direction,moving:false,step:null,attackUntil:0,attackStarted:0,animationState:'idle',animationDirection:direction,animationTime:0});
    },
    tick(dt){game.time+=dt;game.update(dt);return capture();}
   };
   const sheet=document.createElement('canvas');sheet.width=1152;sheet.height=872;
   const sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#40583b';sc.fillRect(0,0,sheet.width,sheet.height);
   const columns=[0,2,3,4,5,0],labels=['idle','contact A','passing B','contact B','passing A','idle'];
   for(let row=0;row<4;row++)for(let col=0;col<columns.length;col++){
    const x=col*192,y=row*218;
    sc.fillStyle='#efe4bf';sc.font='14px sans-serif';sc.fillText(directions[row]+' / '+labels[col],x+8,y+18);
    sc.fillStyle='#789a66';sc.fillRect(x,y+24+44*4,192,1);
    sc.drawImage(game.assets.images.hero,columns[col]*80+16,row*80+20,48,48,x,y+24,192,192);
   }
   return {sourceSize:[source.width,source.height],cells,sheet:sheet.toDataURL('image/png').split(',')[1]};
  });
  assert.deepEqual(artwork.sourceSize,[320,320],'walk source has four 80px poses in four directions');
  for(const cell of artwork.cells){
   assert.equal(cell.mismatchedBytes,0,cell.direction+' pose '+cell.pose+' must load the replacement artwork exactly');
   assert(cell.opaquePixels>100,cell.direction+' pose '+cell.pose+' must contain visible artwork');
  }
  fs.writeFileSync('.qa/hero-walk-browser.png',Buffer.from(artwork.sheet,'base64'));
  const tick=dt=>page.evaluate(dt=>window.__heroWalkTest.tick(dt),dt);
  const reset=direction=>page.evaluate(direction=>window.__heroWalkTest.reset(direction),direction);
  const directions=['down','left','right','up'];
  const keys=['ArrowDown','ArrowLeft','ArrowRight','ArrowUp'];
  const offsets=[[0,1],[-1,0],[1,0],[0,-1]];
  for(let row=0;row<4;row++){
   await reset(directions[row]);await page.keyboard.down(keys[row]);
   const frames=[await tick(0)];
   for(let i=0;i<16;i++)frames.push(await tick(52.5));
   await page.keyboard.up(keys[row]);
   assert.deepEqual(frames.map(frame=>frame.column),[2,2,3,3,4,4,5,5,2,2,3,3,4,4,5,5,2],directions[row]+' renders two complete alternating cycles');
   assert(frames.every(frame=>frame.row===row&&frame.moving),directions[row]+' keeps its facing and movement across tile seams');
   for(const boundary of [4,8,12,16]){
    const frame=frames[boundary],tiles=boundary/4;
    assert.equal(frame.x,16+offsets[row][0]*tiles,directions[row]+' reaches the expected x tile');
    assert.equal(frame.y,16+offsets[row][1]*tiles,directions[row]+' reaches the expected y tile');
    assert.equal(frame.phase,boundary*52.5,'tile boundary retains the stride clock');
   }
  }
  await reset('right');await page.keyboard.down('ArrowRight');
  assert.equal((await tick(0)).column,2);
  assert.equal((await tick(157.5)).column,3);
  await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowUp');
  let turned=await tick(52.5);
  assert.deepEqual([turned.column,turned.row,turned.phase],[4,3,210],'a turn at the tile seam advances to the opposite contact');
  assert.equal((await tick(105)).column,5);
  await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowLeft');
  turned=await tick(105);
  assert.deepEqual([turned.column,turned.row,turned.phase],[2,1,420],'the next turn wraps the existing cycle');
  assert.equal((await tick(105)).column,3);
  await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowDown');
  turned=await tick(105);
  assert.deepEqual([turned.column,turned.row,turned.phase],[4,0,630],'a third turn retains the alternating contact');
  await page.keyboard.up('ArrowDown');
  const stopped=await tick(210);
  assert.deepEqual([stopped.column,stopped.state,stopped.moving],[0,'idle',false],'finishing the current step returns to grounded idle');
  assert(stopped.bottom>=62&&stopped.bottom<=64,'idle boots rest at the 64px ground anchor');
  await page.keyboard.down('ArrowRight');
  const restarted=await tick(0);await page.keyboard.up('ArrowRight');
  assert.deepEqual([restarted.column,restarted.phase,restarted.moving],[2,0,true],'restarting starts at the first contact pose');
  assert(restarted.bottom>=62&&restarted.bottom<=64,'the first walking contact remains grounded');
  assert.deepEqual(errors,[],'browser has no JavaScript or asset errors');
  console.log('PASS: 16 exact Canvas walk cells, all-direction sustained gait, tile seams, turns, grounded idle/restart; .qa/hero-walk-browser.png.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
