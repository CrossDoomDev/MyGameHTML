import { assetURL } from './asset-url.js';
import {DRUID_SKILLS,skillRemaining} from './druid-skills.js';
import {ITEMS,equipCharacterItem,itemQuantity} from './character-data.js';
import {CharacterMenu} from './character-menu.js';
export class UI{
 constructor(game){
  this.g=game;this.open=false;this.panel=document.getElementById('panel');this.backdrop=document.getElementById('panelBackdrop');this.toastEl=document.getElementById('toast');this.lastUpdate=-999;
  document.getElementById('bag').onclick=()=>this.inventory();
  for(const id of ['map','minimapButton'])document.getElementById(id).onclick=()=>this.map();
  for(const id of ['journal','journalAction'])document.getElementById(id).onclick=()=>this.journal();
  document.getElementById('settings').onclick=()=>this.settings();
  document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>this.slot(Number(b.dataset.slot)));
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>this.g.castSkill(b.dataset.skill));
  this.characterMenu=new CharacterMenu(this);
  this.renderQuickbar();
  this.updatePrimaryAttack();
  this.backdrop.addEventListener('pointerdown',e=>{if(e.target===this.backdrop)this.close();});
 }
 updatePrimaryAttack(){
  const useBolt=this.g.primaryAttackMode==='bolt';
  const staff=document.querySelector?.('[data-quick-id="weapon"]')||
   (document.getElementById('primaryStaff')?.dataset.quickId==='weapon'?document.getElementById('primaryStaff'):null);
  const bolt=document.getElementById('skill-bolt');
  for(const [button,active] of [[staff,!useBolt],[bolt,useBolt]]){
   if(!button)continue;
   button.classList.toggle('primary-attack',active);
   button.setAttribute?.('aria-pressed',active?'true':'false');
  }
  const mobile=document.getElementById('mobileAttack');
  if(mobile)mobile.setAttribute?.('aria-label',
   useBolt?'Основная атака: Изумрудный луч':'Основная атака: удар посохом');
 }
 renderQuickbar(){
  const slots=this.g.character?.quickSlots;
  if(!slots)return;
  slots.forEach((id,i)=>{
   const button=document.querySelector?.('#quickbar [data-slot="'+i+'"]');
   if(!button)return;
   const item=ITEMS[id],equipped=ITEMS[this.g.character.equipment.weapon];
   const icon=id==='weapon'?(equipped?.icon||'👊'):item?.icon||'＋';
   const count=id==='herb'||id==='potion'||id==='wood'?itemQuantity(this.g,id):null;
   button.dataset.quickId=id||'';
   button.classList.toggle('empty-slot',!id);
   button.classList.toggle('primary-attack',id==='weapon'&&this.g.primaryAttackMode==='staff');
   button.title=(item?.name||'Свободная ячейка')+' · '+(i===9?'0':i+1);
   button.setAttribute?.('aria-label',button.title);
   button.innerHTML='<kbd>'+(i===9?'0':i+1)+'</kbd>'+
    '<span class="'+(!id?'empty-mark':'quick-icon')+'">'+icon+'</span>'+
    (count!==null?'<small>' + count + '</small>':'');
  });
  this.updatePrimaryAttack();
 }
 portrait(assets){const c=document.getElementById('portrait').getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,48,48);if(this.g.modelMode==='3d')c.drawImage(assets.images.hero3d,0,0,128,128,0,0,48,48);else c.drawImage(assets.images.hero,0,0,48,48,0,0,48,48);}
 show(title,subtitle,html){
  if(this.g.editor?.active)this.g.editor.close();
  if(title!=='Персонаж'&&this.characterMenu)this.characterMenu.active=false;
  this.panel.classList.remove('character-panel');
  this.g.keys.clear();this.g.stick={x:0,y:0};this.g.path=[];this.g.target=null;
  this.panel.innerHTML='<button class="close" id="closePanel" aria-label="Закрыть">×</button><span class="eyebrow">'+subtitle+'</span><h2 id="panelTitle">'+title+'</h2>'+html;
  this.backdrop.hidden=false;this.open=true;this.panel.querySelector('#closePanel').onclick=()=>this.close();this.panel.querySelector('#closePanel').focus();
 }
 close(){this.backdrop.hidden=true;this.open=false;this.panel.classList.remove('character-panel');if(this.characterMenu)this.characterMenu.active=false;this.g.canvas.focus({preventScroll:true});this.g.save();}
 trapFocus(e){const elements=[...this.panel.querySelectorAll('button,a,input')].filter(el=>!el.disabled);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 toast(text){this.toastEl.textContent=text;this.toastEl.classList.add('show');clearTimeout(this.timer);this.timer=setTimeout(()=>this.toastEl.classList.remove('show'),2300);}
 updateCombatFocus(){
  const g=this.g,focus=g.combatTarget?.alive&&g.mobs.includes(g.combatTarget)?g.combatTarget:null;
  const panel=document.getElementById('combatFocus');
  if(!panel)return;
  panel.hidden=!focus;
  if(!focus)return;
  const name=focus.boss?'Лесной страж':focus.sprite==='goblin'?'Гоблин':'Лесное существо';
  document.getElementById('combatFocusName').textContent=name;
  document.getElementById('combatFocusHealth').textContent=
   Math.max(0,Math.ceil(focus.hp))+' / '+focus.max;
 }
 update(){
  const g=this.g,p=g.player;if(g.time-this.lastUpdate<100)return;this.lastUpdate=g.time;
  const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  text('level',p.level);text('hpText',Math.ceil(p.hp)+' / '+p.maxHp);text('manaText',Math.floor(p.mana)+' / '+p.maxMana);
  document.getElementById('hpFill').style.width=p.hp/p.maxHp*100+'%';document.getElementById('manaFill').style.width=p.mana/p.maxMana*100+'%';document.getElementById('xpFill').style.width=p.xp/(p.level*50)*100+'%';
  text('potionCount',p.potions);text('woodCount',p.wood);text('herbCount',p.herbs);
  text('region',g.map.label);
  this.updateCombatFocus();
  for(const [id,skill] of Object.entries(DRUID_SKILLS)){
   const button=document.getElementById('skill-'+id);
   if(!button)continue;
   const remaining=skillRemaining(g.skillCooldowns,id,g.time);
   const reason=remaining?'Перезарядка':p.mana<skill.mana?'Недостаточно маны':id==='heal'&&p.hp>=p.maxHp?'Здоровье полное':'';
   // RMB must still select the bolt while it is recharging or out of mana.
   // Keep that one icon enabled, while castSkill itself blocks invalid casts.
   button.disabled=id==='bolt'?false:!!reason||this.open||!!g.editor?.active;
   button.setAttribute?.('aria-disabled',reason||this.open||g.editor?.active?'true':'false');
   button.classList.toggle('recharging',remaining>0);
   const label=button.querySelector('.skill-timer');
   if(label)label.textContent=remaining?String(Math.ceil(remaining/1000)):reason?'—':'';
   button.setAttribute?.('aria-label',skill.name+
    (id==='bolt'&&g.primaryAttackMode==='bolt'?', основная атака':'')+
    (remaining?', перезарядка '+Math.ceil(remaining/1000)+' секунд':'')+
    (reason&&!remaining?', '+reason:''));
  }
  text('questTitle',p.boss?'Тихолесье в безопасности':p.questReward?'Страж древней рощи':'Просьба старосты');
  text('questText',p.boss?'Страж побеждён. Исследуй мир.':p.questReward?'Найди стража в Великом лесу':!p.questAccepted?'Поговори со старостой у таверны':p.kills>=3?'Вернись к старосте за наградой':'Лесные существа: '+Math.min(3,p.kills)+' / 3');
  const near=g.editor?.active?null:g.nearestInteractable(),prompt=document.getElementById('interaction');prompt.hidden=!near;
  if(!prompt.hidden)prompt.querySelector('span').textContent=near.kind==='herb'?'Собрать траву':near.name;
 }
 slot(index){
  if(!Number.isInteger(index)||index<0||index>9)return;
  document.querySelectorAll('[data-slot]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slot)===index));
  const id=this.g.character.quickSlots[index];
  if(!id){this.toast('Ячейка '+(index===9?'0':index+1)+' пока свободна.');return;}
  const p=this.g.player;
  if(id==='weapon'){this.g.primaryAttack();return;}
  if(id==='herb'){
   if(p.herbs<1)this.toast('Собирай травы в Великом лесу.');
   else if(p.hp>=p.maxHp)this.toast('Здоровье уже полное.');
   else{p.herbs--;p.hp=Math.min(p.maxHp,p.hp+15);this.g.save();this.toast('Лесная трава: +15 здоровья.');}
  }else if(id==='potion')this.g.potion();
  else if(id==='wood')this.toast('Древесина: '+p.wood+' · трофеи лесных существ');
  else if(id==='bag')this.inventory();
  else if(id==='journal')this.journal();
  else if(ITEMS[id]?.slot){
   if(this.g.character.equipment[ITEMS[id].slot]===id)this.toast('Уже экипировано: '+ITEMS[id].name);
   else if(equipCharacterItem(this.g.character,id)){
    this.g.applyEquipment();this.toast('Экипировано: '+ITEMS[id].name);
   }
  }
  this.renderQuickbar();
 }
 inventory(){this.characterMenu.open('inventory');}
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
  }else this.show(npc.name,'Житель Тихолесья','<p>За домами тихий пруд, а дальше начинаются широкие лесные тропы. За пределами деревни встречаются лесные существа. Береги себя.</p>');
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
  this.show('У костра','Настройки и управление','<div class="model-setting"><img src="'+assetURL('hero-3d-preview.png')+'" alt="Трёхмерная модель героя"><div><strong>Вид героя</strong><p class="note">2D — рисованный пиксельный герой<br>3D — кадры настоящей low-poly модели</p><button id="modelMode" class="button">'+(this.g.modelMode==='3d'?'3D-модель':'2D-спрайт')+'</button> <a class="button model-download" href="'+assetURL('hero-3d.glb')+'" download>Скачать GLB</a></div></div>'+this.npcStyleSetting()+'<div class="setting-row"><span>Масштаб камеры</span><span><button id="zoomOut" class="button" aria-label="Отдалить">−</button> <button id="zoomIn" class="button" aria-label="Приблизить">+</button></span></div><div class="setting-row"><span>Время суток</span><button id="daytime" class="button">'+(this.g.night?'Ночь':'День')+'</button></div><div class="setting-row"><span>Звуки боя</span><button id="audio" class="button">'+(this.g.sound?'Включены':'Выключены')+'</button></div><p class="note">WASD / стрелки — движение<br>Нажми на клетку — идти<br>ЛКМ по врагу — преследовать и автоматически атаковать до победы или поражения; ЛКМ по земле — отменить бой<br>ЛКМ по NPC или двери — подойти и взаимодействовать<br>ПКМ по посоху или лучу — выбрать основную атаку<br>Пробел — основная атака · Q — Изумрудный луч<br>R — Цепкие корни · F — Живительный рост<br>E — общение и сбор · I — персонаж<br>1–0 — десять настраиваемых ячеек для предметов и расходников · B — рюкзак<br>M — карта · J — журнал · Esc — закрыть<br>На телефоне: касание или джойстик<br>F2 — полный редактор карт · Ctrl+Z / Ctrl+Y — история</p><button class="button" id="openBuilder">Открыть редактор карт</button><p class="note">Прогресс и выбранный вид героя сохраняются на этом устройстве.<br>Версия 0.7 · единая панель и автобой</p>');
  this.panel.querySelector('#zoomOut').onclick=()=>this.g.setZoom(this.g.zoom-.5);this.panel.querySelector('#zoomIn').onclick=()=>this.g.setZoom(this.g.zoom+.5);
  this.panel.querySelector('#daytime').onclick=()=>{this.g.night=!this.g.night;this.settings();};
  this.panel.querySelector('#audio').onclick=()=>{this.g.sound=!this.g.sound;this.g.bip(440,.1);this.settings();};
  this.panel.querySelector('#modelMode').onclick=()=>{this.g.setModelMode(this.g.modelMode==='3d'?'2d':'3d');this.settings();};
  this.panel.querySelector('#npcStyle').onclick=()=>{this.g.setNPCStyle(this.g.npcStyle==='vector'?'pixel':'vector');this.settings();};
  this.panel.querySelector('#openBuilder').onclick=()=>this.builder();
 }
 builder(){
  this.close();this.g.editor.open();
 }

}
