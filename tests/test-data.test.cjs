const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
const node = id => {
  if (!nodes.has(id)) nodes.set(id, {close(){},click(){}});
  return nodes.get(id);
};
let fail = false, writes = 0;
const ctx = vm.createContext({localStorage:{getItem:()=>null},document:{querySelector:node}});
for (const file of ['config','utils','rules','lots','returns','files','auth','test-data'])
  vm.runInContext(fs.readFileSync(__dirname+'/../dist/js/'+file+'.js','utf8'),ctx);
const run = code => vm.runInContext(code,ctx);
ctx.modal=()=>{};ctx.render=()=>{};ctx.toast=()=>{};
ctx.authorize=async()=>true;
ctx.save=()=>{if(fail)throw Error('Sem espaço');writes++;};

test('exemplos cobrem cenários e são válidos para backup', () => {
  run('var examples=createTestDataset(today());validateBackup(examples)');
  assert.equal(run('examples.animals.length'),40);
  assert.equal(run('examples.lots.length'),9);
  assert.equal(run("examples.animals.filter(a=>!a.lot && !a.exit).length"),6);
  assert.equal(run("examples.animals.filter(a=>a.movements?.length).length"),2);
  assert.equal(run("new Set(examples.lots.map(l=>l.kind)).size"),3);
  assert.equal(run("examples.animals.some(a=>a.vaccines.some(v=>v.next===today()))"),true);
  assert.equal(run("examples.animals.some(a=>a.vaccines.some(v=>v.next && v.next<today()))"),true);
  assert.equal(run("examples.lots.some(l=>l.actualExitDate && l.received>0)"),true);
  assert.equal(writes,0);
});

test('substituição exige confirmação e preserva dados se gravação falhar', async () => {
  run("signedIn=true;currentRole='admin';editUnlocked=true;db={animals:[{id:'ANTIGO'}],lots:[{id:'999'}],session:[]}");
  await ctx.replaceWithTestData();
  assert.equal(run('db.animals[0].id'),'ANTIGO');
  node('#cancel-test-data').onclick();
  assert.equal(writes,0);
  await ctx.replaceWithTestData();
  fail=true;node('#confirm-test-data').onclick();
  assert.equal(run('db.animals[0].id'),'ANTIGO');
  fail=false;node('#confirm-test-data').onclick();
  assert.equal(run('db.animals.length'),40);
  assert.equal(run('db.lots.length'),9);
  assert.equal(run("db.animals.some(a=>a.id==='ANTIGO')"),false);
  assert.equal(run("db.lots.some(l=>l.id==='999')"),false);
  assert.equal(writes,1);
  run('db.animals.pop()');
  assert.equal(run('db.animals.length'),39);
});
