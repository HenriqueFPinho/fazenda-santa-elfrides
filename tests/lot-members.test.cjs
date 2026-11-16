const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({localStorage:{getItem:()=>null},document:{querySelector:()=>null}});
for(const name of ['config','utils','rules','lots'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/js/'+name+'.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("db={lots:[{id:'001'},{id:'002',actualExitDate:'2026-01-01'}],session:[],animals:[{id:'A',weights:[],vaccines:[]},{id:'B',lot:'001',weights:[],vaccines:[]},{id:'C',exit:{reason:'Venda',day:'2026-01-01'},weights:[],vaccines:[]},{id:'D',weights:[],vaccines:[]}]}");
assert.equal(run("addAnimalsToLot(db,'001',['A','D']).animals.filter(a=>a.lot==='001').length"),3);
assert.equal(run("db.animals[0].lot"),undefined);
for(const expression of ["addAnimalsToLot(db,'001',['B'])","addAnimalsToLot(db,'001',['C'])","addAnimalsToLot(db,'002',['A'])","addAnimalsToLot(db,'999',['A'])","addAnimalsToLot(db,'001',[])","addAnimalsToLot(db,'001',['A','MISSING'])"]){assert.throws(()=>run(expression));}
assert.equal(run("lotAcceptsAnimals({animals:[{exit:{day:'2020-01-01',reason:'Morte'}}]})"),false);
assert.equal(run("lotAcceptsAnimals({animals:[],plannedExitDate:'2020-01-01'})"),true);
assert.equal(run("addAnimalsToLot(db,'001',['A','A']).animals.filter(a=>a.id==='A').length"),1);
console.log('PASS seleção múltipla, vínculo existente, saída, lote fechado, atomicidade e ausência de duplicação.');
