import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASS_PROFILES,CLASS_TREES,CLASS_SKILLS} from '../src/class-skills.js';
import {ITEMS,GEAR_SLOTS} from '../src/character-data.js';
const store=new Map();
globalThis.localStorage={
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value)
};
const {language,setLanguage,t,className,classStyle,weaponName,skillName,skillDescription,
 branchName,branchSubtitle,itemName,itemDetail,gearName,translateStatic,LOCALE_KEY}=
 await import('../src/i18n.js');
assert.equal(language(),'ru','Russian is the default language');
assert.equal(t('menu'),'МЕНЮ');
assert.equal(className('druid','Друид'),'Друид');
assert.equal(t('skills'),'Способности');
const image={src:'assets/icon.png',backgroundImage:'url(assets/frame.png)'};
const mock=(key,text='')=>({dataset:{i18n:key},textContent:text,title:'',attributes:{},
 setAttribute(k,v){this.attributes[k]=v}});
const menu=mock('menu'),label=mock('menu'),aria=mock('character');
const doc={
 documentElement:{lang:'ru'},
 querySelectorAll(sel){
  return sel==='[data-i18n]'?[menu]:
    sel==='[data-i18n-title]'?[Object.assign(label,{dataset:{i18nTitle:'menu'}})]:
    sel==='[data-i18n-aria]'?[Object.assign(aria,{dataset:{i18nAria:'character'}})]:[];
 }
};
globalThis.document=doc;
setLanguage('en');
translateStatic();
assert.equal(document.documentElement.lang,'en','HTML language changes');
assert.equal(store.get(LOCALE_KEY),'en','choice persists to dedicated language setting');
assert.equal(t('menu'),'MENU','game menu is localized, not baked into imagery');
assert.equal(menu.textContent,'MENU','visual captions are real DOM text');
assert.equal(label.title,'MENU','tooltips translate');
assert.equal(aria.attributes['aria-label'],'Character','accessibility labels translate');
assert.equal(image.src,'assets/icon.png','locale never replaces or renames image assets');
assert.equal(image.backgroundImage,'url(assets/frame.png)','same panel artwork works in both languages');
assert.equal(className('mage','Маг'),'Mage');
assert.equal(classStyle('rogue','Разбойник'),'Poison, trickery and stealth');
assert.equal(weaponName('archer','Лук'),'Bow');
for(const [id,item] of Object.entries(ITEMS)){
 assert(itemName(id,item.name)!==item.name,'English item name required: '+id);
 assert(itemDetail(id,item.detail)!==item.detail,'English item detail required: '+id);
}
for(const [id,value] of Object.entries(GEAR_SLOTS))
 assert(gearName(id,value)!==value,'gear slot translated: '+id);
for(const [id,spell] of Object.entries(CLASS_SKILLS)){
 assert(skillName(id,spell.name)!==spell.name,'English spell name required: '+id);
 assert(!/[А-яЁё]/.test(skillName(id,spell.name)),'English spell name uses Latin text: '+id);
 assert(skillDescription(spell,spell.detail)!==spell.detail,'English effect explanation: '+id);
}
for(const [classId,branches] of Object.entries(CLASS_TREES))for(const branch of branches){
 assert(branchName(classId,branch.id,branch.name)!==branch.name,
  'English branch label: '+classId+'/'+branch.id);
 assert(branchSubtitle(classId,branch.id,branch.subtitle)!==branch.subtitle,
  'English branch subtitle: '+classId+'/'+branch.id);
}
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-i18n="menu"'),'visual HUD heading is a text node, not a graphic');
assert(html.includes('data-i18n-aria="settings"'),'accessible button caption is dynamic');
assert(html.includes('data-i18n="hint"'),'controls guide is dynamic text');
const style=fs.readFileSync('style.css','utf8');
assert(style.includes("background-image:url('assets/forest-hud-icons.png')"),
 'existing UI icons remain separated from translated labels');
setLanguage('ru');
translateStatic();
assert.equal(menu.textContent,'МЕНЮ','same interface switches back without image edits');
assert.equal(document.documentElement.lang,'ru');
assert.equal(store.get(LOCALE_KEY),'ru');
assert.equal(skillName('bolt','Изумрудный луч'),'Изумрудный луч');
assert.equal(t('classPicker'),'Тестирование игровых классов');
console.log('PASS: RU/EN UI labels, all class skills, items and branches; text independent of art.');
