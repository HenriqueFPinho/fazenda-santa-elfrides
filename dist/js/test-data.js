// Dados fictícios para testes. As vacinas e os intervalos não são recomendações sanitárias.

function testDataDate(baseDate, offsetDays) {
  const day = new Date(baseDate + 'T12:00:00');
  day.setDate(day.getDate() + offsetDays);
  return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
}

function createTestAnimals(baseDate) {
  const breeds = ['Angus preto', 'Angus vermelho', 'Hereford', 'Braford', 'Brangus', 'Charolês', 'Devon', 'Outros'];
  const animals = [];
  for (let i = 1; i <= 40; i++) {
    const departed = i > 24;
    const animal = {
      tagColor: TAG_COLORS[(i-1) % TAG_COLORS.length],
      id: `DEMO${String(i).padStart(3,'0')}`,
      age: ['0 a 12', '13 a 24', '25 a 36', '37+'][(i-1)%4],
      sex: i % 2 ? 'F' : 'M',
      breed: breeds[(i-1)%breeds.length],
      arrival: testDataDate(baseDate,-400-i),
      origin: ['Criação própria', 'Compra', 'Transferência'][(i-1)%3],
      from: `Propriedade fictícia ${String.fromCharCode(65+(i-1)%8)}`,
      weights: [],
      vaccines: [],
      demo: true,
    };
    // Os primeiros 12 têm cadastro completo; os 12 seguintes, diferentes lacunas.
    if (i >= 13 && i <= 24) {
      const fields = ['age','sex','breed','arrival','origin','from'];
      for(let n=0; n<1+(i-13)%6; n++) animal[fields[(i+n)%6]]='';
    }
    const count = i === 1 || i === 14 ? 0 : 1+(i%6);
    for(let n=0; n<count; n++) {
      const day = testDataDate(baseDate, -210+n*28);
      const delta = i%4===0 ? -n*4 : i%4===1 ? n*12.5 : i%4===2 ? 0 : (n%2? -7.25:9.5);
      animal.weights.push({kg: Math.round((110+i*9+delta)*100)/100, day, time: day+'T12:00:00.000Z'});
    }
    const vaccineCount = i%5;
    for(let n=0; n<vaccineCount; n++) {
      const mode = (i+n)%4;
      animal.vaccines.push({
        name: `Vacina fictícia ${['A','B','C','D'][n]} — teste`,
        day: testDataDate(baseDate,-180+n*14),
        next: departed ? '' : mode===0 ? testDataDate(baseDate,-15-n) : mode===1 ? baseDate : mode===2 ? testDataDate(baseDate,30+n*10) : '',
      });
    }
    if(i>=25 && i<=30) animal.exit={reason:'Venda',day:testDataDate(baseDate,-10-(i-25)),recipient:`Comprador fictício ${i-24}`,amount:1800+(i-25)*375.5,detail:''};
    if(i>=31 && i<=35) animal.exit={reason:'Transferência',day:testDataDate(baseDate,-12-(i-31)),recipient:`Fazenda de destino fictícia ${i-30}`,detail:['Mudança de pastagem','Reorganização do rebanho','Transferência para outra unidade','Manejo em outra propriedade','Mudança de responsável'][i-31]};
    if(i>=36) animal.exit={reason:'Morte',day:testDataDate(baseDate,-18-(i-36)),detail:['Causa não determinada — exemplo','Acidente — exemplo','Complicação de saúde — exemplo','Ocorrência no campo — exemplo','Causa em avaliação — exemplo'][i-36]};
    animals.push(animal);
  }
  return animals;
}

function createTestDataset(baseDate = today()) {
  const animals = createTestAnimals(baseDate);
  const lots = Array.from({length:8}, (_, index) => {
    const kind = ['Compra','Transferência','Criação própria','Compra','Transferência','Compra','Transferência','Criação própria'][index];
    const purchase = kind === 'Compra';
    return {
      id:String(index+1).padStart(3,'0'),
      kind,
      originProperty: `Propriedade fictícia ${index+1}`,
      entryDate:testDataDate(baseDate,-450),
      plannedExitDate:testDataDate(baseDate,index < 4 ? 45+index*15 : -5),
      ...(purchase ? {spent:8500+index*1250} : {}),
    };
  });
  animals.forEach((animal,index) => {
    const lot=lots[Math.floor(index/5)];
    animal.lot=index >= 12 && index <= 17 ? '' : lot.id;
    if(index < 12 || index % 3) animal.entryPriceKg=Number((8.5+index%7*0.65).toFixed(2));
    animal.origin=lot.kind;
    if(animal.arrival) animal.arrival=lot.entryDate;
    if(animal.exit?.reason==='Venda') animal.exit.priceKg=Number((12+index%5*0.7).toFixed(2));
    animal.baths=Array.from({length:index%4},(_,n)=>({day:testDataDate(baseDate,-160+n*25)}));
    if(index===4 || index===9) {
      animal.movements=[{
        exit:{reason:index===4?'Venda':'Transferência',day:testDataDate(baseDate,-300),
          recipient:'Propriedade fictícia de destino',detail:index===9?'Mudança de pastagem':'',
          ...(index===4?{amount:2400,priceKg:11.5}:{})},
        return:index===4
          ? {type:'Compra',day:testDataDate(baseDate,-250),from:'Vendedor fictício',amount:2600}
          : {type:'Transferência',day:testDataDate(baseDate,-250),transferReason:'Retorno à propriedade de origem'},
      }];
    }
  });
  for (const lot of lots) {
    const members = animals.filter(animal => animal.lot === lot.id);
    if (members.length && members.every(animal => animal.exit)) {
      lot.actualExitDate = members.map(animal => animal.exit.day).sort().at(-1);
      if (lot.kind === 'Compra') lot.received = members.reduce((sum, animal) => sum + (animal.exit.amount || 0), 0);
    }
  }
  lots.push({id:'009',kind:'Criação própria',originProperty:'Fazenda fictícia de teste',
    entryDate:testDataDate(baseDate,-30),plannedExitDate:testDataDate(baseDate,90)});
  return {animals,lots,session:[]};

}


async function replaceWithTestData() {
  if (!canManageAnimal() || !(await authorize())) return;
  modal('<h2>Substituir por exemplos fictícios?</h2><p>Todos os animais, lotes e registros atuais deste navegador serão substituídos por 40 animais e 9 lotes fictícios.</p><p id="test-data-error" role="alert"></p><div class="actions"><button id="confirm-test-data" class="primary">Substituir e criar exemplos</button><button id="cancel-test-data">Voltar</button></div>');
  $('#modal-close').hidden = true;
  $('#cancel-test-data').onclick = () => $('#settings').click();
  $('#confirm-test-data').onclick = () => {
    if (!canManageAnimal() || !editUnlocked) return;
    const previous = db;
    try {
      const examples = createTestDataset();
      validateBackup(examples);
      db = examples;
      save();
    } catch (error) {
      db = previous;
      $('#test-data-error').textContent = error.message || 'Não foi possível salvar os exemplos.';
      return;
    }
    $('#modal').close();
    tab = 'campo';
    render();
    toast('40 animais e 9 lotes fictícios criados.');
  };
}
