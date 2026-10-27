// All interface labels are DOM text, never burned into textures.
// Artwork may contain only decoration/imagery. World sprites stay pixelated,
// interface art uses smooth scaling independently of language.
export const LOCALE_KEY='tiholesye-language';
export const SUPPORTED_LANGUAGES=Object.freeze(['ru','en']);
let current='ru';
try{current=localStorage.getItem(LOCALE_KEY)==='en'?'en':'ru';}catch{}
const messages={
 ru:{
  gameName:'Тихолесье',gameTag:'Лесная деревня',loading:'Просыпается лес…',
  menu:'МЕНЮ',character:'Персонаж',inventory:'Инвентарь',abilities:'Способности',
  map:'Карта',quests:'Задания',chat:'Общение',settings:'Настройки',journal:'Журнал',
  classPicker:'Тестирование игровых классов',classHelp:'Выбирай любого героя без регистрации. Все умения открыты. Прогресс сохраняется.',
  language:'Язык / Language',russian:'Русский',english:'English',
  graphicsNPC:'Графика NPC',graphicsDescription:'Пиксельные персонажи 48×48, как у главного героя. Четыре направления и кадры ходьбы.',
  pixelStyle:'Пиксельный стиль',zoom:'Масштаб камеры',daytime:'Время суток',night:'Ночь',day:'День',
  combatSound:'Звуки боя',on:'Включены',off:'Выключены',settingsSubtitle:'Настройки и управление',
  atCampfire:'У костра',editor:'Открыть редактор карт',progressSaved:'Прогресс героя сохраняется на этом устройстве.',
  settingsHelp:'WASD / стрелки — движение; ЛКМ по земле — идти; ЛКМ по врагу — выбрать цель и атаковать; ЛКМ по NPC — подойти и поговорить; Пробел — основная атака; Q / R / F — способности; E — взаимодействовать; I — персонаж; 1–0 — быстрые ячейки; B — рюкзак; M — карта; J — журнал; Esc — закрыть; F2 — редактор мира.',
  chosenClass:'Выбран класс: {name}',ready:'Доступно',cast:'Применить способность',close:'Закрыть',
  equip:'Снаряжение',equipment:'Экипировка',stats:'Статистика',skills:'Способности',allItems:'Все предметы',
  bag:'Сумка',item:'Предмет',free:'Свободно',withoutClothes:'Без одежды',
  unequip:'Снять',equipAction:'Экипировать',quickAssign:'На быструю панель',selectSlot:'Выбери ячейку быстрого доступа',
  inspectItem:'Выбери предмет для просмотра.',inBag:'В сумке',items:'предметов',cells:'ячеек',level:'уровень',
  statsNote:'Показатели зависят от уровня персонажа и надетого снаряжения.',
  strength:'Ближняя атака',power:'Сила умения',armor:'Защита снаряжения',kills:'Побед над существами',
  coins:'Монеты',mainAttack:'Основная атака',melee:'Ближний бой',experience:'Опыт',health:'Здоровье',mana:'Мана',
  unlocked:'Открыто · готово к использованию',skillEffect:'Эффект',recharge:'Перезарядка',
  relatedSkill:'Связанный узел',none:'нет',testAccess:'Тестовый доступ',
  unlockedNotice:'Все умения открыты для испытаний на тренировочном манекене.',
  paths:'Пути: {name}',allOpen:'Тест: всё открыто',treeHelp:'Все умения доступны. Выбери узел и нажми «Применить способность», или используй Q / R / F.',
  specializations:'Специализации',learned:'Изучено',notLearned:'Пока не изучено',rank:'Ур.',
  of:'из',treeTitle:'Дерево способностей {name}',treeFooter:'Все ветки и умения открыты для тестирования. Прогресс навыков будет добавлен позднее.',
  characterFooter:'I — открыть / закрыть · Выбери предмет, чтобы надеть или назначить на клавишу 1–0.',
  assigned:'Предмет назначен на ячейку {slot}',freeSlot:'Ячейка {slot} пока свободна.',
  actions:'Игровое меню',equipped:'Уже экипировано: {name}',equippedNow:'Экипировано: {name}',
  primaryAttackHint:'Основная атака: {name}',skillBar:'Способности класса {name}',
  noMana:'Недостаточно маны',cooldown:'Перезарядка',combatTarget:'Выбранный противник',
  unfocus:'ЛКМ по земле — снять фокус',practiceDummy:'Тренировочный манекен',
  forestGuardian:'Лесной страж',goblin:'Гоблин',forestCreature:'Лесное существо',
  trainingStats:'Манекен · Урон: {damage} · Удары: {hits} · Лечение: {healing} · Исцеления: {heals}',
  regionVillage:'Деревня Тихолесье',regionForest:'Великий лес',regionTavern:'Таверна «Зелёный лист»',
  questElder:'Просьба старосты',questGuardian:'Страж древней рощи',questSafe:'Тихолесье в безопасности',
  questTalk:'Поговори со старостой у таверны',questFind:'Найди стража в Великом лесу',
  questWin:'Страж побеждён. Исследуй мир.',questReturn:'Вернись к старосте за наградой',
  questKills:'Лесные существа: {count} / 3',interactionHerb:'Собрать траву',
  mobileInteract:'Взаимодействовать',mobileAttack:'Атаковать',movement:'Джойстик движения',
  quickbar:'Быстрые ячейки',hotbar:'Единая панель способностей и предметов',
  hint:'I · персонаж и снаряжение; Пробел · атака; Q / R / F · способности; 1–0 · быстрые ячейки',
  chatFuture:'Общение с игроками появится позднее.',prototype:'ПРОТОТИП · 0.12',
  classChanged:'Выбран класс: {name}',practicalGraphic:'Изображения не содержат надписей',
  noSkill:'Выбери противника или тренировочный манекен.',forestHint:'Лесные существа',
  localeRu:'Русский',localeEn:'English'
 },
 en:{
  gameName:'Quietwood',gameTag:'Forest Village',loading:'The forest awakens…',
  menu:'MENU',character:'Character',inventory:'Inventory',abilities:'Abilities',
  map:'Map',quests:'Quests',chat:'Chat',settings:'Settings',journal:'Journal',
  classPicker:'Playtest classes',classHelp:'Try any hero without an account. All abilities are unlocked and progress is saved.',
  language:'Language / Язык',russian:'Русский',english:'English',
  graphicsNPC:'NPC graphics',graphicsDescription:'48×48 pixel characters, matching the hero. Four directions with walking animations.',
  pixelStyle:'Pixel art',zoom:'Camera zoom',daytime:'Time of day',night:'Night',day:'Day',
  combatSound:'Combat sounds',on:'Enabled',off:'Disabled',settingsSubtitle:'Settings and controls',
  atCampfire:'At the Campfire',editor:'Open World Editor',progressSaved:'Your character progress is saved on this device.',
  settingsHelp:'WASD / arrows — move; Click ground — walk; Click an enemy — target and attack; Click an NPC — approach and talk; Space — basic attack; Q / R / F — abilities; E — interact; I — character; 1–0 — quick slots; B — backpack; M — map; J — journal; Esc — close; F2 — world editor.',
  chosenClass:'Selected class: {name}',ready:'Available',cast:'Cast ability',close:'Close',
  equip:'Equipment',equipment:'Equipment',stats:'Stats',skills:'Abilities',allItems:'All items',
  bag:'Bag',item:'Item',free:'Empty',withoutClothes:'No armor',
  unequip:'Unequip',equipAction:'Equip',quickAssign:'Add to hotbar',selectSlot:'Choose a quick slot',
  inspectItem:'Select an item to inspect.',inBag:'In bag',items:'items',cells:'slots',level:'level',
  statsNote:'Stats depend on your character level and equipped gear.',
  strength:'Melee damage',power:'Ability power',armor:'Equipment armor',kills:'Monsters defeated',
  coins:'Coins',mainAttack:'Primary attack',melee:'Melee',experience:'Experience',health:'Health',mana:'Mana',
  unlocked:'Unlocked · ready to use',skillEffect:'Effect',recharge:'Cooldown',
  relatedSkill:'Prerequisite',none:'none',testAccess:'Playtest access',
  unlockedNotice:'All abilities are unlocked so you can try them on the training dummy.',
  paths:'Paths: {name}',allOpen:'Playtest: all unlocked',treeHelp:'All skills are available. Select a node and press “Cast ability”, or use Q / R / F.',
  specializations:'Specializations',learned:'Learned',notLearned:'Not learned',rank:'Rank ',
  of:'of',treeTitle:'Ability tree: {name}',treeFooter:'All skill trees are unlocked for testing. Progression will be added later.',
  characterFooter:'I — open / close · Select an item to equip or assign it to hotkeys 1–0.',
  assigned:'Item assigned to slot {slot}',freeSlot:'Slot {slot} is empty.',
  actions:'Game menu',equipped:'Already equipped: {name}',equippedNow:'Equipped: {name}',
  primaryAttackHint:'Primary attack: {name}',skillBar:'Abilities: {name}',
  noMana:'Not enough mana',cooldown:'Cooldown',combatTarget:'Selected enemy',
  unfocus:'Click the ground to clear target',practiceDummy:'Training dummy',
  forestGuardian:'Forest Guardian',goblin:'Goblin',forestCreature:'Forest Creature',
  trainingStats:'Dummy · Damage: {damage} · Hits: {hits} · Healing: {healing} · Heals: {heals}',
  regionVillage:'Quietwood Village',regionForest:'Great Forest',regionTavern:'The Green Leaf Inn',
  questElder:"The Elder's Request",questGuardian:'Guardian of the Ancient Grove',questSafe:'Quietwood is safe',
  questTalk:'Talk to the elder near the tavern',questFind:'Find the guardian in the Great Forest',
  questWin:'Guardian defeated. Explore the world.',questReturn:'Return to the elder for a reward',
  questKills:'Forest creatures: {count} / 3',interactionHerb:'Gather herbs',
  mobileInteract:'Interact',mobileAttack:'Attack',movement:'Movement joystick',
  quickbar:'Quick slots',hotbar:'Abilities and items',
  hint:'I · character & equipment; Space · attack; Q / R / F · skills; 1–0 · hotbar',
  chatFuture:'Player chat is coming later.',prototype:'PROTOTYPE · 0.12',
  classChanged:'Selected class: {name}',practicalGraphic:'Images must not contain text',
  noSkill:'Select an enemy or the training dummy.',forestHint:'Forest creatures',
  localeRu:'Русский',localeEn:'English'
 }
};
const names={
 druid:'Druid',archer:'Archer',warrior:'Warrior',mage:'Mage',rogue:'Rogue',paladin:'Paladin',cleric:'Cleric'
};
const weapons={druid:'Staff',archer:'Bow',warrior:'Sword',mage:'Wand',rogue:'Daggers',paladin:'Hammer',cleric:'Light Staff'};
const skillEnglish=Object.fromEntries(Object.entries({
 bolt:'Emerald Bolt',thornshot:'Thorn Arrow',moonseed:'Moonseed',spores:'Poison Spores',lightning:'Thunderclap',
 starcall:'Call of the Stars',tempest:'Heavenly Tempest',roots:'Grasping Roots',bramble:'Bramble Snare',
 fog:'Forest Mist',thicket:'Thorn Hedge',dryad:'Dryad Pact',sprite:'Forest Sprite',awakening:'Forest Awakening',
 heal:'Life Bloom',regrowth:'Rapid Regrowth',barkskin:'Barkskin',cleanse:'Cleansing Dew',
 spring:'Spring of Life',harmony:'Natural Harmony','life-tree':'Heart of the Ancient Tree',
 'cat-form':'Lynx Form',claws:'Forest Claws','bear-form':'Bear Form',pounce:'Predator Pounce',
 'feral-instinct':'Feral Instinct',roar:'Bear Roar','ancient-beast':'Primal Spirit',
 aimed:'Aimed Shot',volley:'Arrow Volley',pierce:'Piercing Arrow',wolf:'Call Wolf',pack:'Spirit of the Pack',
 fangs:'Wolf Bite',snare:'Snare',barbed:'Barbed Arrow',evasion:'Evasion',
 cleave:'Cleave',sweep:'Sweeping Strike',execute:'Execute',rage:'Berserker Rage',whirlwind:'Whirlwind',
 bloodrage:'Blood Frenzy',guard:'Defensive Stance',bash:'Shield Bash',fortress:'Unbreakable',
 firebolt:'Fireball',ignite:'Ignite',meteor:'Meteor Shower',frostbolt:'Frostbolt',freeze:'Ice Shackles',
 blizzard:'Blizzard',arcane:'Arcane Missiles',manaflow:'Mana Flow',arcaneshield:'Arcane Barrier',
 poison:'Poisoned Blade',backstab:'Backstab',toxic:'Toxic Cloud',flurry:'Dagger Flurry',
 throw:'Throwing Knife',sidestep:'Quick Step',vanish:'Vanish',shadowstrike:'Shadow Strike',smoke:'Smoke Veil',
 judgment:'Judgment',consecrate:'Consecration',crusader:'Crusader Strike','holy-light':'Holy Light',
 beacon:'Beacon of Faith',radiance:'Radiance',aegis:'Aegis',hammerstun:'Righteous Blow',divinewall:'Divine Fortress',
 smite:'Smite',greaterheal:'Greater Heal',sanctuary:'Sanctuary',renew:'Renew',barrier:'Power Word: Shield',
 prayer:'Prayer',shadowbolt:'Shadow Bolt',curse:'Curse',drain:'Drain Life'
}));
const branchEnglish={
 druid:{wrath:'Wrath of Nature',grove:'Forest Dominion',restoration:'Living Grove',wild:'Wild Form'},
 archer:{marksmanship:'Marksmanship',beastmastery:'Beast Mastery',survival:'Survival'},
 warrior:{arms:'Arms',fury:'Fury',protection:'Protection'},
 mage:{fire:'Fire',frost:'Frost',arcane:'Arcane'},
 rogue:{assassination:'Assassination',outlaw:'Outlaw',subtlety:'Subtlety'},
 paladin:{retribution:'Retribution',holy:'Holy',protection:'Protection'},
 cleric:{light:'Light',discipline:'Discipline',shadow:'Shadow'}
};
const classStyles={
 druid:'Nature magic, healing and wild shapes',archer:'Precision, pets and traps',
 warrior:'Heavy strikes, fury and defense',mage:'Fire, frost and arcane power',
 rogue:'Poison, trickery and stealth',paladin:'Judgment, holy light and shields',
 cleric:'Light, wards and shadow'
};
const branchSubtitles={
 druid:{wrath:'Elements, poison and ranged power',grove:'Roots, traps and forest spirits',
 restoration:'Healing, shields and support',wild:'Shapeshifting and melee defense'},
 archer:{marksmanship:'Precise shots and ranged volleys',beastmastery:'Summons and animal allies',
 survival:'Traps and forest survival'},
 warrior:{arms:'Weapon mastery and powerful strikes',fury:'Berserker rage and rapid attacks',
 protection:'Shields and crowd control'},
 mage:{fire:'Burning magic and explosions',frost:'Slows and frozen control',
 arcane:'Pure energy, shields and mana recovery'},
 rogue:{assassination:'Poisons and focused strikes',outlaw:'Rapid blows and nimble tricks',
 subtlety:'Stealth and shadow control'},
 paladin:{retribution:'Holy judgment and radiant strikes',holy:'Healing and support',
 protection:'Holy shields and defense'},
 cleric:{light:'Healing and smiting',discipline:'Barriers and recovery',
 shadow:'Curses and life drain'}
};
const gearEnglish={weapon:'Weapon',head:'Head',body:'Armor',cloak:'Cloak',boots:'Boots'};
const itemEnglish={
 staff:['Forester Staff','Basic staff attack and druid spells.'],
 oakstaff:['Oak Staff','A sturdy staff that strengthens magic.'],
 sword:['Training Sword','A simple melee practice weapon.'],
 hood:['Druid Hood','Light hood for woodland travels.'],
 cap:['Travel Cap','An ordinary travel hat.'],
 robe:['Forester Robe','Standard druid clothing.'],
 shirt:['Linen Shirt','Simple spare clothing.'],
 cloak:['Traveler Cloak','A cloak for long forest journeys.'],
 boots:['Leather Boots','Comfortable footwear for an adventurer.'],
 herb:['Forest Herbs','Restores 15 health. Quantity depends on gathered herbs.'],
 potion:['Healing Potion','Restores 45 health from your bag.'],
 wood:['Wood','Crafting material gathered in the forest.'],
 bag:['Backpack','Opens your inventory.'],
 journal:['Journal','Opens your quest journal.'],
 weapon:['Weapon Attack','Strikes with the equipped weapon.']
};
const effectDescriptions={
 shot:'Deal ranged damage to the selected target.',
 melee:'Strike the selected target in melee range.',
 root:'Damage and immobilize the target.',
 rootArea:'Damage and immobilize nearby enemies.',
 slow:'Deal damage and slow the target.',
 stun:'Damage and briefly stun the target.',
 stunArea:'Stun and damage nearby enemies.',
 dot:'Deal damage and apply damage over time.',
 areaDot:'Poison enemies in an area.',
 area:'Damage multiple enemies.',
 areaSlow:'Damage and slow enemies in an area.',
 heal:'Restore health.',areaHeal:'Heal allies within an area.',hot:'Restore health over time.',
 cleanse:'Cleanse and restore health.',shield:'Gain an absorbing shield.',
 shieldHeal:'Gain a shield and restore health.',
 buff:'Gain a temporary combat buff.',form:'Temporarily take an animal form.',
 formGuard:'Assume a defensive animal form.',mana:'Restore mana.',manaHeal:'Restore mana and health.',
 stealth:'Hide from enemies temporarily.',summon:'Summon a helper that attacks nearby foes.',
 execute:'Strike harder against weakened enemies.',leech:'Deal damage and heal yourself.',
 weaken:'Damage and weaken an enemy.',dash:'Dash toward a target and strike.'
};
export function language(){return current;}
export function setLanguage(value,{persist=true}={}){
 current=value==='en'?'en':'ru';
 if(persist)try{localStorage.setItem(LOCALE_KEY,current);}catch{}
 if(typeof document!=='undefined'&&document.documentElement)document.documentElement.lang=current;
 return current;
}
export function t(key,vars={}){
 const value=messages[current]?.[key]??messages.ru[key]??key;
 return String(value).replace(/\{([\w]+)\}/g,(_,name)=>String(vars[name]??''));
}
export function className(id,fallback=''){return current==='en'?names[id]||fallback:fallback;}
export function weaponName(id,fallback=''){return current==='en'?weapons[id]||fallback:fallback;}
export function skillName(id,fallback=''){return current==='en'?skillEnglish[id]||fallback:fallback;}
export function branchName(classId,id,fallback=''){return current==='en'?branchEnglish[classId]?.[id]||fallback:fallback;}
export function classStyle(id,fallback=''){return current==='en'?classStyles[id]||fallback:fallback;}
export function branchSubtitle(classId,id,fallback=''){return current==='en'?branchSubtitles[classId]?.[id]||fallback:fallback;}
export function itemName(id,fallback=''){return current==='en'?itemEnglish[id]?.[0]||fallback:fallback;}
export function itemDetail(id,fallback=''){return current==='en'?itemEnglish[id]?.[1]||fallback:fallback;}
export function gearName(id,fallback=''){return current==='en'?gearEnglish[id]||fallback:fallback;}
export function skillDescription(skill,fallback=''){
 return current==='en'?effectDescriptions[skill?.effect]||fallback:fallback;
}
export function translateStatic(root=typeof document!=='undefined'?document:null){
 if(!root?.querySelectorAll)return;
 for(const node of root.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
 for(const node of root.querySelectorAll('[data-i18n-title]'))node.title=t(node.dataset.i18nTitle);
 for(const node of root.querySelectorAll('[data-i18n-aria]'))node.setAttribute?.('aria-label',t(node.dataset.i18nAria));
}
setLanguage(current,{persist:false});
