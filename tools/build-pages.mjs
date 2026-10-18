import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
async function filesIn(directory,prefix=''){
 const entries=await fs.readdir(directory,{withFileTypes:true});
 const lists=await Promise.all(entries.filter(e=>!e.name.startsWith('.')).map(async e=>{
  const name=prefix+e.name;
  return e.isDirectory()?filesIn(path.join(directory,e.name),name+'/'):[name];
 }));
 return lists.flat().sort();
}
export async function buildPages({root=project,out=path.join(project,'_site')}={}){
 const files=['index.html','style.css',...(await filesIn(path.join(root,'src'),'src/')),...(await filesIn(path.join(root,'assets'),'assets/'))];
 const bootstrap=await fs.readFile(path.join(root,'tools/pages-bootstrap.js'),'utf8');
 const hash=createHash('sha256').update(bootstrap);
 for(const file of files)hash.update(file+'\0').update(await fs.readFile(path.join(root,file)));
 const version=hash.digest('hex').slice(0,16),base='releases/'+version+'/';
 // Publish a complete namespace, so code and art always come from one release.
 await fs.mkdir(out,{recursive:true});
 const destination=path.join(out,base);
 await fs.mkdir(destination,{recursive:true});
 for(const file of files.filter(file=>file!=='index.html')){
  await fs.mkdir(path.dirname(path.join(destination,file)),{recursive:true});
  await fs.copyFile(path.join(root,file),path.join(destination,file));
 }
 const bootStyle='<style id="boot-style">body{margin:0;background:#26342a;color:#efe4bf}#app{visibility:hidden}#loading{visibility:visible;position:fixed;inset:0;display:grid;place-content:center;text-align:center;gap:12px}#loading[hidden]{display:none}</style>';
 const sourceHTML=await fs.readFile(path.join(root,'index.html'),'utf8');
 if(!sourceHTML.includes('<link rel="stylesheet" href="style.css">')||!sourceHTML.includes('<script type="module" src="src/main.js"></script>'))throw new Error('Pages HTML entry points changed; update the build template before deploying.');
 const html=sourceHTML
  .replace('<link rel="stylesheet" href="style.css">',bootStyle)
  .replace('<script type="module" src="src/main.js"></script>','<script type="module">\n'+bootstrap+'\n</script>');
 await fs.writeFile(path.join(out,'index.html'),html);
 await fs.writeFile(path.join(out,'version.json'),JSON.stringify({version,base})+'\n');
 await fs.writeFile(path.join(out,'.nojekyll'),'');
 return {version,base,out};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPages()));
