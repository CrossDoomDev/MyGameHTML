import { assetURL } from './asset-url.js';
export class UI{
 constructor(game){
  this.g=game;this.open=false;this.panel=document.getElementById('panel');this.backdrop=document.getElementById('panelBackdrop');this.toastEl=document.getElementById('toast');this.lastUpdate=-999;
  document.getElementById('bag').onclick=()=>this.inventory();
  for(const id of ['map','minimapButton'])document.getElementById(id).onclick=()=>this.map();
  for(const id of ['journal','journalAction'])document.getElementById(id).onclick=()=>this.journal();
  document.getElementById('settings').onclick=()=>this.settings();
  document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>this.slot(Number(b.dataset.slot)));
  this.backdrop.addEventListener('pointerdown',e=>{if(e.target===this.backdrop)this.close();});
 }
 portrait(assets){const c=document.getElementById('portrait').getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,48,48);if(this.g.modelMode==='3d')c.drawImage(assets.images.hero3d,0,0,128,128,0,0,48,48);else c.drawImage(assets.images.hero,16,20,48,48,0,0,48,48);}
 show(title,subtitle,html){
  this.g.keys.clear();this.g.stick={x:0,y:0};this.g.path=[];this.g.target=null;
  this.panel.innerHTML='<button class="close" id="closePanel" aria-label="Закрыть">×</button><span class="eyebrow">'+subtitle+'</span><h2 id="panelTitle">'+title+'</h2>'+html;
  this.backdrop.hidden=false;this.open=true;this.panel.querySelector('#closePanel').onclick=()=>this.close();this.panel.querySelector('#closePanel').focus();
 }
 close(){this.backdrop.hidden=true;this.open=false;this.g.canvas.focus({preventScroll:true});this.g.save();}
 trapFocus(e){const elements=[...this.panel.querySelectorAll('button,a,input')].filter(el=>!el.disabled);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 toast(text){this.toastEl.textContent=text;this.toastEl.classList.add('show');clearTimeout(this.timer);this.timer=setTimeout(()=>this.toastEl.classList.remove('show'),2300);}
 update(){
  const g=this.g,p=g.player;if(g.time-this.lastUpdate<100)return;this.lastUpdate=g.time;
  const text=(id,value)=>document.getElementById(id).textContent=value;
  text('level',p.level);text('hpText',Math.ceil(p.hp)+' / '+p.maxHp);text('manaText',Math.floor(p.mana)+' / '+p.maxMana);
  document.getElementById('hpFill').style.width=p.hp/p.maxHp*100+'%';document.getElementById('manaFill').style.width=p.mana/p.maxMana*100+'%';document.getElementById('xpFill').style.width=p.xp/(p.level*50)*100+'%';
  text('potionCount',p.potions);text('woodCount',p.wood);text('herbCount',p.herbs);
  text('region',g.map.label);
  text('questTitle',p.boss?'Тихолесье в безопасности':p.questReward?'Страж древней рощи':'Просьба старосты');
  text('questText',p.boss?'Страж побеждён. Исследуй мир.':p.questReward?'Найди стража в Великом лесу':!p.questAccepted?'Поговори со старостой у таверны':p.kills>=3?'Вернись к старосте за наградой':'Лесные существа: '+Math.min(3,p.kills)+' / 3');
  const near=g.nearestInteractable(),prompt=document.getElementById('interaction');prompt.hidden=!near&&!g.buildMode;
  if(!prompt.hidden)prompt.querySelector('span').textContent=g.buildMode?'Строительство: '+g.buildMode+' · нажми на клетку':near.kind==='herb'?'Собрать траву':near.name;
 }
 slot(index){
  document.querySelectorAll('[data-slot]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slot)===index));
  if(index===0)this.g.attack();
  if(index===1){if(this.g.player.herbs<1)this.toast('Собирай травы на опушке леса.');else if(this.g.player.hp>=this.g.player.maxHp)this.toast('Здоровье уже полное.');else{this.g.player.herbs--;this.g.player.hp=Math.min(this.g.player.maxHp,this.g.player.hp+15);this.g.save();this.toast('Лесная трава: +15 здоровья.');}}
  if(index===2)this.g.potion();if(index===3)this.toast('Древесина: '+this.g.player.wood+' · трофеи лесных существ');if(index===4)this.inventory();if(index===5)this.journal();
 }
 inventory(){
  const p=this.g.player;
  const items=[['staff','Посох лесника','Экипирован · урон '+(10+p.level*3)],['potion','Лечебное зелье',p.potions+' шт. · +45 здоровья'],['herb','Лесная трава',p.herbs+' шт. · +15 здоровья'],['wood','Древесина',p.wood+' шт. · трофеи']];
  this.show('Рюкзак','Снаряжение и находки','<div class="inventory-grid">'+items.map(([icon,name,desc])=>'<div class="inventory-item"><span class="item item-'+icon+'"></span><span>'+name+'<br><small>'+desc+'</small></span></div>').join('')+'</div><p>Монеты: <strong>'+p.coins+'</strong> · Уровень '+p.level+'</p><p class="note">Опыт '+p.xp+' / '+p.level*50+'<br>Лавка Миры у реки продаёт лечебные зелья.</p><button class="button" id="usePotion">Выпить зелье</button>');
  this.panel.querySelector('#usePotion').onclick=()=>{this.g.potion();this.inventory();};
 }
 dialogue(npc){
  const p=this.g.player;
  if(npc.id==='elder'){
   const body=p.questReward?'Ты сдержал слово, путник. Но древняя роща ещё неспокойна. В глубине Великого леса пробудился лесной страж. Береги себя.':p.kills>=3&&p.questAccepted?'Трое лесных существ повержены — спасибо за помощь! Прими двадцать монет и два зелья. Теперь можно отправляться в древнюю рощу.':'Добро пожаловать в Тихолесье! Лесные существа тревожат жителей. Победи троих в Великом лесу и возвращайся. За помощь получишь двадцать монет и два зелья.';
   this.show(npc.name,'Староста деревни','<p>'+body+'</p><p class="note">Побеждено существ: '+Math.min(p.kills,3)+' / 3</p>'+(!p.questReward?'<button class="button" id="questAccept">'+(p.questAccepted&&p.kills>=3?'Получить награду':p.questAccepted?'Я вернусь':'Я помогу')+'</button>':''));
   const accept=this.panel.querySelector('#questAccept');if(accept)accept.onclick=()=>{
    if(p.questAccepted&&p.kills>=3){p.questReward=true;p.coins+=20;p.potions+=2;this.toast('Награда: +20 монет · +2 зелья');}
    else p.questAccepted=true;
    this.g.save();this.close();
   };
  }else if(npc.id==='merchant'){
   this.show(npc.name,'Торговая лавка','<p>Свежие овощи, лесные находки и зелья для долгих прогулок. Нужна помощь перед дорогой?</p><p>Лечебное зелье · <strong>5 монет</strong><br><span class="note">В кошельке: '+p.coins+' монет</span></p><button class="button" id="buyPotion">Купить зелье</button>');
   this.panel.querySelector('#buyPotion').onclick=()=>{if(p.coins<5)return this.toast('Нужно ещё немного монет.');p.coins-=5;p.potions++;this.g.save();this.toast('Куплено лечебное зелье.');this.dialogue(npc);};
  }else if(npc.id==='innkeeper'){
   this.show(npc.name,'Таверна «Зелёный лист»','<p>У нас всегда найдутся тёплый чай и припасы для лесных походов.</p><p>Лечебное зелье — <strong>5 монет</strong>. У тебя: '+p.coins+' монет.</p><button class="button" id="buyPotion">Купить зелье</button> <button class="button" id="rest">Отдохнуть бесплатно</button>');
   this.panel.querySelector('#buyPotion').onclick=()=>{if(p.coins<5)return this.toast('Не хватает монет.');p.coins-=5;p.potions++;this.g.save();this.toast('Куплено зелье.');this.dialogue(npc);};
   this.panel.querySelector('#rest').onclick=()=>{p.hp=p.maxHp;p.mana=p.maxMana;this.g.save();this.close();this.toast('Ты отдохнул в таверне.');};
  }else if(npc.id==='patron'){
   this.show(npc.name,'За дубовым столом','<p>Дальше деревни начинаются большие лесные тропы. Не забудь запасные зелья!</p>');
  }else if(npc.id==='smith'){
   this.show(npc.name,'Кузница Брана','<p>Хороший посох прослужит долго. Держи его крепче, а у лесного стража не стой прямо перед ударом.</p><p class="note">Урон посоха: '+(10+p.level*3)+'<br>Получай опыт, чтобы увеличить силу и запас здоровья.</p>');
  }else if(npc.id==='villager'){
   this.show(npc.name,'Дом травницы','<p>Лесная трава узнаётся по светлым листьям. Собирай её на опушке — она восстановит пятнадцать единиц здоровья. Нажми 2, чтобы использовать траву.</p>');
  }else this.show(npc.name,'Рыбак','<p>Здесь река тихая. А выше по течению — водопад и старая роща. Перейди каменный мост и держись северной тропы.</p>');
 }
 building(b){
  if(b.id==='inn'){this.g.enterLocation('tavern',12,14);return;}
  if(b.id==='market'){this.dialogue(this.g.npcs.find(n=>n.id==='merchant'));return;}
  this.show(b.name,'Тихолесье',b.sprite==='inn'?'<p>Из окон льётся тёплый свет, а внутри пахнет хлебом и травяным чаем. Здесь можно перевести дух перед прогулкой в лес.</p><button class="button" id="rest">Отдохнуть · бесплатно</button>':'<p>Уютный дом лесной деревни. Его жители ждут снаружи — подойди к ним, чтобы поговорить.</p><p class="note">Интерьеры домов появятся на следующем этапе.</p>');
  const rest=this.panel.querySelector('#rest');if(rest)rest.onclick=()=>{this.g.player.hp=this.g.player.maxHp;this.g.player.mana=this.g.player.maxMana;this.close();this.toast('После отдыха здоровье и мана восстановлены.');};
 }
 journal(){
  const p=this.g.player;
  this.show('Дорожный журнал','Истории Тихолесья','<p><strong>Просьба старосты</strong><br>Победи трёх лесных существ в Великом лесу. Возвращайся к Ольгерду у таверны за наградой.</p><progress max="3" value="'+Math.min(p.kills,3)+'"></progress><p class="note">'+(p.questReward?'Задание выполнено · награда получена':p.questAccepted?Math.min(p.kills,3)+' / 3 существ побеждено':'Поговори со старостой, чтобы принять задание')+'</p><p><strong>Страж древней рощи</strong><br>Дальние поляны Великого леса. Подготовь зелья перед встречей.</p><p class="note">'+(p.boss?'Страж побеждён':'Страж ждёт в древней роще')+'</p>');
 }
 map(){
  this.show('Карта: '+this.g.map.label,'Мир Тихолесья','<canvas id="largeMap" class="map-large" width="400" height="300" aria-label="Карта мира"></canvas><p class="note">Светлый крест — ты · золотые точки — жители<br>Красные точки — лесные существа · страж на северо-востоке</p>');
  this.g.renderer.minimap(this.panel.querySelector('#largeMap'),true);
 }
 npcStyleSetting(){
  const vector=this.g.npcStyle==='vector';
  return '<div class="setting-row npc-style-setting"><span><strong>Графика NPC</strong><small>Чиби-староста с фонарём и четыре рисованных жителя. Мир и герой не меняются.</small></span><button id="npcStyle" class="button" type="button" aria-label="Переключить стиль NPC" aria-pressed="'+vector+'">'+(vector?'Векторный':'Пиксельный')+'</button></div>';
 }
 settings(){
  this.show('У костра','Настройки и управление','<div class="model-setting"><img src="'+assetURL('hero-3d-preview.png')+'" alt="Трёхмерная модель героя"><div><strong>Вид героя</strong><p class="note">2D — рисованный пиксельный герой<br>3D — кадры настоящей low-poly модели</p><button id="modelMode" class="button">'+(this.g.modelMode==='3d'?'3D-модель':'2D-спрайт')+'</button> <a class="button model-download" href="'+assetURL('hero-3d.glb')+'" download>Скачать GLB</a></div></div>'+this.npcStyleSetting()+'<div class="setting-row"><span>Масштаб камеры</span><span><button id="zoomOut" class="button" aria-label="Отдалить">−</button> <button id="zoomIn" class="button" aria-label="Приблизить">+</button></span></div><div class="setting-row"><span>Время суток</span><button id="daytime" class="button">'+(this.g.night?'Ночь':'День')+'</button></div><div class="setting-row"><span>Звуки боя</span><button id="audio" class="button">'+(this.g.sound?'Включены':'Выключены')+'</button></div><p class="note">WASD / стрелки — движение<br>Нажми на клетку — идти<br>Нажми на NPC, врага или дверь — герой сам подойдёт и взаимодействует<br>Пробел — атака · E — общение и сбор<br>1–6 — быстрые предметы · B — рюкзак<br>M — карта · J — журнал · Esc — закрыть<br>На телефоне: касание или джойстик<br>F2 — строительство и тестирование механик</p><button class="button" id="openBuilder">Инструменты прототипа</button><p class="note">Прогресс и выбранный вид героя сохраняются на этом устройстве.<br>Версия 0.4 · деревня, лес и таверна</p>');
  this.panel.querySelector('#zoomOut').onclick=()=>this.g.setZoom(this.g.zoom-.5);this.panel.querySelector('#zoomIn').onclick=()=>this.g.setZoom(this.g.zoom+.5);
  this.panel.querySelector('#daytime').onclick=()=>{this.g.night=!this.g.night;this.settings();};
  this.panel.querySelector('#audio').onclick=()=>{this.g.sound=!this.g.sound;this.g.bip(440,.1);this.settings();};
  this.panel.querySelector('#modelMode').onclick=()=>{this.g.setModelMode(this.g.modelMode==='3d'?'2d':'3d');this.settings();};
  this.panel.querySelector('#npcStyle').onclick=()=>{this.g.setNPCStyle(this.g.npcStyle==='vector'?'pixel':'vector');this.settings();};
  this.panel.querySelector('#openBuilder').onclick=()=>this.builder();
 }
 builder(){
  this.show('Мастерская мира','Инструменты прототипа','<p class="note">Выбери объект и нажми на свободную клетку карты. Дом занимает 4×4 клетки. Изменения сцены действуют до перезагрузки; экспорт сохраняет карту в JSON.</p><div id="buildChoices">'+[['oak','Дуб'],['pine','Ель'],['cabin','Дом'],['barrel','Бочка'],['lamp','Фонарь'],['mossling','Лесное существо'],['goblin','Гоблин'],['guardian','Страж']].map(([id,name])=>'<button class="button" data-build="'+id+'">'+name+'</button>').join('')+'</div><p><button class="button" id="stopBuild">Завершить строительство</button><button class="button" id="exportMap">Экспорт карты</button></p>');
  this.panel.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{this.g.buildMode=b.dataset.build;this.close();this.toast('Нажми на клетку · F2 — сменить объект');});
  this.panel.querySelector('#stopBuild').onclick=()=>{this.g.buildMode=null;this.close();};
  this.panel.querySelector('#exportMap').onclick=()=>this.g.exportMap();
 }
}
