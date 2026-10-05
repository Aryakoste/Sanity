import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleGuides,matchGuides,missingTools,impact,validateRepairs} from '../src/lib/planner';
import {reviewSnapshot} from '../sanity/review';
const guides=sampleGuides();
test('planner respects category and available time',()=>{
  const matches=matchGuides(guides,'Clothing',15,[]);
  assert.equal(matches.length,1);assert.equal(matches[0]._id,'mend-guide-button');
  assert.deepEqual(matchGuides(guides,'Home textiles',15,[]),[]);
});
test('tools are resolved and only missing tools are reported',()=>{
  assert.equal(guides[0].tools.length,2);
  assert.deepEqual(missingTools(guides[0],['mend-tool-needle']).map(t=>t.name),['Scissors']);
  assert.deepEqual(missingTools(guides[0],['mend-tool-needle','mend-tool-scissors']),[]);
});
test('planner ranks ready repairs ahead of ones needing tools',()=>{
  const matches=matchGuides(guides,'Bags',60,['mend-tool-needle','mend-tool-scissors','mend-tool-pins']);
  assert.equal(matches[0]._id,'mend-guide-tote');
});
test('impact counts completed repairs and self-reported weights only',()=>{
  const base={id:'a',guideId:'g',title:'repair',createdAt:'2026-10-05',checkedSteps:[]};
  assert.deepEqual(impact([{...base,weightGrams:500},{...base,id:'b',weightGrams:200,completedAt:'2026-10-05'},{...base,id:'c',weightGrams:0,completedAt:'2026-10-05'}]),{count:2,grams:200});
});
test('corrupt browser records cannot poison totals or checklist state',()=>{
  assert.deepEqual(validateRepairs(null),[]);
  assert.deepEqual(validateRepairs([{id:'bad',weightGrams:Infinity},{id:'bad',checkedSteps:[true]},{id:'bad',weightGrams:-1}]),[]);
});
test('approval is invalidated by a content edit, but not review metadata',()=>{
  const doc={title:'Repair',source:{name:'Original',url:'https://example.com'},tools:[{_ref:'needle'}],steps:[{_key:'one',title:'Inspect',body:'Inspect fabric'}],review:{status:'inReview'}};
  assert.equal(reviewSnapshot(doc),reviewSnapshot({...doc,review:{status:'approved'}}));
  assert.notEqual(reviewSnapshot(doc),reviewSnapshot({...doc,title:'Changed repair'}));
  assert.notEqual(reviewSnapshot(doc),reviewSnapshot({...doc,tools:[{_ref:'scissors'}]}));
});
