const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({localStorage:{getItem:()=>null},document:{querySelector:()=>null}});
for (const file of ['config','utils','rules','auth','campo']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',file+'.js'),'utf8'),context);
}
const run = expression => vm.runInContext(expression,context);
assert.equal(run("profileUpdates({age:'12'},{age:'20'},false).age"),undefined);
assert.equal(run("profileUpdates({age:'12'},{age:'20'},true).age"),'20');
for (const reason of ['Morte','Venda','Transferência']) {
 context.reason=reason;
 assert.equal(run('registrationBlocked({exit:{reason}},false)'),true);
 assert.equal(run('registrationBlocked({exit:{reason}},true)'),false);
}
assert.equal(run('registrationBlocked({},false)'),false);
assert.equal(run("validateExit({reason:'Venda',detail:'',recipient:'Cliente',day:'2026-01-01',amount:'1500.5'}).amount"),1500.5);
assert.throws(()=>run("validateExit({reason:'Morte',detail:'',recipient:'',day:'2026-01-01',amount:''})"));
assert.equal(run("withoutAnimal({animals:[{id:'A'},{id:'B'}],session:[{id:'A'}]},'A').animals[0].id"),'B');
assert.equal(run("withoutAnimal({animals:[{id:'A'}],session:[{id:'A'}]},'A').session.length"),0);
run("signedIn=true;currentRole='admin'");assert.equal(run('canManageAnimal()'),true);
run("currentRole='user'");assert.equal(run('canManageAnimal()'),false);
run("db.animals=[{id:'A'},{id:'B',exit:{reason:'Venda'}},{id:'C',exit:{reason:'Morte'}},{id:'D',exit:{reason:'Transferência'}}]");
for(const f of ['presente','vendido','morto','transferido']){context.filter=f;assert.equal(run("campoAnimals(filter,'').length"),1);}
console.log('Regras verificadas: cadastro parcial, permissões, saídas, exclusão e filtros.');
