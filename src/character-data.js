// Lightweight, local-first character inventory. Skill point acquisition remains undecided.
export const CHARACTER_SAVE_KEY='tiholesye-character-v1';
export const GEAR_SLOTS=Object.freeze({
 weapon:'Оружие',head:'Голова',body:'Одежда',cloak:'Плащ',boots:'Обувь'
});
export const ITEMS=Object.freeze({
 staff:{name:'Посох лесника',icon:'🪄',slot:'weapon',weaponType:'staff',attack:0,magic:0,detail:'Ближняя атака посохом и заклинания друида.'},
 oakstaff:{name:'Дубовый посох',icon:'🌿',slot:'weapon',weaponType:'staff',attack:2,magic:2,detail:'Крепкий посох с усилением магии.'},
 sword:{name:'Учебный меч',icon:'🗡️',slot:'weapon',weaponType:'sword',attack:3,magic:0,detail:'Ближний бой; Изумрудный луч требует посох.'},
 hood:{name:'Капюшон друида',icon:'🟢',slot:'head',armor:1,detail:'Лёгкий капюшон для лесных странствий.'},
 cap:{name:'Походная шапка',icon:'🧢',slot:'head',armor:0,detail:'Обычный головной убор.'},
 robe:{name:'Одеяние лесника',icon:'🥋',slot:'body',armor:1,magic:1,detail:'Стандартная одежда друида.'},
 shirt:{name:'Льняная рубаха',icon:'👕',slot:'body',armor:0,detail:'Простая сменная одежда.'},
 cloak:{name:'Плащ путника',icon:'🧥',slot:'cloak',armor:1,detail:'Плащ для долгих лесных прогулок.'},
 boots:{name:'Кожаные сапоги',icon:'🥾',slot:'boots',armor:1,detail:'Удобная обувь путешественника.'},
 herb:{name:'Лесная трава',icon:'🌿',consumable:true,detail:'Восстанавливает 15 здоровья. Количество — из собранных трав.'},
 potion:{name:'Лечебное зелье',icon:'🧪',consumable:true,detail:'Восстанавливает 45 здоровья. Количество — из сумки.'},
 wood:{name:'Древесина',icon:'🪵',detail:'Материал, добываемый в лесу.'},
 bag:{name:'Рюкзак',icon:'🎒',action:true,detail:'Открывает сумку персонажа.'},
 journal:{name:'Журнал',icon:'📜',action:true,detail:'Открывает журнал заданий.'},
 weapon:{name:'Основная атака оружием',icon:'⚔️',action:true,detail:'Наносит удар экипированным оружием.'}
});
const OWNED=['staff','oakstaff','sword','hood','cap','robe','shirt','cloak','boots'];
const START_QUICK=['weapon','herb','potion','wood','bag','journal',null,null,null,null];
const DEFAULT_GEAR={weapon:'staff',head:'hood',body:'robe',cloak:'cloak',boots:'boots'};
export const defaultCharacter=()=>({
 owned:[...OWNED],equipment:{...DEFAULT_GEAR},quickSlots:[...START_QUICK],skillRanks:{bolt:1,roots:1,heal:1},skillPoints:0
});
export function sanitizeCharacter(saved){
 const base=defaultCharacter();
 if(!saved||typeof saved!=='object')return base;
 const owned=new Set(OWNED);
 if(Array.isArray(saved.owned))for(const id of saved.owned)if(ITEMS[id]?.slot)owned.add(id);
 base.owned=[...owned];
 for(const slot of Object.keys(GEAR_SLOTS)){
  const id=saved.equipment?.[slot];
  if(id===null||id===undefined&&saved.equipment&&slot in saved.equipment)base.equipment[slot]=null;
  else if(owned.has(id)&&ITEMS[id]?.slot===slot)base.equipment[slot]=id;
 }
 if(Array.isArray(saved.quickSlots)){
  base.quickSlots=Array.from({length:10},(_,i)=>{
   const id=saved.quickSlots[i];
   return typeof id==='string'&&ITEMS[id]&&(ITEMS[id].slot?owned.has(id):true)?id:null;
  });
 }
 // Do not accept arbitrary skill points or ranks from local storage yet:
 // the design does not define how they are earned or spent.
 return base;
}
export function loadCharacter(){
 try{return sanitizeCharacter(JSON.parse(localStorage.getItem(CHARACTER_SAVE_KEY)||'null'));}catch{return defaultCharacter();}
}
export function persistCharacter(character){
 try{localStorage.setItem(CHARACTER_SAVE_KEY,JSON.stringify(character));}catch{}
}
export function characterBonuses(character){
 const result={attack:0,magic:0,armor:0};
 for(const id of Object.values(character.equipment)){
  const item=ITEMS[id];if(!item)continue;
  for(const field of Object.keys(result))result[field]+=item[field]||0;
 }
 return result;
}
export function equipCharacterItem(character,id){
 const item=ITEMS[id];
 if(!item?.slot||!character.owned.includes(id))return false;
 character.equipment[item.slot]=character.equipment[item.slot]===id?null:id;
 return true;
}
export function assignCharacterQuickSlot(character,id,index){
 if(!Number.isInteger(index)||index<0||index>9)return false;
 if(id!==null&&(!ITEMS[id]||(ITEMS[id].slot&&!character.owned.includes(id))))return false;
 character.quickSlots[index]=id;
 return true;
}
export function itemQuantity(game,id){
 if(id==='potion')return game.player.potions;
 if(id==='herb')return game.player.herbs;
 if(id==='wood')return game.player.wood;
 return game.character.owned.includes(id)?1:0;
}
