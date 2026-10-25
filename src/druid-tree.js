// Original druid specializations inspired by the roles common to MMORPGs:
// damage, nature control, healing/support, and feral protection.
// This is a read-only progression blueprint until a point economy is designed.
// Only bolt / roots / heal already have working combat implementations.
const node=(id,name,column,row,icon,kind,description,detail,requires=[],level=1)=>Object.freeze({
 id,name,column,row,icon,kind,description,detail,requires:Object.freeze(requires),level,maxRank:3
});
export const DRUID_TREES=Object.freeze([
 Object.freeze({
  id:'wrath',name:'Гнев природы',short:'Магия',subtitle:'Стихии, яды и дальний урон',
  icon:'skill_bolt',tone:'storm',
  nodes:Object.freeze([
   node('bolt','Изумрудный луч',2,0,'skill_bolt','Активное','Бьёт природной энергией по врагу издалека.','10 маны · 2,4 с · 20 урона',[],1),
   node('thornshot','Терновая стрела',1,1,'skill_roots','Активное','Колючий снаряд оставляет кровоточащую рану.','Урон при попадании и периодический урон',['bolt'],3),
   node('moonseed','Лунное семя',3,1,'skill_bolt','Активное','Отмечает цель лунной энергией для последующего взрыва.','Метка и отложенный магический урон',['bolt'],3),
   node('spores','Ядовитые споры',1,2,'herb_bundle','Активное','Облако спор постепенно отравляет нескольких существ.','Урон по области с течением времени',['thornshot'],6),
   node('lightning','Грозовой раскат',2,2,'skill_bolt','Активное','Цепная молния перескакивает между противниками.','Цепной стихийный урон',['bolt'],6),
   node('starcall','Зов звёзд',3,2,'skill_heal','Пассивное','Повышает эффективность дальних чар.','Усиление магического урона и регенерации маны',['moonseed'],6),
   node('tempest','Ярость небосвода',2,3,'skill_bolt','Ультимативное','Призывает разрушительную бурю на выбранную область.','Мощный урон по области и замедление',['lightning'],10)
  ])
 }),
 Object.freeze({
  id:'grove',name:'Власть чащи',short:'Чаща',subtitle:'Корни, ловушки и лесные духи',
  icon:'skill_roots',tone:'grove',
  nodes:Object.freeze([
   node('roots','Цепкие корни',2,0,'skill_roots','Активное','Опутывает врагов рядом с друидом, удерживая их на месте.','18 маны · 6,5 с · удержание 2 с',[],1),
   node('bramble','Терновые путы',1,1,'skill_roots','Активное','Замедляет врага и ранит его при попытке уйти.','Сильное замедление и ответный урон',['roots'],3),
   node('fog','Лесной туман',3,1,'skill_heal','Активное','Заволакивает поляну туманом, ослабляя противников.','Снижение точности врагов',['roots'],3),
   node('thicket','Шипастая изгородь',1,2,'skill_roots','Активное','Выращивает стену колючих кустов на пути врагов.','Временное препятствие на поле боя',['bramble'],6),
   node('dryad','Союз с дриадой',2,2,'hood_green','Пассивное','Помощь лесных духов усиливает магию контроля.','Увеличение длительности обездвиживания',['roots'],6),
   node('sprite','Лесной светлячок',3,2,'skill_heal','Призыв','Призывает маленького духа, который отвлекает врагов.','Временный спутник и отвлечение',['fog'],6),
   node('awakening','Пробуждение леса',2,3,'skill_roots','Ультимативное','Вся поляна оживает и удерживает окружающих врагов.','Массовые корни и призыв лесных стражей',['dryad'],10)
  ])
 }),
 Object.freeze({
  id:'restoration',name:'Живая роща',short:'Лечение',subtitle:'Исцеление, щиты и поддержка',
  icon:'skill_heal',tone:'life',
  nodes:Object.freeze([
   node('heal','Живительный рост',2,0,'skill_heal','Активное','Восстанавливает здоровье друида с помощью живой магии.','16 маны · 8,5 с · +35 здоровья',[],1),
   node('regrowth','Быстрое отрастание',1,1,'herb_bundle','Активное','Постепенно заживляет раны выбранного союзника.','Исцеление в течение нескольких секунд',['heal'],3),
   node('barkskin','Кора защитника',3,1,'cloak_traveler','Защита','Покрывает кожу крепкой корой и уменьшает получаемый урон.','Временное снижение входящего урона',['heal'],3),
   node('cleanse','Светлая роса',1,2,'skill_heal','Активное','Снимает яд и другие вредные эффекты.','Очищение и небольшое лечение',['regrowth'],6),
   node('spring','Родник жизни',2,2,'skill_heal','Активное','Создаёт область восстановления здоровья для группы.','Исцеление союзников по области',['heal'],6),
   node('harmony','Гармония природы',3,2,'herb_bundle','Пассивное','Ускоряет восстановление маны между заклинаниями.','Регенерация маны и усиление лечения',['barkskin'],6),
   node('life-tree','Сердце древнего древа',2,3,'skill_heal','Ультимативное','Расцветающее дерево спасает союзников в тяжёлой битве.','Массовое лечение и защитное благословение',['spring'],10)
  ])
 }),
 Object.freeze({
  id:'wild',name:'Дикий облик',short:'Зверь',subtitle:'Превращения, когти и защита',
  icon:'hood_green',tone:'wild',
  nodes:Object.freeze([
   node('cat-form','Облик рыси',2,0,'hood_green','Форма','Превращает друида в быструю рысь для ближнего боя.','Новая форма с собственными ударами и передвижением',[],1),
   node('claws','Лесные когти',1,1,'sword_training','Активное','Молниеносная атака в звериной форме.','Ближний урон и эффект раны',['cat-form'],3),
   node('bear-form','Облик медведя',3,1,'cloak_traveler','Форма','Укрепляет тело друида для защиты товарищей.','Больше здоровья и защита',['cat-form'],3),
   node('pounce','Прыжок хищника',1,2,'boots_leather','Активное','Стремительный прыжок к выбранной цели.','Рывок и внезапная атака',['claws'],6),
   node('feral-instinct','Звериное чутьё',2,2,'hat_traveler','Пассивное','Друид лучше чувствует опасность и уклоняется от ударов.','Шанс уклонения и скорость передвижения',['cat-form'],6),
   node('roar','Медвежий рёв',3,2,'skill_roots','Защита','Привлекает внимание врагов и прикрывает союзников.','Провокация и уменьшение урона',['bear-form'],6),
   node('ancient-beast','Дух первозверя',2,3,'hood_green','Ультимативное','Объединяет силу зверя, леса и древних духов.','Короткое мощное боевое преображение',['feral-instinct'],10)
  ])
 })
]);
export const DRUID_NODE_BY_ID=Object.freeze(Object.fromEntries(DRUID_TREES.flatMap(tree=>tree.nodes.map(n=>[n.id,n]))));
export function findDruidTree(id){return DRUID_TREES.find(t=>t.id===id)||DRUID_TREES[0];}
export function nodeRank(character,id){
 const node=DRUID_NODE_BY_ID[id];if(!node)return 0;
 const value=character?.skillRanks?.[id];
 return Number.isInteger(value)&&value>0?Math.min(value,node.maxRank):0;
}
export function nodeRequirementsMet(character,id){
 const node=DRUID_NODE_BY_ID[id];
 return !!node&&node.requires.every(required=>nodeRank(character,required)>0);
}
export function branchLearnedCount(character,branchId){
 const tree=findDruidTree(branchId);
 return tree.nodes.reduce((count,n)=>count+(nodeRank(character,n.id)>0?1:0),0);
}
