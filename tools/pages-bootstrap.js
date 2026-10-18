// Inlined into the published HTML so an old cached script cannot pin a release.
try {
 const url=new URL('version.json',location.href);
 url.searchParams.set('refresh',Date.now()+'-'+Math.random().toString(36).slice(2));
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw new Error('Release manifest: HTTP '+response.status);
 const release=await response.json();
 if(!/^[a-f0-9]{16}$/.test(release.version)||release.base!=='releases/'+release.version+'/')throw new Error('Invalid release manifest');
 const base=new URL(release.base,location.href);
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('style.css',base);
 await new Promise((resolve,reject)=>{stylesheet.onload=resolve;stylesheet.onerror=()=>reject(new Error('Release stylesheet unavailable'));document.head.append(stylesheet);});
 document.getElementById('boot-style').remove();
 await import(new URL('src/main.js',base).href);
 document.getElementById('build').title='Release '+release.version;
 document.documentElement.dataset.release=release.version;
} catch(error) {
 console.error(error);
 document.getElementById('loading').innerHTML='<strong>Не удалось загрузить актуальную версию</strong><span>Проверь подключение и обнови страницу.</span>';
}
