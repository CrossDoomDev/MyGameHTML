import assert from 'node:assert/strict';
import {TILE} from '../src/map.js';
import {autoRangedSkill,canFocusShoot,findFocusApproach} from '../src/combat-focus.js';
const map={width:20,height:20,blocked:Array.from({length:20},()=>Array(20).fill(false))};
const unit=(x,y,alive=true)=>({x,y,px:(x+.5)*TILE,py:(y+.8)*TILE,alive});
const druid={...unit(5,5),classId:'druid',weaponType:'staff'};
assert.equal(autoRangedSkill(druid),'bolt','druid plus staff is a ranged class/loadout');
assert.equal(autoRangedSkill({...druid,weaponType:'sword'}),null,'melee weapon cannot auto shoot');
assert.equal(autoRangedSkill({...druid,classId:'warrior'}),null,'melee class cannot auto shoot');
for(const [id,spell,range] of [
 ['archer','aimed',6],['mage','firebolt',6],['paladin','judgment',5],
 ['cleric','smite',6]
]){
 const fighter={...druid,classId:id,weaponType:'sword'};
 assert.equal(autoRangedSkill(fighter),spell,id+' can explicitly select a mana-costed ranged spell');
 const enemy=unit(5+range,5);
 assert(canFocusShoot(map,fighter,enemy,spell),id+' firing range is respected');
 assert(!canFocusShoot(map,fighter,unit(6+range,5),spell),id+' cannot shoot beyond range');
}
assert.equal(autoRangedSkill({...druid,classId:'rogue'}),null,'rogue defaults to free melee');
assert.equal(autoRangedSkill({...druid,classId:'warrior'}),null,'warrior defaults to free melee');
assert.equal(autoRangedSkill({...druid,rangedEnabled:false}),null,'disabled ranged capability wins');
assert(canFocusShoot(map,druid,unit(9,5)),'horizontal target in range');
assert(canFocusShoot(map,druid,unit(8,8)),'diagonal target can be aimed at');
assert(!canFocusShoot(map,druid,unit(11,5)),'target outside five-tile range');
assert(!canFocusShoot(map,druid,unit(8,5,false)),'dead enemy cannot be targeted');
map.blocked[5][7]=true;
assert(!canFocusShoot(map,druid,unit(9,5)),'obstacle must block shot');
map.blocked[5][7]=false;
map.blocked[6][6]=true;
assert(!canFocusShoot(map,druid,unit(8,8)),'diagonal line must stop at tree');
map.blocked[6][6]=false;
assert(canFocusShoot(map,druid,unit(8,8)),'clearing obstruction restores line of sight');
const running={...druid,px:druid.px+13};
assert(canFocusShoot(map,running,unit(9,5)),'range uses interpolated world position while running');
assert(!canFocusShoot(map,{...druid,weaponType:'sword'},unit(7,5)),'melee weapon does not pass auto targeting');

// A left-click on a distant target must compute a cardinal approach route
// for both the melee staff and the ranged bolt without stepping on enemies.
const occupiedTarget=(x,y)=>x===10&&y===5;
const staffPath=findFocusApproach(map,{x:5,y:5},unit(10,5),'staff',occupiedTarget,druid);
assert.equal(staffPath.length,4,'melee druid crosses four tiles to reach contact range');
assert.deepEqual(staffPath.at(-1),{x:9,y:5},'staff ends one tile before its enemy');
assert(staffPath.every(({x,y})=>!(x===10&&y===5)),'never walk onto an occupied enemy tile');
const boltPath=findFocusApproach(map,{x:5,y:5},unit(12,5),'bolt',()=>false,druid);
const archer={...druid,classId:'archer',weaponType:'sword'};
const archerPath=findFocusApproach(map,{x:5,y:5},unit(13,5),'bolt',()=>false,archer);
assert.equal(archerPath.length,2,'archer uses bow ability range of six tiles');
assert.deepEqual(archerPath.at(-1),{x:7,y:5});
assert.equal(findFocusApproach(map,{x:5,y:5},unit(13,5),'staff',()=>false,archer).length,7,
 'archer in default mode must approach seven tiles to melee distance');
assert.equal(boltPath.length,2,'ranged druid stops at the edge of spell range');
assert.deepEqual(boltPath.at(-1),{x:7,y:5},'bolt approaches only as far as necessary');
assert.deepEqual(findFocusApproach(map,{x:5,y:5},unit(7,5),'bolt',()=>false,druid),[],
 'already in spell range: no unnecessary movement');
const wall={width:12,height:12,blocked:Array.from({length:12},(_,y)=>
 Array.from({length:12},(_,x)=>x===6))};
assert.deepEqual(findFocusApproach(wall,{x:5,y:5},unit(9,5),'staff',()=>false,druid),[],
 'unreachable enemy does not generate a route through impassable terrain');
console.log('PASS: class and weapon eligibility, stationary/moving ranged aim, distance, death and terrain occlusion.');
