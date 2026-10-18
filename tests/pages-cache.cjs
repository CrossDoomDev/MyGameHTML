const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const root=path.resolve(__dirname,'..'),fixture=path.join(root,'.qa/cache-fixture');
 const host=path.join(root,'.qa/pages-server'),out=path.join(host,'MyGameHTML');
 const {buildPages}=await import(pathToFileURL(path.join(root,'tools/build-pages.mjs')));
 await fs.mkdir(path.join(fixture,'tools'),{recursive:true});
 for(const name of ['src','assets'])await fs.cp(path.join(root,name),path.join(fixture,name),{recursive:true});
 for(const name of ['index.html','style.css','tools/pages-bootstrap.js'])await fs.copyFile(path.join(root,name),path.join(fixture,name));
 const originalMain=await fs.readFile(path.join(root,'src/main.js'),'utf8');
 const originalStyle=await fs.readFile(path.join(root,'style.css'),'utf8');
 async function release(marker){
  await fs.writeFile(path.join(fixture,'src/main.js'),originalMain+'\nglobalThis.releaseMarker="'+marker+'";\n');
  await fs.writeFile(path.join(fixture,'style.css'),originalStyle+'\n:root{--release-marker:'+marker+'}\n');
  return buildPages({root:fixture,out});
 }
 const first=await release('A'),errors=[],requests=[],manifestRequests=[];
 const firstHTML=await fs.readFile(path.join(out,'index.html'),'utf8');
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.endsWith('/version.json'))manifestRequests.push(url.search);
  const relative=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=path.resolve(host,'.'+decodeURIComponent(relative));
  if(!file.startsWith(host+path.sep)){res.writeHead(403).end();return;}
  try{
   const body=await fs.readFile(file);
   res.setHeader('Cache-Control','public, max-age=600');
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
   res.end(body);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})});
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push(r.url()));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>localStorage.setItem('tiholesye-model','2d'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/MyGameHTML/');
  await page.waitForFunction(()=>window.tiholesye?.ready&&document.documentElement.dataset.release);
  assert.equal(await page.evaluate(()=>window.releaseMarker),'A');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.release),first.version);
  await page.evaluate(()=>{window.tiholesye.player.coins=77;window.tiholesye.save();});
  // Change real image bytes, code and CSS in the fixture, leaving the browser's
  // existing ten-minute cache intact. Never disable cache or clear site data.
  await fs.copyFile(path.join(fixture,'assets/merchant.png'),path.join(fixture,'assets/elder.png'));
  const second=await release('B');
  assert.notEqual(first.version,second.version);
  assert.equal(await fs.readFile(path.join(out,'index.html'),'utf8'),firstHTML,'bootstrap must work even with cached HTML');
  const requestBoundary=requests.length;
  await page.reload();
  await page.waitForFunction(()=>window.tiholesye?.ready&&window.releaseMarker==='B');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.release),second.version);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--release-marker').trim()),'B');
  const elderURL=await page.evaluate(()=>window.tiholesye.assets.images.elder.src);
  assert(elderURL.includes('/'+second.base));
  assert.deepEqual(await (await page.request.get(elderURL)).body(),await fs.readFile(path.join(fixture,'assets/elder.png')));
  assert.equal(await page.evaluate(()=>window.tiholesye.player.coins),77,'refresh preserves saved progress');
  assert.equal(manifestRequests.length,2,'every refresh checks the published release');
  assert.notEqual(manifestRequests[0],manifestRequests[1],'manifest URL also bypasses the CDN cache');
  const resources=requests.slice(requestBoundary).filter(url=>/\.(js|css|png)(\?|$)/.test(url));
  assert(resources.length>10);
  assert(resources.every(url=>url.includes('/'+second.base)),'all module dependencies, CSS and images use the same release');
  await page.evaluate(()=>window.tiholesye.ui.settings());
  assert((await page.locator('.model-setting img').getAttribute('src')).includes('/'+second.base));
  assert((await page.locator('.model-download').getAttribute('href')).includes('/'+second.base));
  assert.deepEqual(errors,[]);
  console.log('PASS: ordinary refresh loads new JS, CSS and sprite bytes through a warm 600-second cache; nested Pages path, complete module graph and saved progress verified.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
