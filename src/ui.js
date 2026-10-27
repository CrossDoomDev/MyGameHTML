import {DRUID_SKILLS,skillRemaining} from './druid-skills.js';
import {CLASS_PROFILES,CLASS_SKILLS,skillColor} from './class-skills.js';
import {ITEMS,equipCharacterItem,itemQuantity,gameIcon} from './character-data.js';
import {CharacterMenu} from './character-menu.js';
import {language,setLanguage,t,className,classStyle,itemName,skillName,weaponName,translateStatic} from './i18n.js';
export class UI{
 constructor(game){
  this.g=game;this.open=false;this.panel=document.getElementById('panel');this.backdrop=document.getElementById('panelBackdrop');this.toastEl=document.getElementById('toast');this.lastUpdate=-999;
  document.getElementById('bag').onclick=()=>this.inventory();
  document.getElementById('characterAction').onclick=()=>this.characterMenu.open('equipment');
  document.getElementById('skillsAction').onclick=()=>this.characterMenu.open('skills');
  document.getElementById('questsAction').onclick=()=>this.journal();
  document.getElementById('chatAction').onclick=()=>this.toast(t('chatFuture'));
  for(const id of ['map','minimapButton'])document.getElementById(id).onclick=()=>this.map();
  for(const id of ['journal','journalAction'])document.getElementById(id).onclick=()=>this.journal();
  document.getElementById('settings').onclick=()=>this.settings();
  document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>this.slot(Number(b.dataset.slot)));
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>this.g.castSkill(b.dataset.skill));
  this.characterMenu=new CharacterMenu(this);
  this.renderQuickbar();
  this.updatePrimaryAttack();
  translateStatic();
  this.backdrop.addEventListener('pointerdown',e=>{if(e.target===this.backdrop)this.close();});
 }
 setLocale(value){
  setLanguage(value);
  translateStatic();
  if(typeof document!=='undefined')document.title=t('gameName')+' · '+t('gameTag');
  this.renderQuickbar();
  this.renderClassSkills();
  this.updateCombatFocus();
  this.lastUpdate=-999;this.update();
  if(this.open){
   if(this.characterMenu?.active)this.characterMenu.render();
   else this.settings();
  }
 }
 renderClassSkills(){
  const profile=CLASS_PROFILES[this.g.player.classId];
  const buttons=[...document.querySelectorAll('#skillbar .skill')];
  buttons.forEach((button,index)=>{
   const id=profile.keys[index],skill=CLASS_SKILLS[id];
   if(!skill)return;
   button.dataset.skill=id;button.title=(['Q','R','F'][index])+' · '+skillName(id,skill.name)+' · '+skill.mana+' '+t('mana')+
    (index===0&&skill.range>1?' · '+t('selectRangedAttackHint'):'');
   button.setAttribute?.('aria-label',skillName(id,skill.name));
   // Use a generated class-branch icon for non-druid characters.
   const branchIndex=this.g.currentSkills().findIndex(n=>n.id===id);
   const branch=this.g.currentSkills().find(n=>n.id===id);
   const artwork=this.g.player.classId==='druid'?
     (index===0?'skill_bolt':index===1?'skill_roots':'skill_heal'):
     'class_'+this.g.player.classId+'_'+(index===0?0:index===1?1:2);
   const icon=button.querySelector('.game-icon');
   if(icon){icon.dataset.icon=artwork;icon.className='game-icon'+(index>=0?'':'');}
  });
  const bar=document.getElementById('skillbar');
  if(bar)bar.setAttribute?.('aria-label',t('skillBar',{name:className(this.g.player.classId,profile.name)}));
  const dock=document.getElementById('skillsAction');
  if(dock)dock.title=t('abilities')+': '+className(this.g.player.classId,profile.name);
  this.updatePrimaryAttack();
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
   t('primaryAttackHint',{name:useBolt?skillName(CLASS_PROFILES[this.g.player.classId].signature,CLASS_SKILLS[CLASS_PROFILES[this.g.player.classId].signature].name):t('melee')}));
 }
 renderQuickbar(){
  const slots=this.g.character?.quickSlots;
  if(!slots)return;
  slots.forEach((id,i)=>{
   const button=document.querySelector?.('#quickbar [data-slot="'+i+'"]');
   if(!button)return;
   const item=ITEMS[id],equipped=ITEMS[this.g.character.equipment.weapon];
   const icon=id==='weapon'?(equipped?.icon||'slot_plus'):item?.icon||'slot_plus';
   const count=id==='herb'||id==='potion'||id==='wood'?itemQuantity(this.g,id):null;
   button.dataset.quickId=id||'';
   button.classList.toggle('empty-slot',!id);
   button.classList.toggle('primary-attack',id==='weapon'&&this.g.primaryAttackMode==='staff');
   button.title=(item?itemName(id,item.name):t('free'))+' · '+(i===9?'0':i+1);
   button.setAttribute?.('aria-label',button.title);
   button.innerHTML='<kbd>'+(i===9?'0':i+1)+'</kbd>'+
    gameIcon(icon,'quick-icon')+
    (count!==null?'<small class="quick-count" data-quick-count="'+id+'">' + count + '</small>':'');
  });
  this.updatePrimaryAttack();
 }
 portrait(assets){const c=document.getElementById('portrait').getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,48,48);c.drawImage(assets.images[this.g.player.sprite]||assets.images.hero,0,0,48,48,0,0,48,48);}
 show(title,subtitle,html){
  if(this.g.editor?.active)this.g.editor.close();
  if(title!==t('character')&&this.characterMenu)this.characterMenu.active=false;
  this.panel.classList.remove('character-panel');
  this.g.keys.clear();this.g.stick={x:0,y:0};this.g.path=[];this.g.target=null;
  this.panel.innerHTML='<button class="close" id="closePanel" aria-label="'+t('close')+'">×</button><span class="eyebrow">'+subtitle+'</span><h2 id="panelTitle">'+title+'</h2>'+html;
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
  const name=focus.training?t('practiceDummy'):focus.boss?t('forestGuardian'):focus.sprite==='goblin'?t('goblin'):t('forestCreature');
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
  // Multiple quickslots may hold the same consumable: refresh every count.
  document.querySelectorAll?.('[data-quick-count]').forEach(el=>{
   el.textContent=itemQuantity(g,el.dataset.quickCount);
  });
  text('region',({village:t('regionVillage'),forest:t('regionForest'),tavern:t('regionTavern')})[g.location]||g.map.label);
  this.updateCombatFocus();
  const classProfile=CLASS_PROFILES[p.classId];
  for(const [index,id] of classProfile.keys.entries()){
   const skill=CLASS_SKILLS[id],button=[...document.querySelectorAll('#skillbar .skill')][index];
   if(!button||!skill)continue;
   const remaining=skillRemaining(g.skillCooldowns,id,g.time);
   const reason=remaining?t('cooldown'):p.mana<skill.mana?t('noMana'):'';
   button.disabled=!!reason||this.open||!!g.editor?.active;
   button.classList.toggle('recharging',remaining>0);
   const label=button.querySelector('.skill-timer');
   if(label)label.textContent=remaining?String(Math.ceil(remaining/1000)):reason?'—':'';
   button.setAttribute?.('aria-label',skillName(id,skill.name)+(reason?', '+reason:''));
  }
  const trainer=document.getElementById('trainingStats');
  if(trainer){
   trainer.hidden=g.location!=='village';
   if(!trainer.hidden){
    const s=g.dummyStats;
    trainer.textContent=t('trainingStats',{damage:s.damage,hits:s.hits,healing:s.healing,heals:s.healHits});
   }
  }
  text('questTitle',p.boss?t('questSafe'):p.questReward?t('questGuardian'):t('questElder'));
  text('questText',p.boss?t('questWin'):p.questReward?t('questFind'):!p.questAccepted?t('questTalk'):p.kills>=3?t('questReturn'):t('questKills',{count:Math.min(3,p.kills)}));
  const near=g.editor?.active?null:g.nearestInteractable(),prompt=document.getElementById('interaction');prompt.hidden=!near;
  if(!prompt.hidden)prompt.querySelector('span').textContent=near.kind==='herb'?t('interactionHerb'):near.name;
 }
 slot(index){
  if(!Number.isInteger(index)||index<0||index>9)return;
  document.querySelectorAll('[data-slot]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slot)===index));
  const id=this.g.character.quickSlots[index];
  if(!id){this.toast(t('freeSlot',{slot:index===9?'0':index+1}));return;}
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
   if(this.g.character.equipment[ITEMS[id].slot]===id)this.toast(t('equipped',{name:ITEMS[id].name}));
   else if(equipCharacterItem(this.g.character,id)){
    this.g.applyEquipment();this.toast(t('equippedNow',{name:ITEMS[id].name}));
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
  }else if(npc.visitor){
   const lines={
    archer:'Я тренируюсь стрелять по мишеням у лесной дороги. В чаще пригодятся меткость и осторожность.',
    warrior:'Меч и щит — хороший выбор для того, кто любит стоять на передовой.',
    mage:'Стихии подчиняются терпеливым. Я собираю знания о древних рунах.',
    rogue:'Тише шаг — безопаснее путь. Иногда ловкость сильнее тяжёлых доспехов.',
    paladin:'Я охраняю дороги деревни. Свет помогает нам пережить тёмные времена.',
    cleric:'Мои заклинания поддерживают товарищей. В походе целитель всегда нужен.'
   };
   this.show(npc.name,npc.role+' · путник Тихолесья',
    '<p>'+(lines[npc.sprite]||'Приятно познакомиться, друид!')+
    '</p><p class="note">Это образец игрового класса. Пока я гуляю по деревне и не выполняю задания.</p>');
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
  return '<div class="setting-row npc-style-setting"><span><strong>'+t('graphicsNPC')+
   '</strong><small>'+t('graphicsDescription')+'</small></span>'+
   '<span class="npc-pixel-label">'+t('pixelStyle')+'</span></div>';
 }
 settings(){
  const selected=this.g.player.classId;
  const classButtons=Object.entries(CLASS_PROFILES).map(([id,profile])=>
   '<button type="button" class="class-choice '+(selected===id?'is-selected':'')+
   '" data-class-choice="'+id+'" aria-pressed="'+(selected===id)+'">'+
   '<span class="class-choice-image" data-class="'+id+'" aria-hidden="true"></span>'+
   '<strong>'+className(id,profile.name)+'</strong><small>'+classStyle(id,profile.style)+'</small></button>').join('');
  const classPanel='<section class="setting-class-choice"><h3>'+t('classPicker')+'</h3>'+
   '<p class="note">'+t('classHelp')+'</p>'+
   '<div class="class-choice-grid">'+classButtons+'</div></section>';
  const langPanel='<div class="setting-row setting-language"><span><strong>'+t('language')+'</strong></span>'+
   '<span class="locale-buttons" role="group" aria-label="'+t('language')+'">'+
   [['ru',t('russian')],['en',t('english')]].map(([id,label])=>
    '<button type="button" class="button'+(language()===id?' is-current':'')+
    '" data-locale="'+id+'" aria-pressed="'+(language()===id)+'">'+label+'</button>').join('')+
   '</span></div>';
  const zoom='<div class="setting-row"><span>'+t('zoom')+'</span><span>'+
   '<button id="zoomOut" class="button" aria-label="'+t('zoomOut')+'">−</button> '+
   '<button id="zoomIn" class="button" aria-label="'+t('zoomIn')+'">+</button></span></div>';
  const time='<div class="setting-row"><span>'+t('daytime')+'</span>'+
   '<button id="daytime" class="button">'+t(this.g.night?'night':'day')+'</button></div>';
  const sound='<div class="setting-row"><span>'+t('combatSound')+'</span>'+
   '<button id="audio" class="button">'+t(this.g.sound?'on':'off')+'</button></div>';
  const instructions='<p class="note">'+t('settingsHelp')+'</p>'+
   '<button class="button" id="openBuilder">'+t('editor')+'</button>'+
   '<p class="note">'+t('progressSaved')+'</p>';
  this.show(t('atCampfire'),t('settingsSubtitle'),
   langPanel+classPanel+this.npcStyleSetting()+zoom+time+sound+instructions);
  this.panel.querySelectorAll('[data-locale]').forEach(button=>{
   button.onclick=()=>{this.setLocale(button.dataset.locale);};
  });
  this.panel.querySelectorAll('[data-class-choice]').forEach(button=>{
   button.onclick=()=>{
    if(this.g.setClass(button.dataset.classChoice))
     this.toast(t('chosenClass',{name:className(this.g.player.classId,CLASS_PROFILES[this.g.player.classId].name)}));
    this.settings();
   };
  });
  this.panel.querySelector('#zoomOut').onclick=()=>this.g.setZoom(this.g.zoom-.5);
  this.panel.querySelector('#zoomIn').onclick=()=>this.g.setZoom(this.g.zoom+.5);
  this.panel.querySelector('#daytime').onclick=()=>{this.g.night=!this.g.night;this.settings();};
  this.panel.querySelector('#audio').onclick=()=>{this.g.sound=!this.g.sound;this.g.bip(440,.1);this.settings();};
  this.panel.querySelector('#openBuilder').onclick=()=>this.builder();
 }
 builder(){
  this.close();this.g.editor.open();
 }

}
