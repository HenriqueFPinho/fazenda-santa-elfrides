const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'fixtures/demo.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),animals=run("createDemoAnimals('2026-11-06')");
assert.equal(animals.length,40);assert.equal(new Set(animals.map(a=>a.id)).size,40);
assert.equal(animals.filter(a=>!a.exit).length,24);
for(const [reason,count] of [['Venda',6],['Transferência',5],['Morte',5]])assert.equal(animals.filter(a=>a.exit?.reason===reason).length,count);
assert(animals.some(a=>!a.weights.length));assert(animals.some(a=>a.weights.length>4));assert(animals.some(a=>a.vaccines.length>2));assert(animals.some(a=>a.vaccines.some(v=>v.next&&v.next<'2026-11-06')));
for(const a of animals){for(const w of a.weights){assert(w.kg>0);assert(w.day>=a.arrival||!a.arrival);if(a.exit)assert(w.day<=a.exit.day)}for(const v of a.vaccines){if(v.next)assert(v.next>=v.day);if(a.exit)assert(v.day<=a.exit.day)}}

run("original={animals:[{id:'ANTIGO'}],session:[],lots:[{id:'999'}]};seeded=addDemoAnimals(original,'2026-11-06')");
assert.equal(run('seeded.animals.length'),40);
assert.equal(run('seeded.lots.length'),8);
assert.equal(run("seeded.animals.some(a=>a.id==='ANTIGO')"),false);
assert.equal(run('seeded.animals.every(a=>seeded.lots.some(l=>l.id===a.lot))'),true);
assert.equal(run("seeded.lots.filter(l=>l.kind==='Transferência').every(l=>l.spent===undefined)"),true);
assert.equal(run('seeded.animals.filter(a=>a.movements?.length).length'),2);
assert.equal(run("addDemoAnimals(seeded,'2026-11-07')===seeded"),true);
run('seeded.animals.pop()');
assert.equal(run("addDemoAnimals(seeded,'2026-11-07').animals.length"),39);
console.log('PASS: substituição única, 40 animais, 8 lotes, vínculos, retornos e exclusões preservadas.');
