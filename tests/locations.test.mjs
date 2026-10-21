import assert from 'node:assert/strict';
import { TILE, SPAWN, createMap, findPath, isBlocked } from '../src/map.js';

const scenes = {
  village: { width: 64, height: 48, portals: 4 },
  forest: { width: 100, height: 80, portals: 4 },
  tavern: { width: 24, height: 18, portals: 1 }
};
const spawn = { village: SPAWN, forest: { x: 3, y: 40 }, tavern: { x: 12, y: 14 } };

for (const [id, expected] of Object.entries(scenes)) {
  const map = createMap(id);
  assert.equal(map.id, id);
  assert.equal(map.width, expected.width);
  assert.equal(map.height, expected.height);
  assert.equal(map.portals.length, expected.portals);
  assert.equal(map.terrain.length, map.height);
  assert(map.terrain.every(row => row.length === map.width));
  assert.equal(isBlocked(map, spawn[id].x, spawn[id].y), false, id + ': blocked spawn');

  for (const exit of map.portals) {
    assert.equal(isBlocked(map, exit.x, exit.y), false, id + ': blocked exit');
    const route = findPath(map, spawn[id].x, spawn[id].y, exit.x, exit.y);
    assert(route.length > 0, id + ': exit is unreachable');
    const next = createMap(exit.to);
    assert.equal(isBlocked(next, exit.spawn.x, exit.spawn.y), false, id + ': blocked destination');
  }
}
const village = createMap('village');
const forest = createMap('forest');
const tavern = createMap('tavern');
assert.equal(TILE, 32);
assert(village.buildings.some(b => b.id === 'inn'), 'missing tavern building');
assert(village.buildings.some(b => b.id === 'chapel'), 'missing chapel');
assert(village.objects.some(o => o.sprite === 'fountain'), 'missing central fountain');
for(const b of village.buildings){
 assert(b.w % 2 === 1, 'odd house width: '+b.id);
 assert.equal(b.doorX, b.x+(b.w-1)/2,'door in center tile: '+b.id);
}
assert.equal(forest.buildings.length, 0, 'forest must not contain village houses');
assert(forest.objects.filter(o => o.tree).length > 600, 'forest must have a dense tree canopy');
assert(village.objects.filter(o => o.tree).length < 100, 'village must remain open');
for (const [x, y] of [[18,40],[27,38],[36,63],[50,47],[70,20],[80,63],[88,33]]) {
  assert.equal(isBlocked(forest,x,y), false, 'forest enemy spawn blocked');
}
for (const b of village.buildings) {
  const y=b.doorY+1;
  assert.equal(isBlocked(village,b.doorX,y),false,'house entrance inaccessible: '+b.id);
  const route=findPath(village,SPAWN.x,SPAWN.y,b.doorX,y);
  assert(route.length>0, 'house unreachable: '+b.id);
}
assert(findPath(tavern,12,14,12,16).length>0,'tavern exit unreachable');
console.log('Тихолесье: все проверки карт и переходов пройдены.');
