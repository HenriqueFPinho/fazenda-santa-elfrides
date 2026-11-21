const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes={};
const node=id=>nodes[id]||={value:'',dataset:{},querySelectorAll:()=>[],focus(){},close(){},insertAdjacentHTML(){},click(){this.onclick?.()}};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}}});
for(const f of ['config','auth','utils','rules','lots','records','ui','returns'])vm.runInContext(fs.readFileSync((f==='demo'?__dirname+'/fixtures/demo.js':__dirname+'/../dist/js/'+f+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run("db={animals:[{id:'A',tagColor:'Verde',lot:'001',age:'13 a 24',weights:[],vaccines:[]},{id:'B',lot:'002',weights:[],vaccines:[]}],lots:[{id:'001'},{id:'002'}],session:[]}");
for(const tab of ['individual','sessao']){
 run('tab='+JSON.stringify(tab)+';render()');
 node('#pick-lot').value='001';node('#pick-lot').onchange();
 assert.match(node('#pick-animal').innerHTML,/value="A"/);
 assert.doesNotMatch(node('#pick-animal').innerHTML,/value="B"/);
 node('#pick-animal').value='A';node('#pick-animal').onchange();
 assert.equal(node('#brinco').dataset.verified,'A');
 node('#vaccinated').checked=true;node('#vname').value='Vacina anterior';
 if(tab==='sessao'){node('#weight').value='300';node('#bathed').checked=true;}
 node('#pick-lot').value='002';node('#pick-lot').onchange();
 assert.equal(node('#brinco').dataset.verified,undefined);
 assert.equal(node('#vaccinated').checked,false);assert.equal(node('#vname').value,'');
 if(tab==='sessao'){assert.equal(node('#weight').value,'');assert.equal(node('#bathed').checked,false);}
 node('#brinco').value='B';node('#brinco').oninput();
 assert.equal(node('#pick-lot').value,'');
 assert.equal(node('#pick-animal').disabled,true);
}
let permitted=false,fail=false;
ctx.authorize=async()=>permitted;ctx.modal=()=>{};ctx.renderLots=()=>{};ctx.toast=()=>{};ctx.save=()=>{if(fail)throw Error('Quota')};
(async()=>{
 await run("confirmDeleteLot({id:'001'})");
 assert.equal(node('#confirm-delete-lot').onclick,undefined);
 permitted=true;run("signedIn=true;currentRole='operador';editUnlocked=true");
 await run("confirmDeleteLot({id:'001'})");
 fail=true;node('#confirm-delete-lot').onclick();assert.equal(run('db.lots.length'),2);assert.equal(run("find('A').lot"),'001');
 fail=false;node('#confirm-delete-lot').onclick();
 assert.equal(run('db.lots.length'),1);assert.equal(run('db.animals.length'),2);
 assert.equal(run("find('A').lot"),'');assert.equal(run("find('B').lot"),'002');
 assert.equal(run("allLots().some(l=>l.id==='001')"),false);
 console.log('PASS seleção por lote nas duas telas, troca de identificação, senha, exclusão e rollback.');
})().catch(e=>{console.error(e);process.exitCode=1});
