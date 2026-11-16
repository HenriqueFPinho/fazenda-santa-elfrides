// Dados fictícios para testes. As vacinas e os intervalos não são recomendações sanitárias.
const DEMO_DATASET_VERSION = 2;

function demoDate(baseDate, offsetDays) {
  const day = new Date(baseDate + 'T12:00:00');
  day.setDate(day.getDate() + offsetDays);
  return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
}

function createDemoAnimals(baseDate) {
  const breeds = ['Angus', 'Hereford', 'Nelore', 'Braford', 'Brangus', 'Charolês', 'Jersey', 'Holandesa'];
  const animals = [];
  for (let i = 1; i <= 40; i++) {
    const departed = i > 24;
    const animal = {
      id: `DEMO${String(i).padStart(3,'0')}`,
      age: String([0, 5, 12, 13, 18, 24, 25, 30, 36, 37, 42, 50][(i-1)%12]),
      sex: i % 2 ? 'F' : 'M',
      breed: breeds[(i-1)%breeds.length],
      arrival: demoDate(baseDate,-400-i),
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
      const day = demoDate(baseDate, -210+n*28);
      const delta = i%4===0 ? -n*4 : i%4===1 ? n*12.5 : i%4===2 ? 0 : (n%2? -7.25:9.5);
      animal.weights.push({kg: Math.round((110+i*9+delta)*100)/100, day, time: day+'T12:00:00.000Z'});
    }
    const vaccineCount = i%5;
    for(let n=0; n<vaccineCount; n++) {
      const mode = (i+n)%4;
      animal.vaccines.push({
        name: `Vacina fictícia ${['A','B','C','D'][n]} — teste`,
        day: demoDate(baseDate,-180+n*14),
        next: departed ? '' : mode===0 ? demoDate(baseDate,-15-n) : mode===1 ? baseDate : mode===2 ? demoDate(baseDate,30+n*10) : '',
      });
    }
    if(i>=25 && i<=30) animal.exit={reason:'Venda',day:demoDate(baseDate,-10-(i-25)),recipient:`Comprador fictício ${i-24}`,amount:1800+(i-25)*375.5,detail:''};
    if(i>=31 && i<=35) animal.exit={reason:'Transferência',day:demoDate(baseDate,-12-(i-31)),recipient:`Fazenda de destino fictícia ${i-30}`,detail:['Mudança de pastagem','Reorganização do rebanho','Transferência para outra unidade','Manejo em outra propriedade','Mudança de responsável'][i-31]};
    if(i>=36) animal.exit={reason:'Morte',day:demoDate(baseDate,-18-(i-36)),detail:['Causa não determinada — exemplo','Acidente — exemplo','Complicação de saúde — exemplo','Ocorrência no campo — exemplo','Causa em avaliação — exemplo'][i-36]};
    animals.push(animal);
  }
  return animals;
}

function addDemoAnimals(data, baseDate) {
  if(data.demoDatasetVersion >= DEMO_DATASET_VERSION) return data;
  const animals = createDemoAnimals(baseDate);
  const lots = Array.from({length:8}, (_, index) => {
    const purchase = index % 2 === 0;
    return {
      id:String(index+1).padStart(3,'0'),
      kind:purchase ? 'Compra' : 'Transferência',
      entryDate:demoDate(baseDate,-450),
      plannedExitDate:demoDate(baseDate,index < 4 ? 45+index*15 : -5),
      ...(purchase ? {spent:8500+index*1250} : {}),
    };
  });
  animals.forEach((animal,index) => {
    const lot=lots[Math.floor(index/5)];
    animal.lot=lot.id;
    if(index < 12 || index % 3) animal.entryPriceKg=Number((8.5+index%7*0.65).toFixed(2));
    animal.origin=lot.kind;
    if(animal.arrival) animal.arrival=lot.entryDate;
    if(animal.exit?.reason==='Venda') animal.exit.priceKg=Number((12+index%5*0.7).toFixed(2));
    animal.baths=Array.from({length:index%4},(_,n)=>({day:demoDate(baseDate,-160+n*25)}));
    if(index===4 || index===9) {
      animal.movements=[{
        exit:{reason:index===4?'Venda':'Transferência',day:demoDate(baseDate,-300),
          recipient:'Propriedade fictícia de destino',detail:index===9?'Mudança de pastagem':'',
          ...(index===4?{amount:2400,priceKg:11.5}:{})},
        return:index===4
          ? {type:'Compra',day:demoDate(baseDate,-250),from:'Vendedor fictício',amount:2600}
          : {type:'Transferência',day:demoDate(baseDate,-250),transferReason:'Retorno à propriedade de origem'},
      }];
    }
  });
  // Substituição única solicitada: nunca recria animais excluídos após esta versão.
  return {animals,lots,session:[],demoDatasetVersion:DEMO_DATASET_VERSION};

}

