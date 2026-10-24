import {ITEMS,GEAR_SLOTS,characterBonuses,equipCharacterItem,assignCharacterQuickSlot,persistCharacter,itemQuantity} from './character-data.js';
import {DRUID_SKILLS} from './druid-skills.js';

// The character window intentionally shares the existing in-game modal layer.
export class CharacterMenu{
 constructor(ui){
  this.ui=ui;this.game=ui.g;this.active=false;this.tab='equipment';
  this.selected='staff';this.pending=null;
  ui.panel.addEventListener('click',event=>{
   if(!this.active)return;
   const button=event.target?.closest?.('[data-character-action]');
   if(!button)return;
   const action=button.dataset.characterAction;
   if(action==='tab'){this.open(button.dataset.tab);return;}
   if(action==='select'){this.selected=button.dataset.item;this.pending=null;this.render();return;}
   if(action==='equip'){
    if(equipCharacterItem(this.game.character,button.dataset.item)){
     this.game.applyEquipment();
     this.ui.renderQuickbar();
     this.render();
    }
    return;
   }
   if(action==='assign-start'){this.pending=button.dataset.item;this.render();return;}
   if(action==='assign'){
    const index=Number(button.dataset.index);
    if(assignCharacterQuickSlot(this.game.character,this.pending,index)){
     persistCharacter(this.game.character);
     this.ui.renderQuickbar();
     this.ui.toast('Предмет назначен на ячейку '+(index===9?'0':index+1));
     this.pending=null;this.render();
    }
    return;
   }
   if(action==='clear'){
    if(assignCharacterQuickSlot(this.game.character,null,Number(button.dataset.index))){
     persistCharacter(this.game.character);
     this.ui.renderQuickbar();this.render();
    }
   }
  });
 }
 open(tab='equipment'){
  this.active=true;this.tab=['equipment','inventory','stats','skills'].includes(tab)?tab:'equipment';
  this.pending=null;this.render();
 }
 itemButton(id){
  const item=ITEMS[id];
  if(!item)return '';
  const worn=item.slot&&this.game.character.equipment[item.slot]===id;
  const quantity=itemQuantity(this.game,id);
  const label=worn?'Надето':item.consumable?'×'+quantity:'';
  return '<button type="button" class="char-item '+(this.selected===id?'is-selected ':'')+
    (worn?'is-equipped':'')+'" data-character-action="select" data-item="'+id+
    '" title="'+item.name+'" aria-pressed="'+(this.selected===id)+'"><span class="char-item-icon">'+
    item.icon+'</span><small>'+item.name+'</small><i>'+label+'</i></button>';
 }
 gearMarkup(){
  const character=this.game.character;
  const slotButtons=Object.entries(GEAR_SLOTS).map(([slot,name])=>{
   const id=character.equipment[slot],item=ITEMS[id];
   return '<button type="button" class="char-equip-slot" data-character-action="select" data-item="'+
     (id||character.owned.find(value=>ITEMS[value]?.slot===slot)||'staff')+
     '" title="'+name+'"><span class="char-equip-icon">'+(item?.icon||'＋')+
     '</span><span><small>'+name+'</small><strong>'+(item?.name||'Свободно')+'</strong></span></button>';
  });
  const bonuses=characterBonuses(character);
  const all=character.owned.concat(['herb','potion','wood']);
  return '<div class="char-columns"><div class="char-paper"><div class="char-section-title">Экипировка</div>'+
   '<div class="char-hero-name">Друид · уровень '+this.game.player.level+'</div>'+
   '<div class="char-figure-wrap"><canvas id="characterFigure" width="144" height="144" aria-label="Персонаж в экипировке"></canvas>'+
   '<div class="char-figure-label">'+(ITEMS[character.equipment.body]?.name||'Без одежды')+'</div></div>'+
   '<div class="char-equip-grid">'+slotButtons.join('')+'</div>'+
   '<div class="char-gear-summary">⚔ '+(10+this.game.player.level*3+bonuses.attack)+
   ' <span>✦ '+(DRUID_SKILLS.bolt.damage+this.game.player.level*3+bonuses.magic)+
   '</span> <span>🛡 '+bonuses.armor+'</span></div></div>'+
   '<div class="char-bag"><div class="char-section-title">Сумка <small>'+all.length+' предметов</small></div>'+
   '<div class="char-items">'+all.map(id=>this.itemButton(id)).join('')+'</div>'+
   this.selectionMarkup()+'</div></div>';
 }
 inventoryMarkup(){
  const items=this.game.character.owned.concat(['herb','potion','wood']);
  const empties=Array.from({length:Math.max(0,30-items.length)},()=>
   '<span class="char-empty-item" aria-hidden="true">+</span>').join('');
  return '<div class="char-inventory"><div><div class="char-section-title">Все предметы <small>'+
   items.length+' / 30 ячеек</small></div><div class="char-items">'+
   items.map(id=>this.itemButton(id)).join('')+empties+'</div></div>'+
   '<div>'+this.selectionMarkup()+'</div></div>';
 }
 selectionMarkup(){
  const id=this.selected,item=ITEMS[id];
  if(!item)return '<div class="char-selection">Выбери предмет для просмотра.</div>';
  const worn=item.slot&&this.game.character.equipment[item.slot]===id;
  const info=item.slot?'<span class="char-tag">'+GEAR_SLOTS[item.slot]+'</span>':'';
  const equipAction=item.slot?'<button class="char-action" type="button" data-character-action="equip" data-item="'+id+
   '">'+(worn?'Снять':'Экипировать')+'</button>':'';
  const slots=this.game.character.quickSlots.map((entry,i)=>
   '<button type="button" data-character-action="assign" data-index="'+i+
   '" title="Назначить в ячейку '+(i===9?'0':i+1)+'">'+(i===9?'0':i+1)+
   '<small>'+(ITEMS[entry]?.icon||'＋')+'</small></button>').join('');
  const assignment=this.pending===id?'<div class="char-assign"><strong>Выбери ячейку быстрого доступа</strong>'+
   '<div class="char-assign-grid">'+slots+'</div></div>':'';
  const count=item.consumable||id==='wood'?' · В сумке: '+itemQuantity(this.game,id):'';
  return '<div class="char-selection"><div class="char-selected-heading"><span>'+item.icon+
   '</span><div><strong>'+item.name+'</strong>'+info+'</div></div>'+
   '<p>'+item.detail+count+'</p><div class="char-selection-actions">'+equipAction+
   '<button class="char-action char-action-outline" type="button" data-character-action="assign-start" data-item="'+id+
   '">На быструю панель</button></div>'+assignment+'</div>';
 }
 statsMarkup(){
  const p=this.game.player,b=characterBonuses(this.game.character);
  const stats=[
   ['Уровень',p.level],['Здоровье',Math.ceil(p.hp)+' / '+p.maxHp],
   ['Мана',Math.floor(p.mana)+' / '+p.maxMana],['Опыт',p.xp+' / '+(p.level*50)],
   ['Ближняя атака',10+p.level*3+b.attack],['Урон луча',DRUID_SKILLS.bolt.damage+p.level*3+b.magic],
   ['Защита снаряжения',b.armor],['Побед над существами',p.kills],
   ['Монеты',p.coins],['Основная атака',this.game.primaryAttackMode==='bolt'?'Изумрудный луч':'Ближний бой']
  ];
  return '<div class="char-stats"><div class="char-section-title">Характеристики друида</div>'+
   '<p class="char-muted">Показатели зависят от уровня персонажа и надетого снаряжения.</p>'+
   '<div class="char-stats-grid">'+stats.map(([name,value])=>'<div><span>'+name+
   '</span><strong>'+value+'</strong></div>').join('')+'</div></div>';
 }
 skillsMarkup(){
  const icons={bolt:'✦',roots:'♣',heal:'✚'};
  const descriptions={
   bolt:'Дальний магический удар по выбранной цели.',
   roots:'Опутывает ближайших врагов корнями.',
   heal:'Восстанавливает здоровье персонажа.'
  };
  return '<div class="char-skills"><div class="char-section-title">Развитие способностей <small>Свободно очков: 0</small></div>'+
   '<p class="char-muted">Способы получения очков и правила повышения уровней пока не утверждены. Прокачка будет доступна позднее.</p>'+
   Object.entries(DRUID_SKILLS).map(([id,skill])=>'<div class="char-skill-row">'+
   '<div class="char-skill-icon">'+icons[id]+'</div><div class="char-skill-detail"><strong>'+
   skill.name+'</strong><small>'+descriptions[id]+'</small><span>Уровень 1 · Мана '+skill.mana+
   ' · Перезарядка '+(skill.cooldown/1000).toFixed(1)+' с</span></div>'+
   '<button disabled type="button" class="char-action" title="Очки навыков пока недоступны">Улучшить</button></div>').join('')+
   '</div>';
 }
 render(){
  if(!this.active)return;
  const tabNames=[['equipment','Снаряжение'],['inventory','Инвентарь'],['stats','Статистика'],['skills','Способности']];
  const nav='<nav class="char-tabs" aria-label="Вкладки персонажа">'+tabNames.map(([id,label])=>
   '<button type="button" data-character-action="tab" data-tab="'+id+'" class="'+
   (this.tab===id?'active':'')+'" aria-current="'+(this.tab===id?'page':'false')+'">'+label+'</button>').join('')+'</nav>';
  const content=this.tab==='equipment'?this.gearMarkup():this.tab==='inventory'?this.inventoryMarkup():
   this.tab==='stats'?this.statsMarkup():this.skillsMarkup();
  this.ui.show('Персонаж','Снаряжение · сумка · развитие',nav+'<div class="char-content">'+content+'</div>'+
   '<div class="char-footer">I — открыть / закрыть · Выбери предмет, чтобы надеть или назначить на клавишу 1–0.</div>');
  this.ui.panel.classList.add('character-panel');
  this.drawFigure();
 }
 drawFigure(){
  if(this.tab!=='equipment'||!this.game.assets)return;
  const canvas=this.ui.panel.querySelector('#characterFigure');
  if(!canvas?.getContext)return;
  const c=canvas.getContext('2d');c.clearRect(0,0,144,144);c.imageSmoothingEnabled=false;
  const hero=this.game.assets.images.hero;
  if(hero)c.drawImage(hero,0,0,48,48,5,5,134,134);
  // Small, crisp badges on the preview identify the live selected outfit.
  const gear=this.game.character.equipment;
  c.font='17px sans-serif';c.textAlign='center';
  if(gear.head)c.fillText(ITEMS[gear.head].icon,116,27);
  if(gear.cloak)c.fillText(ITEMS[gear.cloak].icon,24,89);
  if(gear.weapon)c.fillText(ITEMS[gear.weapon].icon,119,110);
  if(gear.boots)c.fillText(ITEMS[gear.boots].icon,75,139);
  c.textAlign='left';
 }
}
