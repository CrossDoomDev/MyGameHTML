// Class skill catalogue. Original names and simplified mechanics informed by
// established MMORPG combat roles: DPS, control, tanking and support.
import {DRUID_TREES} from './druid-tree.js';
export const CLASS_PROFILES=Object.freeze({
 druid:{name:'Друид',sprite:'hero',style:'Природа, лечение, звериные формы',hp:120,mana:60,weapon:'Посох',signature:'bolt',keys:['bolt','roots','heal'],attack:13,range:1},
 archer:{name:'Лучник',sprite:'archer',style:'Меткие стрелы, звери, ловушки',hp:110,mana:70,weapon:'Лук',signature:'aimed',keys:['aimed','wolf','snare'],attack:12,range:5},
 warrior:{name:'Воин',sprite:'warrior',style:'Двуручные удары, ярость, защита',hp:150,mana:75,weapon:'Меч',signature:'cleave',keys:['cleave','rage','guard'],attack:17,range:1},
 mage:{name:'Маг',sprite:'mage',style:'Огонь, лёд, тайная магия',hp:95,mana:110,weapon:'Жезл',signature:'firebolt',keys:['firebolt','frostbolt','arcane'],attack:8,range:5},
 rogue:{name:'Разбойник',sprite:'rogue',style:'Яды, хитрость, скрытность',hp:105,mana:80,weapon:'Кинжалы',signature:'poison',keys:['poison','flurry','vanish'],attack:15,range:1},
 paladin:{name:'Паладин',sprite:'paladin',style:'Кара, святость, щиты',hp:145,mana:90,weapon:'Молот',signature:'judgment',keys:['judgment','holy-light','aegis'],attack:16,range:1},
 cleric:{name:'Целитель',sprite:'cleric',style:'Свет, обереги, тьма',hp:110,mana:115,weapon:'Посох света',signature:'smite',keys:['smite','renew','shadowbolt'],attack:8,range:5}
});
const N=(id,name,effect,detail,mana=10,cooldown=3000,power=20,range=5)=>({id,name,effect,detail,mana,cooldown,power,range});
const B=(id,name,icon,tone,subtitle,nodes)=>({
 id,name,icon,tone,subtitle,nodes:nodes.map((n,i)=>({
 ...n,icon,column:i===0?2:i===1?1:3,row:i===0?0:1,
 requires:i?[nodes[0].id]:[],level:1,maxRank:3,kind:'Активное',
 description:n.detail
 }))
});
// Each branch has three fully usable techniques, not placeholder text.
// Supporting effects use actual combat state: shields, damage over time,
// taunts, debuffs, area damage, movement and restorative effects.
const C={
 archer:[
 B('marksmanship','Меткость','class_archer_0','grove','Прицельная стрельба и серия попаданий',[
 N('aimed','Прицельный выстрел','shot','Мощная стрела по выбранной цели',10,1800,28,6),
 N('volley','Шквал стрел','area','Залп по врагам вокруг выбранной цели',24,7200,19,6),
 N('pierce','Пробивная стрела','shot','Усиленный выстрел пробивает броню',16,4000,36,6)]),
 B('beastmastery','Повелитель зверей','class_archer_1','wild','Призыв волка и помощь спутника',[
 N('wolf','Зов волка','summon','Призвать волка на 12 секунд',24,13500,12,5),
 N('pack','Дух стаи','buff','Повысить атаку на 8 секунд',18,11000,7,0),
 N('fangs','Волчья хватка','root','Урон и удержание звериной хваткой',18,8500,16,5)]),
 B('survival','Выживание','class_archer_2','grove','Ловушки и стойкость лесного охотника',[
 N('snare','Силок','root','Корни удерживают цель на месте',18,5200,13,5),
 N('barbed','Зазубренная стрела','dot','Кровотечение в течение 6 секунд',18,5500,8,6),
 N('evasion','Уклонение','shield','Временный защитный барьер',15,9300,27,0)])],
 warrior:[
 B('arms','Оружие','class_warrior_0','wild','Сильные удары и боевое мастерство',[
 N('cleave','Рассекающий удар','melee','Сильный удар перед собой',10,2000,25,1),
 N('sweep','Круговой удар','area','Ранить всех ближних врагов',18,5500,22,2),
 N('execute','Добивающий удар','execute','Усиленный удар по раненой цели',22,6500,32,1)]),
 B('fury','Ярость','class_warrior_1','storm','Берсерк и стремительные атаки',[
 N('rage','Берсерк','buff','Временное увеличение силы удара',18,9200,10,0),
 N('whirlwind','Вихрь клинков','area','Вращающийся удар по площади',26,8000,29,2),
 N('bloodrage','Кровавая ярость','leech','Крадёт здоровье во время удара',21,6500,26,1)]),
 B('protection','Защита','class_warrior_2','life','Щиты и контроль противника',[
 N('guard','Стойка защитника','shield','Уменьшает получаемый урон',18,9000,36,0),
 N('bash','Удар щитом','stun','Оглушает врага ударом щита',16,6200,18,1),
 N('fortress','Несокрушимость','shield','Мощный защитный барьер',28,14500,58,0)])],
 mage:[
 B('fire','Огонь','class_mage_0','storm','Горение и взрывы',[
 N('firebolt','Огненный шар','shot','Дальняя огненная атака',12,2300,27,6),
 N('ignite','Воспламенение','dot','Поджигает цель на 6 секунд',19,6300,11,6),
 N('meteor','Метеоритный дождь','area','Урон по группе врагов',30,12000,38,6)]),
 B('frost','Лёд','class_mage_1','grove','Замедление и ледяной контроль',[
 N('frostbolt','Ледяная стрела','slow','Урон и ледяное замедление',14,3100,22,6),
 N('freeze','Ледяные оковы','root','Полностью обездвиживает противников',22,8000,17,5),
 N('blizzard','Метель','areaSlow','Ледяной урон по области и замедление',30,12200,29,6)]),
 B('arcane','Тайная магия','class_mage_2','storm','Энергия, защита и восстановление маны',[
 N('arcane','Тайные стрелы','shot','Удар чистой арканой',16,3100,30,6),
 N('manaflow','Поток маны','mana','Возвращает ману',0,10500,42,0),
 N('arcaneshield','Аркановый покров','shield','Магическая преграда',23,11400,43,0)])],
 rogue:[
 B('assassination','Убийца','class_rogue_0','wild','Яды и точечные атаки',[
 N('poison','Отравленный клинок','dot','Ближний удар и яд на 6 секунд',12,3200,13,1),
 N('backstab','Удар в спину','melee','Мощная скрытная атака',17,4200,34,1),
 N('toxic','Ядовитое облако','areaDot','Облако опасных испарений',26,11000,12,3)]),
 B('outlaw','Авантюрист','class_rogue_1','storm','Быстрые удары и ловкие манёвры',[
 N('flurry','Шквал кинжалов','melee','Серия быстрых выпадов',18,3600,28,1),
 N('throw','Метательный нож','shot','Атака издалека',12,2400,22,5),
 N('sidestep','Ловкий манёвр','dash','Рывок к выбранной цели',17,8500,16,4)]),
 B('subtlety','Скрытность','class_rogue_2','grove','Невидимость и контроль боя',[
 N('vanish','Исчезновение','stealth','Исчезнуть с глаз монстров на 5 секунд',20,13000,0,0),
 N('shadowstrike','Удар из тени','leech','Тёмная атака с лечением',17,4800,25,2),
 N('smoke','Дымовая завеса','stunArea','Ослабить врагов вокруг себя',24,11500,13,3)])],
 paladin:[
 B('retribution','Возмездие','class_paladin_0','storm','Свет и кара',[
 N('judgment','Правосудие','shot','Молот света на расстоянии',12,2400,26,5),
 N('consecrate','Освящение','area','Священная земля наносит урон вокруг',22,8100,25,3),
 N('crusader','Удар крестоносца','melee','Усиленный удар светом',18,3800,32,1)]),
 B('holy','Свет','class_paladin_1','life','Лечение и поддержка союзников',[
 N('holy-light','Святой свет','heal','Исцеление героя и союзников',20,5000,42,5),
 N('beacon','Маяк веры','hot','Восстанавливает здоровье несколько секунд',22,10700,13,0),
 N('radiance','Сияние','areaHeal','Массовое лечение и свет',27,12500,33,4)]),
 B('protection','Защита света','class_paladin_2','life','Священные щиты и удержание врагов',[
 N('aegis','Эгида','shield','Священный щит защищает от ударов',19,9400,45,0),
 N('hammerstun','Удар праведника','stun','Урон и оглушение противника',18,7000,22,1),
 N('divinewall','Божественная крепость','shieldHeal','Щит с частичным восстановлением',32,16000,55,0)])],
 cleric:[
 B('light','Свет','class_cleric_0','life','Исцеление и кара злу',[
 N('smite','Кара света','shot','Небесная энергия бьёт врага',11,2000,24,6),
 N('greaterheal','Великое исцеление','heal','Мощное лечение по цели',25,6000,60,6),
 N('sanctuary','Святилище','areaHeal','Восстановление здоровья в области',30,11500,37,4)]),
 B('discipline','Дисциплина','class_cleric_1','grove','Обереги и восстановление',[
 N('renew','Обновление','hot','Исцеление с течением времени',15,7800,15,0),
 N('barrier','Слово защиты','shield','Магический поглощающий барьер',20,9100,45,0),
 N('prayer','Молитва','manaHeal','Мана и здоровье восстанавливаются',0,14000,29,0)]),
 B('shadow','Тень','class_cleric_2','storm','Тьма, проклятия, истощение',[
 N('shadowbolt','Стрела мрака','shot','Теневой урон по цели',12,2600,28,6),
 N('curse','Проклятие','dot','Истощение противника',20,6900,12,6),
 N('drain','Вытягивание жизни','leech','Теневой удар лечит заклинателя',22,7100,34,5)])]
};
// Druid spell definitions: all 28 existing tree nodes gain real, testable effects.
const druidSpecs=[
 N('bolt','Изумрудный луч','shot','Зелёная энергия природы',10,2400,20,5),
 N('thornshot','Терновая стрела','dot','Колючая стрела и рана',14,3800,9,5),
 N('moonseed','Лунное семя','dot','Лунная печать наносит длительный урон',18,5400,12,6),
 N('spores','Ядовитые споры','areaDot','Поток спор поражает существ',24,7500,10,4),
 N('lightning','Грозовой раскат','area','Цепная молния',26,7400,28,6),
 N('starcall','Зов звёзд','buff','Мощь природы усилит атаки',20,12000,9,0),
 N('tempest','Ярость небосвода','areaSlow','Мощная буря над врагами',40,18000,49,6),
 N('roots','Цепкие корни','rootArea','Корни держат врагов',18,6500,8,4),
 N('bramble','Терновые путы','root','Колючее удержание',17,5500,15,5),
 N('fog','Лесной туман','weaken','Туман ослабляет натиск врагов',24,9100,7,4),
 N('thicket','Шипастая изгородь','areaSlow','Преграда из кустов и колючек',24,8700,23,4),
 N('dryad','Союз с дриадой','buff','Помощь лесных духов',19,11500,8,0),
 N('sprite','Лесной светлячок','summon','Лесной дух атакует врагов',22,13500,12,5),
 N('awakening','Пробуждение леса','rootArea','Массовое удержание и урон',38,19000,34,5),
 N('heal','Живительный рост','heal','Рост исцеляет героя',16,8500,35,0),
 N('regrowth','Быстрое отрастание','hot','Долговременное исцеление',15,6900,12,0),
 N('barkskin','Кора защитника','shield','Броня из древесной коры',20,9600,37,0),
 N('cleanse','Светлая роса','cleanse','Снять вредные эффекты и исцелить',16,7300,21,0),
 N('spring','Родник жизни','areaHeal','Лечебный родник вокруг героя',25,10500,39,4),
 N('harmony','Гармония природы','mana','Восстановить запас маны',0,13000,35,0),
 N('life-tree','Сердце древнего древа','shieldHeal','Большой оберег и лечение',35,19000,55,0),
 N('cat-form','Облик рыси','form','Превратиться в рысь: усилить ближний бой',14,6000,7,0),
 N('claws','Лесные когти','melee','Серия звериных ударов',16,4200,29,1),
 N('bear-form','Облик медведя','formGuard','Силы медведя дают щит и броню',20,11500,40,0),
 N('pounce','Прыжок хищника','dash','Рывок к добыче и урон',16,5900,27,4),
 N('feral-instinct','Звериное чутьё','buff','Увеличить силу атак',16,10100,8,0),
 N('roar','Медвежий рёв','stunArea','Рык оглушает ближайших',22,10700,19,3),
 N('ancient-beast','Дух первозверя','shieldHeal','Первозверь лечит и защищает',36,19000,66,0)
];
export const CLASS_TREES=Object.freeze({druid:DRUID_TREES,...C});
export const CLASS_SKILLS=Object.freeze(Object.fromEntries([
 ...druidSpecs.map(x=>[x.id,Object.freeze(x)]),
 ...Object.values(C).flatMap(branches=>branches.flatMap(b=>b.nodes.map(n=>[n.id,Object.freeze(n)])))
]));
export const skillFor=(id)=>CLASS_SKILLS[id]||null;
export const allClassSkills=(id)=>CLASS_TREES[id]?.flatMap(b=>b.nodes)||[];
export const initialClass=(value)=>Object.hasOwn(CLASS_PROFILES,value)?value:'druid';
export const skillColor=(type)=>{
 if(['heal','hot','areaHeal','cleanse','manaHeal'].includes(type))return '#a7f6ae';
 if(['root','rootArea','areaSlow','slow'].includes(type))return '#b7d5ff';
 if(['shield','shieldHeal','formGuard'].includes(type))return '#e6c977';
 if(['dot','areaDot','leech','weaken'].includes(type))return '#c093df';
 return '#f9ad69';
};
