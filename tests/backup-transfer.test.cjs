const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function browser(initial = null) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value:'', files:[], close(){}, focus(){}, click(){this.clicked=true;}});
    return nodes.get(id);
  };
  let stored = initial, exportedBlob;
  const context = vm.createContext({
    Blob,
    URL: {createObjectURL(blob){exportedBlob=blob;return 'blob:test';},revokeObjectURL(){}},
    document:{querySelector:node,querySelectorAll:()=>[]},
    localStorage:{getItem:()=>stored,setItem(key,value){stored=value;}},
    confirm:()=>true
  });
  const run = code => vm.runInContext(code, context);
  for (const file of ['config','utils','rules','ui','records','lots','returns','files','campo','test-data']) {
    run(fs.readFileSync(__dirname+'/../dist/js/'+file+'.js','utf8'));
  }
  context.render=()=>{};context.stats=()=>{};context.modal=()=>{};context.toast=()=>{};
  context.authorize=async()=>true;
  run(fs.readFileSync(__dirname+'/../dist/js/app.js','utf8'));
  return {node,run,blob:()=>exportedBlob,stored:()=>stored};
}

test('backup baixado transfere todos os registros para outro navegador e persiste após reabrir', async () => {
  const sender=browser();
  sender.run("db=createTestDataset(today());db.lastWeighingDay=today();db.sessionVaccine={name:'Vacina teste',next:''};db.session=[{id:db.animals[1].id,...db.animals[1].weights[0]}]");
  const original=sender.run('JSON.stringify(db)');
  sender.node('#settings').onclick();
  sender.node('#backup').onclick();
  assert.equal(sender.node('#download-file').clicked,true);
  assert.match(sender.node('#download-file').download,/^campo-backup-.*\.json$/);
  assert.equal(sender.blob().type,'application/json');
  const fileText=await sender.blob().text();
  assert.deepEqual(JSON.parse(fileText),JSON.parse(original));
  const recipient=browser();
  recipient.node('#settings').onclick();
  const file={text:async()=>fileText};
  await recipient.node('#restore').onchange({target:{files:[file]}});
  assert.deepEqual(JSON.parse(recipient.run('JSON.stringify(db)')),JSON.parse(original));
  assert.deepEqual(JSON.parse(recipient.stored()),JSON.parse(original));
  const reopened=browser(recipient.stored());
  assert.equal(reopened.run('storageError'),null);
  assert.equal(reopened.run('db.animals.length'),40);
  assert.equal(reopened.run('db.lots.length'),9);
  assert.equal(reopened.run("db.animals.every(a=>readOnlyAnimal(a).includes(a.id))"),true);
  assert.match(reopened.run('readOnlyAnimal(db.animals[0])'),/meses/);
  assert.match(reopened.run("tab='individual';profileFields()"),/Idade estimada \(Meses\)/);
});
