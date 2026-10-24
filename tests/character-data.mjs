import assert from 'node:assert/strict';
import {ITEMS,GEAR_SLOTS,defaultCharacter,sanitizeCharacter,characterBonuses,
 equipCharacterItem,assignCharacterQuickSlot,loadCharacter,persistCharacter} from '../src/character-data.js';
const store=new Map();
globalThis.localStorage={
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value)
};
const character=defaultCharacter();
assert.equal(Object.keys(GEAR_SLOTS).length,5,'five dressable equipment slots');
assert.equal(character.equipment.weapon,'staff');
assert.equal(character.quickSlots.length,10,'one through zero have ten editable slots');
assert.deepEqual(character.quickSlots.slice(0,6),
 ['weapon','herb','potion','wood','bag','journal']);
assert.equal(character.skillPoints,0,'do not invent skill point earnings');
assert.deepEqual(character.skillRanks,{bolt:1,roots:1,heal:1});
const armor=characterBonuses(character).armor;
assert(equipCharacterItem(character,'shirt'),'swap into a linen shirt');
assert.equal(character.equipment.body,'shirt');
assert(characterBonuses(character).armor<armor,'gear changes stats');
assert(equipCharacterItem(character,'sword'),'switch from staff to sword');
assert.equal(ITEMS[character.equipment.weapon].weaponType,'sword');
assert(assignCharacterQuickSlot(character,'potion',9),'assign consumable to keyboard zero');
assert.equal(character.quickSlots[9],'potion');
assert(assignCharacterQuickSlot(character,'shirt',5),'gear can be assigned to a quick slot');
assert.equal(character.quickSlots[5],'shirt');
assert(!assignCharacterQuickSlot(character,'missing',2),'disallow unknown items');
assert(!assignCharacterQuickSlot(character,'potion',10),'disallow extra slots');
assert(assignCharacterQuickSlot(character,null,5),'unassigning a quick slot is supported');
persistCharacter(character);
const restored=loadCharacter();
assert.equal(restored.equipment.body,'shirt');
assert.equal(restored.equipment.weapon,'sword');
assert.equal(restored.quickSlots[9],'potion');
assert.equal(restored.quickSlots[5],null);
store.set('tiholesye-character-v1',JSON.stringify({
 equipment:{weapon:'not-real',body:'sword'},
 quickSlots:['fake','potion',null],
 skillPoints:999999,skillRanks:{bolt:99,roots:99,heal:99}
}));
const sanitized=loadCharacter();
assert.equal(sanitized.equipment.weapon,'staff','bad weapon cannot be loaded');
assert.equal(sanitized.equipment.body,'robe','mismatched equipment slot is invalid');
assert.equal(sanitized.quickSlots[0],null);
assert.equal(sanitized.quickSlots[1],'potion');
assert.equal(sanitized.skillPoints,0,'future upgrades cannot be forged locally');
assert.deepEqual(sanitized.skillRanks,{bolt:1,roots:1,heal:1});
console.log('PASS: character equipment, stat bonuses, inventory shortcuts, persistence, and validation.');
