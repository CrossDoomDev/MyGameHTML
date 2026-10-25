import assert from 'node:assert/strict';
import {DRUID_TREES,DRUID_NODE_BY_ID,findDruidTree,nodeRank,nodeRequirementsMet,branchLearnedCount} from '../src/druid-tree.js';
import {defaultCharacter,sanitizeCharacter} from '../src/character-data.js';
import {DRUID_SKILLS} from '../src/druid-skills.js';

assert.equal(DRUID_TREES.length,4,'four MMO-like druid specializations');
assert.deepEqual(DRUID_TREES.map(t=>t.id),['wrath','grove','restoration','wild']);
const ids=new Set();
for(const tree of DRUID_TREES){
 assert.equal(tree.nodes.length,7,tree.name+' has a meaningful multi-tier graph');
 for(const node of tree.nodes){
  assert(!ids.has(node.id),'ability IDs must not clash across specializations');
  ids.add(node.id);
  assert(node.column>=1&&node.column<=3,'nodes fit the 3-column visual graph');
  assert(node.row>=0&&node.row<=3,'nodes fit four vertical tiers');
  assert(node.maxRank===3,'future skill rank labels are consistent');
  assert(node.icon&&node.name&&node.description&&node.detail,'complete skill metadata');
  for(const required of node.requires){
   const prev=tree.nodes.find(n=>n.id===required);
   assert(prev,tree.id+': requirement belongs to the same specialization: '+required);
   assert(prev.row<node.row,'talent dependencies go forward, never form cycles');
  }
 }
 assert(tree.nodes[0].row===0,'first node is the specialization root');
 assert(tree.nodes.at(-1).row===3,'last node is the major capstone');
}
assert.equal(ids.size,28,'exactly 28 distinct talents are available for preview');
const character=defaultCharacter();
for(const skill of Object.keys(DRUID_SKILLS)){
 assert(DRUID_NODE_BY_ID[skill],'existing active spell preserved in progression tree');
 assert.equal(nodeRank(character,skill),1,skill+' is learned at the start');
}
for(const branch of DRUID_TREES){
 assert.equal(branchLearnedCount(character,branch.id),branch.id==='wild'?0:1);
}
assert(nodeRequirementsMet(character,'thornshot'),'learned emerald bolt opens its next path conceptually');
assert(nodeRequirementsMet(character,'regrowth'),'learned heal opens its next path conceptually');
assert(!nodeRequirementsMet(character,'tempest'),'late-stage spell is gated by predecessors');
assert(!nodeRequirementsMet(character,'claws'),'unlearned animal form does not unlock its descendants');
assert.equal(findDruidTree('wild').id,'wild');
assert.equal(findDruidTree('invalid').id,'wrath','unknown UI branch defaults safely');
assert.equal(nodeRank(character,'missing'),0);
const tampered=sanitizeCharacter({skillRanks:{bolt:3,roots:3,heal:3,claws:3},skillPoints:9999});
assert.equal(tampered.skillPoints,0,'unapproved point grants remain blocked');
assert.equal(nodeRank(tampered,'claws'),0,'locked ability cannot be injected via local storage');
assert.equal(nodeRank(tampered,'bolt'),1,'existing spells are unmodified');
console.log('PASS: Four druid talent paths, 28 connected nodes, prerequisites and safe progression lock.');
