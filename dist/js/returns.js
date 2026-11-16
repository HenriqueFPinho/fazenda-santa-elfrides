// Retornos preservam a saída anterior como parte do histórico do animal.
const RETURN_MESSAGE = 'O animal verificado não pode mais ter informações alteradas, pois não está presente no campo. Deseja registrar o retorno do animal?';
function canReturnAnimal(animal) {
  return Boolean(animal) && ['vendido', 'transferido'].includes(animalStatus(animal));
}
function offerAnimalReturn(animal) {
  modal(`<h2>Registrar retorno</h2><p>${RETURN_MESSAGE}</p><div class="actions"><button id="return-yes" class="primary">Sim</button><button id="return-no">Não</button></div>`);
  $('#modal-close').hidden = true;
  $('#return-no').onclick = () => $('#modal').close();
  $('#return-yes').onclick = () => openReturnForm(animal);
}
function validateReturn(animal, values) {
  if (!canReturnAnimal(animal)) throw Error('Este animal não pode ter um retorno registrado.');
  if (!['Compra','Transferência'].includes(values.type)) throw Error('Selecione como o animal retornou.');
  if (!validDate(values.day) || values.day < animal.exit.day) throw Error('Informe uma data válida, igual ou posterior à saída.');
  if (values.type==='Compra' && (!values.from.trim() || values.amount==='' || !Number.isFinite(Number(values.amount)) || Number(values.amount)<0)) throw Error('Informe de quem foi comprado e um valor válido.');
  if (values.type==='Transferência' && !values.transferReason.trim()) throw Error('Informe o motivo da transferência.');
  return {type:values.type,day:values.day,...(values.type==='Compra'?{from:values.from.trim(),amount:Number(values.amount)}:{transferReason:values.transferReason.trim()})};
}
function applyAnimalReturn(animal, record) {
  if (!canReturnAnimal(animal)) throw Error('Animal sem saída elegível para retorno.');
  const updated = {...animal, movements:[...(animal.movements||[]),{exit:{...animal.exit},return:{...record}}]};
  delete updated.exit;
  return updated;
}
function openReturnForm(animal) {
  modal(`<form id="return-form"><h2>Retorno do animal ${esc(animal.id)}</h2><label for="return-type">Motivo do retorno</label><select id="return-type" required><option value="">Selecione</option><option>Compra</option><option>Transferência</option></select><div id="return-fields"></div><p id="return-error" role="alert"></p><div class="actions"><button type="submit" class="primary">Registrar retorno</button><button type="button" id="return-back">Voltar</button></div></form>`);
  $('#modal-close').hidden=true;
  $('#return-back').onclick=()=>offerAnimalReturn(animal);
  $('#return-type').onchange=()=>{
    const type=$('#return-type').value;
    $('#return-fields').innerHTML=type==='Compra'?`${field('return-amount','Valor gasto (R$)','number')}${field('return-day','Data da compra','date',today())}${field('return-from','De quem foi comprado')}`:type==='Transferência'?`${field('return-transfer-reason','Motivo da transferência')}${field('return-day','Data da transferência','date',today())}`:'';
    $('#return-fields').querySelectorAll('input').forEach(el=>el.required=true);
    if($('#return-day'))$('#return-day').min=animal.exit.day;
    if($('#return-amount')){$('#return-amount').min='0';$('#return-amount').step='.01';}
  };
  $('#return-form').onsubmit=e=>{
    e.preventDefault();
    const previous=db;
    try {
      const record=validateReturn(animal,{type:$('#return-type').value,day:$('#return-day')?.value||'',from:$('#return-from')?.value||'',amount:$('#return-amount')?.value??'',transferReason:$('#return-transfer-reason')?.value||''});
      const updated=applyAnimalReturn(animal,record);
      db={...db,animals:db.animals.map(a=>a.id===animal.id?updated:a)};
      save();
    } catch(error){db=previous;$('#return-error').textContent=error.message||'Não foi possível salvar o retorno.';return;}
    $('#modal').close();render();$('#brinco').value=animal.id;$('#verify').click();toast('Retorno registrado. O animal está novamente na fazenda.');
  };
}
function movementHistory(animal) {
  if(!animal.movements?.length)return '';
  return `<h3>Histórico de saídas e retornos</h3>${animal.movements.map(m=>`<section class="hint">${hasInfo(m.exit.priceKg)?`<p>Preço do Kilo de Saída: ${money(m.exit.priceKg)}</p>`:""}<b>Saída: ${esc(m.exit.reason)} · ${date(m.exit.day)}</b>${m.exit.detail?`<p>Motivo: ${esc(m.exit.detail)}</p>`:''}${m.exit.recipient?`<p>Destinatário: ${esc(m.exit.recipient)}</p>`:''}${m.exit.amount!==undefined?`<p>Valor de saída: R$ ${Number(m.exit.amount).toFixed(2)}</p>`:''}<p><b>Retorno por ${esc(m.return.type)} · ${date(m.return.day)}</b>${m.return.reason?`<br>Motivo: ${esc(m.return.reason)}`:''}${m.return.from?`<br>Comprado de: ${esc(m.return.from)}`:''}${m.return.amount!==undefined?`<br>Valor gasto: R$ ${Number(m.return.amount).toFixed(2)}`:''}${m.return.transferReason?`<br>Motivo da transferência: ${esc(m.return.transferReason)}`:''}</p></section>`).join('')}`;
}
