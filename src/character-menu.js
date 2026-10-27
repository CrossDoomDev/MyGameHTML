import {ITEMS,GEAR_SLOTS,characterBonuses,equipCharacterItem,assignCharacterQuickSlot,persistCharacter,itemQuantity,gameIcon} from './character-data.js';
import {DRUID_SKILLS} from './druid-skills.js';
import {DRUID_TREES,findDruidTree,DRUID_NODE_BY_ID,nodeRank,nodeRequirementsMet,branchLearnedCount} from './druid-tree.js';
import {CLASS_PROFILES,CLASS_TREES,CLASS_SKILLS} from './class-skills.js';
import {t,className,skillName,branchName,branchSubtitle,skillDescription,itemName,itemDetail,gearName} from './i18n.js';

// The character window intentionally shares the existing in-game modal layer.
export class CharacterMenu{
 constructor(ui){
  this.ui=ui;this.game=ui.g;this.active=false;this.tab='equipment';
  this.selected='oakstaff';this.pending=null;
  this.skillBranch='wrath';this.skillSelected='bolt';
  ui.panel.addEventListener('click',event=>{
   if(!this.active)return;
   const button=event.target?.closest?.('[data-character-action]');
   if(!button&&this.tab==='skills'){
    // Some browsers hit-test the scrolling graph layer rather than the
    // painted button. Resolve clicks inside node rectangles by grid position.
    const graph=event.target?.closest?.('.talent-graph');
    if(graph&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
     const rect=graph.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
     const selected=this.activeTrees().find(t=>t.id===this.skillBranch).nodes.find(n=>{
      const cx=[0,100,300,500][n.column],cy=70+n.row*127;
      return Math.abs(x-cx)<=71&&Math.abs(y-cy)<=47;
     });
     if(selected)this.selectSkillNode(selected.id);
    }
    return;
   }
   if(!button)return;
   const action=button.dataset.characterAction;
   if(action==='tab'){this.open(button.dataset.tab);return;}
   if(action==='cast-skill'){
    const skillId=button.dataset.skillId;
    this.ui.close();this.game.castSkill(skillId);return;
   }
   if(action==='skill-branch'){
    this.selectSkillBranch(button.dataset.branch);return;
   }
   if(action==='skill-node'){
    this.selectSkillNode(button.dataset.skillNode);return;
   }
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
     this.ui.toast(t('assigned',{slot:index===9?'0':index+1}));
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
 activeTrees(){return CLASS_TREES[this.game.player.classId]||DRUID_TREES;}
 activeTree(){return this.activeTrees().find(t=>t.id===this.skillBranch)||this.activeTrees()[0];}
 rank(node){return CLASS_SKILLS[node.id]?1:0;}
 open(tab='equipment'){
  if(!this.activeTrees().some(t=>t.id===this.skillBranch)){
   this.skillBranch=this.activeTrees()[0].id;
   this.skillSelected=this.activeTrees()[0].nodes[0].id;
  }
  this.active=true;this.tab=['equipment','inventory','stats','skills'].includes(tab)?tab:'equipment';
  this.pending=null;this.render();
 }
 // Changing the inspected ability never destroys the graph's DOM nodes.
 // This preserves mouse position, focus, and both vertical and horizontal scroll.
 selectSkillNode(id){
  if(!this.active||this.tab!=='skills')return;
  const tree=this.activeTree();
  const node=tree.nodes.find(entry=>entry.id===id);
  if(!node)return;
  this.skillSelected=id;
  const content=this.ui.panel.querySelector('.char-content');
  if(!content){this.render();return;}
  content.querySelectorAll('[data-character-action="skill-node"]').forEach(button=>{
   const chosen=button.dataset.skillNode===id;
   button.classList.toggle('is-chosen',chosen);
   button.setAttribute('aria-pressed',String(chosen));
  });
  const inspector=content.querySelector('.talent-inspector');
  if(inspector)inspector.outerHTML=this.skillInspectorMarkup(node);
 }
 selectSkillBranch(id){
  const tree=this.activeTrees().find(entry=>entry.id===id);
  if(!tree||!this.active||this.tab!=='skills'||this.skillBranch===id)return;
  this.skillBranch=id;
  this.skillSelected=tree.nodes[0].id;
  const content=this.ui.panel.querySelector('.char-content');
  if(!content){this.render();return;}
  const previousTop=content.scrollTop;
  const previousLeft=content.querySelector('.talent-graph-scroll')?.scrollLeft||0;
  content.innerHTML=this.skillsMarkup();
  content.scrollTop=previousTop;
  const graph=content.querySelector('.talent-graph-scroll');
  if(graph)graph.scrollLeft=previousLeft;
 }
 inventoryItems(){
  const worn=new Set(Object.values(this.game.character.equipment).filter(Boolean));
  return this.game.character.owned.filter(id=>!worn.has(id))
   .concat(['herb','potion','wood']);
 }
 itemButton(id){
  const item=ITEMS[id];
  if(!item)return '';
  const worn=item.slot&&this.game.character.equipment[item.slot]===id;
  const quantity=itemQuantity(this.game,id);
  const label=item.consumable?'×'+quantity:'';
  return '<button type="button" class="char-item '+(this.selected===id?'is-selected ':'')+
    '" data-character-action="select" data-item="'+id+
    '" title="'+itemName(id,item.name)+'" aria-pressed="'+(this.selected===id)+'">'+
    gameIcon(item.icon,'char-item-icon')+'<small>'+itemName(id,item.name)+'</small><i>'+label+'</i></button>';
 }
 gearMarkup(){
  const character=this.game.character;
  const slotButtons=Object.entries(GEAR_SLOTS).map(([slot,name])=>{
   const id=character.equipment[slot],item=ITEMS[id];
   return '<button type="button" class="char-equip-slot" data-character-action="select" data-item="'+
     (id||character.owned.find(value=>ITEMS[value]?.slot===slot)||'staff')+
     '" title="'+gearName(slot,name)+'"><span class="char-equip-icon">'+gameIcon(item?.icon||'slot_plus')+
     '</span><span><small>'+gearName(slot,name)+'</small><strong>'+(item?itemName(id,item.name):t('free'))+'</strong></span></button>';
  });
  const bonuses=characterBonuses(character);
  const all=this.inventoryItems();
  return '<div class="char-columns"><div class="char-paper"><div class="char-section-title">'+t('equipment')+'</div>'+
   '<div class="char-hero-name">'+className(this.game.player.classId,CLASS_PROFILES[this.game.player.classId].name)+' · '+t('level')+' '+this.game.player.level+'</div>'+
   '<div class="char-figure-wrap"><canvas id="characterFigure" width="144" height="144" aria-label="Персонаж в экипировке"></canvas>'+
   Object.entries({head:'head',weapon:'weapon',cloak:'cloak',boots:'boots'}).map(([slot,position])=>
    this.game.character.equipment[slot]?'<span class="char-figure-badge char-badge-'+position+'">'+
     gameIcon(ITEMS[this.game.character.equipment[slot]].icon)+'</span>':'').join('')+
   '<div class="char-figure-label">'+(ITEMS[character.equipment.body]?itemName(character.equipment.body,ITEMS[character.equipment.body].name):t('withoutClothes'))+'</div></div>'+
   '<div class="char-equip-grid">'+slotButtons.join('')+'</div>'+
   '<div class="char-gear-summary">⚔ '+(10+this.game.player.level*3+bonuses.attack)+
   ' <span>✦ '+(CLASS_SKILLS[CLASS_PROFILES[this.game.player.classId].signature].power+this.game.player.level*3+bonuses.magic)+
   '</span> <span>🛡 '+bonuses.armor+'</span></div></div>'+
   '<div class="char-bag"><div class="char-section-title">'+t('bag')+' <small>'+all.length+' '+t('items')+'</small></div>'+
   '<div class="char-items">'+all.map(id=>this.itemButton(id)).join('')+'</div>'+
   this.selectionMarkup()+'</div></div>';
 }
 inventoryMarkup(){
  const items=this.inventoryItems();
  const empties=Array.from({length:Math.max(0,30-items.length)},()=>
   '<span class="char-empty-item" aria-hidden="true">'+gameIcon('slot_plus')+'</span>').join('');
  return '<div class="char-inventory"><div><div class="char-section-title">'+t('allItems')+' <small>'+
   items.length+' / 30 '+t('cells')+'</small></div><div class="char-items">'+
   items.map(id=>this.itemButton(id)).join('')+empties+'</div></div>'+
   '<div>'+this.selectionMarkup()+'</div></div>';
 }
 selectionMarkup(){
  const id=this.selected,item=ITEMS[id];
  if(!item)return '<div class="char-selection">'+t('inspectItem')+'</div>';
  const worn=item.slot&&this.game.character.equipment[item.slot]===id;
  const info=item.slot?'<span class="char-tag">'+gearName(item.slot,GEAR_SLOTS[item.slot])+'</span>':'';
  const equipAction=item.slot?'<button class="char-action" type="button" data-character-action="equip" data-item="'+id+
   '">'+(worn?t('unequip'):t('equipAction'))+'</button>':'';
  const slots=this.game.character.quickSlots.map((entry,i)=>
   '<button type="button" data-character-action="assign" data-index="'+i+
   '" title="'+t('selectSlot')+' '+(i===9?'0':i+1)+'">'+(i===9?'0':i+1)+
   '<small>'+gameIcon(entry==='weapon'?
     (ITEMS[this.game.character.equipment.weapon]?.icon||'slot_plus'):
     (ITEMS[entry]?.icon||'slot_plus'))+'</small></button>').join('');
  const assignment=this.pending===id?'<div class="char-assign"><strong>'+t('selectSlot')+'</strong>'+
   '<div class="char-assign-grid">'+slots+'</div></div>':'';
  const count=item.consumable||id==='wood'?' · '+t('inBag')+': '+itemQuantity(this.game,id):'';
  return '<div class="char-selection"><div class="char-selected-heading">'+gameIcon(item.icon)+
   '<div><strong>'+itemName(id,item.name)+'</strong>'+info+'</div></div>'+
   '<p>'+itemDetail(id,item.detail)+count+'</p><div class="char-selection-actions">'+equipAction+
   '<button class="char-action char-action-outline" type="button" data-character-action="assign-start" data-item="'+id+
   '">'+t('quickAssign')+'</button></div>'+assignment+'</div>';
 }
 statsMarkup(){
  const p=this.game.player,b=characterBonuses(this.game.character);
  const stats=[
   [t('level'),p.level],[t('health'),Math.ceil(p.hp)+' / '+p.maxHp],
   [t('mana'),Math.floor(p.mana)+' / '+p.maxMana],[t('experience'),p.xp+' / '+(p.level*50)],
   [t('strength'),CLASS_PROFILES[p.classId].attack+p.level*3+b.attack],[t('power'),CLASS_SKILLS[CLASS_PROFILES[p.classId].signature].power+p.level*3+b.magic],
   [t('armor'),b.armor],[t('kills'),p.kills],
   [t('coins'),p.coins],[t('mainAttack'),this.game.primaryAttackMode==='bolt'?skillName('bolt','Изумрудный луч'):t('melee')]
  ];
  return '<div class="char-stats"><div class="char-section-title">'+t('stats')+': '+className(p.classId,CLASS_PROFILES[p.classId].name)+'</div>'+
   '<p class="char-muted">'+t('statsNote')+'</p>'+
   '<div class="char-stats-grid">'+stats.map(([name,value])=>'<div><span>'+name+
   '</span><strong>'+value+'</strong></div>').join('')+'</div></div>';
 }
 skillInspectorMarkup(selected){
  const skill=CLASS_SKILLS[selected.id];
  const requirement=selected.requires?.length?
   selected.requires.map(id=>CLASS_SKILLS[id]?.name||id).join(', '):'нет';
  return '<aside class="talent-inspector"><div class="talent-inspector-icon">'+
   gameIcon(selected.icon)+'</div><div class="talent-inspector-kind">'+
   (selected.kind||'Активное')+'</div><h3>'+selected.name+'</h3>'+
   '<span class="talent-inspector-status is-learned">Открыто · готово к использованию</span>'+
   '<p>'+selected.description+'</p>'+
   '<div class="talent-effect"><strong>Эффект</strong><span>'+selected.detail+'</span></div>'+
   '<div class="talent-requirements"><span>Мана: '+skill.mana+'</span>'+
   '<span>Перезарядка: '+(skill.cooldown/1000).toFixed(1)+' с</span>'+
   '<span>Связанный узел: '+requirement+'</span></div>'+
   '<div class="talent-rank-label">Тестовый доступ <strong>3 / 3</strong></div>'+
   '<div class="talent-rank-track"><span style="width:100%"></span></div>'+
   '<button type="button" class="talent-use" data-character-action="cast-skill" data-skill-id="'+
   selected.id+'">Применить способность</button>'+
   '<small class="talent-disabled-note">Все умения открыты для испытаний на тренировочном манекене.</small></aside>';
 }
 skillsMarkup(){
  const g=this.game,character=g.character,tree=this.activeTree();
  const selected=tree.nodes.find(n=>n.id===this.skillSelected)||tree.nodes[0];
  const selectedRank=this.rank(selected);
  const learned=tree.nodes.length;
  const nodePoint=n=>({x:[0,100,300,500][n.column],y:70+n.row*127});
  const edgeMarkup=tree.nodes.flatMap(n=>n.requires.map(parentId=>{
   const parent=tree.nodes.find(p=>p.id===parentId);
   if(!parent)return '';
   const from=nodePoint(parent),to=nodePoint(n);
   const unlocked=this.rank(parent)>0&&this.rank(n)>0;
   const partial=this.rank(parent)>0;
   return '<path class="talent-connector '+(unlocked?'is-active':partial?'is-available':'is-locked')+
    '" d="M '+from.x+' '+(from.y+46)+' V '+(from.y+60)+' L '+to.x+' '+(to.y-60)+' V '+(to.y-46)+'"/>';
  })).join('');
  const nodeMarkup=tree.nodes.map(n=>{
   const position=nodePoint(n),rank=this.rank(n);
   const eligible=true;
   const active=rank>0,chosen=selected.id===n.id;
   const state=active?'learned':eligible?'unlearned':'locked';
   return '<button type="button" data-character-action="skill-node" data-skill-node="'+n.id+
    '" class="talent-node '+state+(chosen?' is-chosen':'')+'"'+
    ' style="left:'+position.x+'px;top:'+position.y+'px" aria-pressed="'+chosen+
    '" title="'+n.name+' — '+(active?'Изучено':'Пока не изучено')+'">'+
    '<span class="talent-art">'+gameIcon(n.icon)+'</span>'+
    '<span class="talent-node-label">'+n.name+'</span>'+
    '<span class="talent-node-rank">'+(active?'Ур. '+rank+'/'+n.maxRank:'0/'+n.maxRank)+'</span>'+
    '</button>';
  }).join('');
  const branchMarkup=this.activeTrees().map(branch=>{
   const count=branch.nodes.length;
   return '<button type="button" data-character-action="skill-branch" data-branch="'+branch.id+
    '" class="talent-branch talent-theme-'+branch.tone+
    (tree.id===branch.id?' is-current':'')+'" aria-pressed="'+(tree.id===branch.id)+'">'+
    gameIcon(branch.icon)+'<span><strong>'+branch.name+'</strong><small>'+branch.subtitle+
    '</small></span><i>'+count+'/'+branch.nodes.length+'</i></button>';
  }).join('');
  const selection=this.skillInspectorMarkup(selected);
  return '<div class="char-skills talent-screen">'+
   '<div class="char-section-title">Пути: '+CLASS_PROFILES[g.player.classId].name+' <small>Тест: всё открыто</small></div>'+
   '<p class="char-muted">Все умения доступны сейчас. Выбери узел и нажми «Применить способность», или используй Q/R/F для основных умений.</p>'+
   '<div class="talent-branches" role="group" aria-label="Специализации друида">'+branchMarkup+'</div>'+
   '<div class="talent-header talent-theme-'+tree.tone+'"><span>'+gameIcon(tree.icon)+'</span>'+
   '<div><h3>'+tree.name+'</h3><p>'+tree.subtitle+'</p></div>'+
   '<strong>'+learned+' из '+tree.nodes.length+'</strong></div>'+
   '<div class="talent-workspace talent-theme-'+tree.tone+'"><div class="talent-graph-scroll" aria-label="Дерево способностей '+tree.name+'">'+
   '<div class="talent-graph"><svg viewBox="0 0 600 516" preserveAspectRatio="none" aria-hidden="true">'+
   edgeMarkup+'</svg>'+nodeMarkup+'</div></div>'+selection+'</div>'+
   '<p class="talent-footnote">Все ветки и умения открыты для тестирования. Прогресс навыков будет добавлен позднее.</p></div>';
 }
 render(){
  if(!this.active)return;
  // Equipment has a dedicated slot. Never duplicate an equipped item in
  // the backpack, including the selection sidebar of the inventory tab.
  if(this.tab==='inventory'&&!this.inventoryItems().includes(this.selected))
   this.selected=this.inventoryItems()[0]||null;
  const tabNames=[['equipment','Снаряжение'],['inventory','Инвентарь'],['stats','Статистика'],['skills','Способности']];
  const nav='<nav class="char-tabs" aria-label="Вкладки персонажа">'+tabNames.map(([id,label])=>
   '<button type="button" data-character-action="tab" data-tab="'+id+'" class="'+
   (this.tab===id?'active':'')+'" aria-current="'+(this.tab===id?'page':'false')+'">'+label+'</button>').join('')+'</nav>';
  const content=this.tab==='equipment'?this.gearMarkup():this.tab==='inventory'?this.inventoryMarkup():
   this.tab==='stats'?this.statsMarkup():this.skillsMarkup();
  this.ui.show('Персонаж',''+CLASS_PROFILES[this.game.player.classId].name+' · снаряжение · способности',nav+'<div class="char-content">'+content+'</div>'+
   '<div class="char-footer">I — открыть / закрыть · Выбери предмет, чтобы надеть или назначить на клавишу 1–0.</div>');
  this.ui.panel.classList.add('character-panel');
  this.drawFigure();
 }
 drawFigure(){
  if(this.tab!=='equipment'||!this.game.assets)return;
  const canvas=this.ui.panel.querySelector('#characterFigure');
  if(!canvas?.getContext)return;
  const c=canvas.getContext('2d');c.clearRect(0,0,144,144);c.imageSmoothingEnabled=false;
  const hero=this.game.assets.images[this.game.player.sprite]||this.game.assets.images.hero;
  if(hero)c.drawImage(hero,0,0,48,48,5,5,134,134);
  // The worn gear is presented as separate generated icon badges around
  // the canvas, not as emoji overlays on the sprite.
 }
}
