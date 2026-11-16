const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes={};const node=s=>nodes[s]||={value:'',dataset:{},querySelectorAll:()=>[],close(){},focus(){}};
let saved=false,fail=false;
const ctx=vm.createContext({document:{querySelector:node},localStorage:{getItem:()=>null}});
for(const f of ['config','utils','rules','ui','records','returns','files','lots']) vm.runInContext(fs.readFileSync(`${__dirname}/../dist/js/${f}.js`,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("var draft={id:'003',kind:'Compra',entryDate:'2026-01-01',spent:'2500.50',plannedExitDate:'2026-12-01'};");
assert.equal(run('validateLot(draft).id'),'003');assert.equal(run('validateLot(draft).spent'),2500.5);
for(const patch of ["{kind:'Venda'}","{kind:['Compra','Transferência']}","{spent:-1}","{entryDate:'2026-02-30'}","{plannedExitDate:'2025-01-01'}","{received:20}","{actualExitDate:'2026-02-01',received:''}","{actualExitDate:'2999-01-01',received:20}"])assert.throws(()=>run(`validateLot({...draft,...${patch}})`));
assert.equal(run("validateLot({...draft,kind:'Transferência',spent:'',actualExitDate:'2026-02-01',received:''}).spent"),undefined);
assert.equal(run("validateLot({...draft,kind:'Transferência',spent:2500,received:500}).received"),undefined);
assert.throws(()=>run("validateLot({...draft,kind:'Transferência',actualExitDate:'2999-01-01'})"));
run("db={animals:[{id:'A',lot:'003',weights:[],vaccines:[]},{id:'B',lot:'003',weights:[],vaccines:[]},{id:'C',lot:'2',weights:[],vaccines:[]},{id:'D',weights:[],vaccines:[]}],session:[],lots:[validateLot(draft)]}");
assert.equal(run('allLots().length'),2);assert.equal(run("allLots().find(l=>l.id==='003').animals.length"),2);
assert.equal(run("lotOutcome({plannedExitDate:'2026-12-01'},'2026-11-01').label"),'Saída prevista');
assert.match(run("lotOutcome({plannedExitDate:'2026-01-01'},'2026-11-01').label"),/vencida/);
assert.equal(run("lotOutcome({plannedExitDate:'2026-01-01'},'2026-11-01').received"),undefined);
run("var group={animals:[{exit:{reason:'Venda',day:'2026-01-01',amount:1000}},{exit:{reason:'Transferência',day:'2026-02-01'}}]}");
assert.equal(run("lotOutcome(group,'2026-11-01').received"),1000);assert.equal(run("lotOutcome(group,'2026-11-01').day"),'2026-02-01');
assert.equal(run("lotOutcome({...group,animals:[...group.animals,{}]},'2026-11-01').received"),undefined);
assert.equal(run("validateBackup(JSON.parse(JSON.stringify(db))).lots[0].spent"),2500.5);
assert.throws(()=>run("validateBackup({...db,lots:[db.lots[0],db.lots[0]]})"));
ctx.modal=()=>{};ctx.renderLots=()=>{};ctx.toast=()=>{};ctx.save=()=>{if(fail)throw Error('Quota');saved=true;};ctx.authorize=async()=>false;
(async()=>{
await run('openLotForm()');
for(const [id,value] of Object.entries({'lot-id':'004','lot-kind':'Transferência','lot-entry':'2026-01-01','lot-spent':'0','lot-planned':'2026-12-01','lot-actual':'','lot-received':''}))node('#'+id).value=value;
node('#lot-kind').onchange();
for (const id of ['lot-spent','lot-received']) {
  assert.equal(node('#'+id+'-field').hidden,true);
  assert.equal(node('#'+id).disabled,true);
}
assert.equal(node('#lot-spent').required,false);
node('#lot-kind').value='Compra';node('#lot-kind').onchange();
assert.equal(node('#lot-spent-field').hidden,false);
assert.equal(node('#lot-spent').disabled,false);
assert.equal(node('#lot-spent').required,true);
node('#lot-kind').value='Transferência';node('#lot-kind').onchange();
node('#lot-spent').value='';node('#lot-actual').value='2026-02-01';
node('#lot-form').onsubmit({preventDefault(){}});
assert.equal(run('db.lots.at(-1).spent'),undefined);
assert.equal(run('db.lots.at(-1).received'),undefined);
assert.equal(run('validateBackup(db).lots.length'),2);
assert.equal(saved,true);assert.equal(run('db.lots.length'),2);
await run('openLotForm()');run('editUnlocked=true');node('#lot-form').onsubmit({preventDefault(){}});assert.match(node('#lot-error').textContent,/já existe/);assert.equal(run('db.lots.length'),2);
await run('openLotForm()');node('#lot-id').value='005';fail=true;node('#lot-form').onsubmit({preventDefault(){}});assert.equal(run('db.lots.length'),2);
const handler=node('#lot-form').onsubmit;await run('openLotForm(db.lots[0])');assert.equal(node('#lot-form').onsubmit,handler); // autorização recusada não abre editor
const html=fs.readFileSync(`${__dirname}/../dist/index.html`,'utf8');const order=[...html.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,['consulta','individual','sessao','campo','lotes']);
console.log('PASS lotes: menu, agrupamento, tipos exclusivos, valores, datas, previsões, saídas parciais/completas, backup, permissões e falhas.');
})().catch(e=>{console.error(e);process.exitCode=1});

assert.equal(run("validateLot({...draft,originProperty:'Fazenda de teste'}).originProperty"),'Fazenda de teste');
assert.equal(run("validateLot({...draft,originProperty:'a'.repeat(100)}).originProperty.length"),100);
assert.throws(()=>run("validateLot({...draft,originProperty:'a'.repeat(101)})"));
assert.equal(run("validateLot({...draft,kind:'Criação própria',spent:''}).kind"),'Criação própria');
for(const [age,category] of [['0 a 12','Terneiro'],['13 a 24','Novilha'],['25 a 36','Vaca'],['37+','Vaca']]) {
  assert.equal(run('validAge('+JSON.stringify(age)+')'),true);
  assert.equal(run('cat({age:'+JSON.stringify(age)+',sex:"F"})'),category);
}
