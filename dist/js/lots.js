// O vínculo é o Nº do Lote da ficha; valores do lote são informados explicitamente.
const lotKey = value => String(value ?? '').trim().toUpperCase();

function allLots(data = db) {
  const lots = new Map((data.lots || []).map(lot => [lotKey(lot.id), {...lot, id:lotKey(lot.id), animals: []}]));
  for (const animal of data.animals) {
    const id = lotKey(animal.lot);
    if (!id) continue;
    if (!lots.has(id)) lots.set(id, {id, animals: []});
    lots.get(id).animals.push(animal);
  }
  return [...lots.values()].sort((a,b)=>a.id.localeCompare(b.id,'pt-BR',{numeric:true}));
}

function nextLotNumber(data = db) {
  const maximum = allLots(data).reduce((n, lot) => /^\d{3}$/.test(lot.id) ? Math.max(n, Number(lot.id)) : n, 0);
  if (maximum >= 999) throw Error('A numeração de três dígitos chegou ao limite 999.');
  return String(maximum + 1).padStart(3, '0');
}

// Converte os números antigos e atualiza os vínculos juntos, sem perder animais.
function normalizeLotNumbers(data) {
  const ids = allLots(data).map(lot=>lot.id);
  const mapping = new Map(), used = new Set();
  for (const id of ids) {
    if (/^\d{1,3}$/.test(id) && Number(id)>0) {
      const normalized = String(Number(id)).padStart(3,'0');
      if (!used.has(normalized)) { mapping.set(id,normalized); used.add(normalized); }
    }
  }
  let next = Math.max(0,...[...used].map(Number));
  for (const id of ids) {
    if (mapping.has(id)) continue;
    do { next++; } while (used.has(String(next).padStart(3,'0')));
    if (next > 999) throw Error('Não foi possível converter os lotes para três dígitos: limite 999.');
    const value = String(next).padStart(3,'0');
    mapping.set(id,value);used.add(value);
  }
  return {...data,
    ...(data.lots ? {lots:data.lots.map(lot=>({...lot,id:mapping.get(lotKey(lot.id))}))} : {}),
    animals:data.animals.map(animal=>hasInfo(animal.lot) ? {...animal,lot:mapping.get(lotKey(animal.lot))} : animal),
  };
}

function lotSelect() {
  const lots = allLots();
  return `<div><label for="lot">Nº do Lote</label><select id="lot"><option value="">Não informado</option>${lots.map(lot=>`<option value="${esc(lot.id)}">Lote ${esc(lot.id)}</option>`).join('')}</select>${lots.length ? '' : '<p class="muted">Cadastre um lote na tela Lotes para selecioná-lo.</p>'}</div>`;
}

function lotOutcome(lot, reference = today()) {
  if (lot.actualExitDate) return {label:'Saída registrada',day:lot.actualExitDate,received:lot.received};
  const animals = lot.animals || [];
  const completed = animals.length && animals.every(a => a.exit && a.exit.day <= reference);
  if (completed) {
    const sales = animals.filter(a=>a.exit.reason === 'Venda');
    return {label:'Saída registrada',day:animals.map(a=>a.exit.day).sort().at(-1),received:sales.reduce((sum,a)=>sum+Number(a.exit.amount || 0),0),automatic:true};
  }
  if (!lot.plannedExitDate) return {label:'Previsão não informada'};
  return {label:lot.plannedExitDate > reference ? 'Saída prevista' : 'Saída prevista vencida — aguardando registro',day:lot.plannedExitDate};
}

function validateLot(values) {
  const id = lotKey(values.id);
  if (!/^\d{3}$/.test(id) || Number(id) === 0) throw Error('Informe um número de lote entre 001 e 999, com três dígitos.');
  if (!['Compra','Transferência','Criação própria'].includes(values.kind)) throw Error('Escolha um único tipo de entrada.');
  if (!validDate(values.entryDate)) throw Error('Informe uma data de entrada válida.');
  const originProperty = String(values.originProperty ?? '').trim();
  if (originProperty.length > 100) throw Error('A propriedade de origem deve ter até 100 caracteres.');
  const purchase = values.kind === 'Compra';
  if (purchase && (!hasInfo(values.spent) || !Number.isFinite(Number(values.spent)) || Number(values.spent)<0)) throw Error('Informe o valor total gasto. Use zero quando não houver custo.');
  if (!validDate(values.plannedExitDate) || values.plannedExitDate < values.entryDate) throw Error('A previsão de saída deve ser igual ou posterior à entrada.');
  const lot = {id,originProperty,kind:values.kind,entryDate:values.entryDate,...(purchase ? {spent:Number(values.spent)} : {}),plannedExitDate:values.plannedExitDate};
  if (hasInfo(values.actualExitDate)) {
    if (!validDate(values.actualExitDate) || values.actualExitDate < values.entryDate || values.actualExitDate > today()) throw Error('Informe uma saída realizada entre a entrada e a data de hoje.');
    if (purchase && (!hasInfo(values.received) || !Number.isFinite(Number(values.received)) || Number(values.received)<0)) throw Error('Informe o valor recebido. Use zero quando não houver recebimento.');
    lot.actualExitDate = values.actualExitDate;
    if (purchase) lot.received = Number(values.received);
  } else if (purchase && hasInfo(values.received)) throw Error('Informe a data da saída realizada para registrar o valor recebido.');
  return lot;
}

function renderLots() {
  $('#view').innerHTML = `<div class="card"><div class="row"><h2>Lotes de entrada</h2><button class="primary" id="new-lot">+ Novo lote</button></div><p>Os animais são vinculados pelo campo Nº do Lote na ficha.</p><div class="fields">${field('lot-search','Buscar lote ou brinco')}<div><label for="lot-filter">Origem</label><select id="lot-filter"><option value="">Todos</option><option>Compra</option><option>Transferência</option><option>Criação própria</option></select></div></div><p id="lot-count"></p><div id="lot-list"></div></div>`;
  $('#new-lot').onclick = ()=>openLotForm();
  $('#lot-search').oninput = updateLots;
  $('#lot-filter').onchange = updateLots;
  updateLots();
}

function updateLots() {
  const query = lotKey($('#lot-search').value),kind = $('#lot-filter').value;
  const lots = allLots().filter(lot=>(!kind || lot.kind===kind) && (lotKey(lot.id).includes(query) || lot.animals.some(a=>lotKey(a.id).includes(query))));
  $('#lot-count').textContent = `${lots.length} lote(s) encontrado(s)`;
  $('#lot-list').innerHTML = lots.length ? lots.map((lot,i)=>{
    const outcome = lotOutcome(lot);
    return `<article class="lot-card"><div class="row"><h3>Lote ${esc(lot.id)}</h3><span class="pill">${esc(lot.kind || 'Cadastro pendente')}</span></div><dl class="animal-details"><div><dt>Propriedade de origem</dt><dd>${esc(lot.originProperty || 'Não informada')}</dd></div><div><dt>Data de entrada</dt><dd>${date(lot.entryDate)}</dd></div><div><dt>Total gasto</dt><dd>${money(lot.spent)}</dd></div><div><dt>${esc(outcome.label)}</dt><dd>${date(outcome.day)}</dd></div><div><dt>Valor recebido</dt><dd>${outcome.received !== undefined ? money(outcome.received) : 'Aguardando saída / valor'}</dd></div></dl><p>${lot.animals.length} animal(is) · Brincos: ${lot.animals.length ? lot.animals.map(a=>esc(a.id)).join(', ') : 'Nenhum animal vinculado'}</p><button type="button" data-lot-index="${i}">Ver lote →</button></article>`;
  }).join('') : '<div class="empty">Nenhum lote encontrado.</div>';
  $('#lot-list').querySelectorAll('[data-lot-index]').forEach(button=>button.onclick=()=>viewLot(lots[Number(button.dataset.lotIndex)]));
}

function viewLot(lot) {
  const outcome = lotOutcome(lot);
  modal(`<h2>Lote ${esc(lot.id)}</h2><p>${esc(lot.kind || 'Complete os dados deste lote')} · Entrada: ${date(lot.entryDate)}</p><dl class="animal-details"><div><dt>Propriedade de origem</dt><dd>${esc(lot.originProperty || 'Não informada')}</dd></div><div><dt>Valor total gasto</dt><dd>${money(lot.spent)}</dd></div><div><dt>Previsão de saída</dt><dd>${date(lot.plannedExitDate)}</dd></div><div><dt>${esc(outcome.label)}</dt><dd>${date(outcome.day)}</dd></div><div><dt>Valor recebido</dt><dd>${outcome.received !== undefined ? money(outcome.received) : 'Não informado'}</dd></div></dl>${outcome.automatic ? '<p>Resultado calculado pelas saídas registradas nas fichas dos animais.</p>' : ''}<h3>Animais vinculados (${lot.animals.length})</h3><div class="lot-animals">${lot.animals.map((a,i)=>`<button type="button" data-member="${i}">${esc(a.id)} · ${statusLabel(animalStatus(a))}</button>`).join('') || '<p>Nenhum animal vinculado.</p>'}</div><div class="actions lot-detail-actions"><button id="lot-detail-back">Voltar</button><div class="lot-admin-tools"><button id="edit-lot" class="admin-icon" aria-label="Editar lote" title="Editar lote">⚙</button><button id="delete-lot" class="admin-icon" aria-label="Excluir lote" title="Excluir lote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div></div>`);
  $('#modal-close').hidden=true;
  $('#lot-detail-back').onclick=()=>$('#modal').close();
  $('#edit-lot').onclick=()=>openLotForm(lot);
  $('#delete-lot').onclick=()=>confirmDeleteLot(lot);
  $('#modalbody').querySelectorAll('[data-member]').forEach(button=>button.onclick=()=>{
    modal(readOnlyAnimal(lot.animals[Number(button.dataset.member)])+'<div class="actions"><button id="back-lot">Voltar ao lote</button></div>');
    $('#modal-close').hidden=true;
    $('#back-lot').onclick=()=>viewLot(lot);
  });
}

async function openLotForm(existing) {
  const saved = existing && (db.lots || []).find(lot=>lotKey(lot.id)===lotKey(existing.id));
  if (saved && !(await authorize())) return;
  let generated;
  try { generated = existing?.id || nextLotNumber(); } catch (error) { toast(error.message); return; }
  const draft = existing || {id:generated};
  modal(`<form id="lot-form"><h2>${existing ? 'Dados do lote' : 'Novo lote'}</h2><div class="fields">${field('lot-id','Nº do Lote','text',draft.id || '')}<div><label for="lot-kind">Origem</label><select id="lot-kind" required><option value="">Selecione</option>${['Compra','Transferência','Criação própria'].map(kind=>`<option ${draft.kind===kind?'selected':''}>${kind}</option>`).join('')}</select></div>${field('lot-origin','Propriedade de origem','text',draft.originProperty || '')}${field('lot-entry','Data de entrada','date',draft.entryDate || '')}<div id="lot-spent-field">${field('lot-spent','Valor total gasto (R$)','number',draft.spent ?? '')}</div>${field('lot-planned','Previsão de saída','date',draft.plannedExitDate || '')}</div><h3>Saída realizada (opcional)</h3><p>Preencha após a saída efetiva do lote. Este registro não substitui as saídas nas fichas dos animais.</p><div class="fields">${field('lot-actual','Data da saída realizada','date',draft.actualExitDate || '')}<div id="lot-received-field">${field('lot-received','Valor recebido (R$)','number',draft.received ?? '')}</div></div><p id="lot-error" role="alert"></p><div class="actions"><button class="primary" type="submit">Salvar lote</button><button id="lot-back" type="button">Voltar</button></div></form>`);
  $('#modal-close').hidden=true;
  $('#lot-id').disabled=!editUnlocked;
  $('#lot-origin').maxLength=100;
  $('#lot-id').maxLength=3;
  $('#lot-id').pattern='[0-9]{3}';
  $('#lot-id').inputMode='numeric';
  for (const id of ['lot-id','lot-kind','lot-entry','lot-planned']) $('#'+id).required=true;
  for (const id of ['lot-spent','lot-received']) { $('#'+id).min='0';$('#'+id).step='.01'; }
  const updateFinancialFields = () => {
    const transfer = ['Transferência','Criação própria'].includes($('#lot-kind').value);
    for (const id of ['lot-spent','lot-received']) {
      $('#'+id+'-field').hidden = transfer;
      $('#'+id).disabled = transfer;
    }
    $('#lot-spent').required = !transfer;
  };
  $('#lot-kind').onchange = updateFinancialFields;
  updateFinancialFields();
  $('#lot-actual').max=today();
  $('#lot-back').onclick=()=>existing ? viewLot(existing) : $('#modal').close();
  $('#lot-form').onsubmit=e=>{
    e.preventDefault();
    const previous=db;
    try {
      if (saved && !editUnlocked) throw Error('Verifique a senha em Dados e segurança para alterar este lote.');
      const lot=validateLot({originProperty:$('#lot-origin').value,id:$('#lot-id').value,kind:$('#lot-kind').value,entryDate:$('#lot-entry').value,spent:$('#lot-spent').value,plannedExitDate:$('#lot-planned').value,actualExitDate:$('#lot-actual').value,received:$('#lot-received').value});
      if (!editUnlocked && lot.id !== generated) throw Error('Verifique a senha em Dados e segurança para alterar o número do lote.');
      const oldId = existing ? lotKey(existing.id) : null;
      if (allLots().some(item=>lotKey(item.id)===lot.id && lotKey(item.id)!==oldId)) throw Error('Este lote já existe. Escolha outro número.');
      db={...db,
        lots:[...(db.lots || []).filter(item=>lotKey(item.id)!==oldId),lot],
        animals:db.animals.map(animal=>oldId && lotKey(animal.lot)===oldId ? {...animal,lot:lot.id} : animal),
      };
      save();
    } catch(error) {db=previous;$('#lot-error').textContent=error.message || 'Não foi possível salvar o lote.';return;}
    $('#modal').close();renderLots();toast('Lote salvo.');
  };
}

function withoutLot(data, id) {
  return {...data,
    lots:(data.lots || []).filter(lot=>lotKey(lot.id)!==lotKey(id)),
    animals:data.animals.map(animal=>lotKey(animal.lot)===lotKey(id) ? {...animal,lot:''} : animal),
  };
}

async function confirmDeleteLot(lot) {
  if (!(await authorize())) return;
  modal(`<h2>Excluir lote ${esc(lot.id)}?</h2><p>O lote será excluído. Os animais e seus históricos serão mantidos, sem vínculo com este lote.</p><p id="delete-lot-error" role="alert"></p><div class="actions"><button id="confirm-delete-lot" class="danger-button">Excluir lote</button><button id="cancel-delete-lot">Voltar</button></div>`);
  $('#modal-close').hidden=true;
  $('#cancel-delete-lot').onclick=()=>viewLot(lot);
  $('#confirm-delete-lot').onclick=()=>{
    if (!signedIn || !editUnlocked) return;
    const previous=db;
    db=withoutLot(db,lot.id);
    try { save(); } catch {
      db=previous;
      $('#delete-lot-error').textContent='Não foi possível excluir o lote. Tente novamente.';
      return;
    }
    $('#modal').close();
    renderLots();
    toast('Lote excluído. Os animais foram mantidos.');
  };
}

function animalLotPicker() {
  return `<details class="animal-lot-picker"><summary>Selecionar animal por lote</summary><div class="fields"><div><label for="pick-lot">Lote</label><select id="pick-lot"><option value="">Selecione um lote</option>${allLots().map(lot=>`<option value="${esc(lot.id)}">Lote ${esc(lot.id)}</option>`).join('')}</select></div><div><label for="pick-animal">Animal do lote</label><select id="pick-animal" disabled><option value="">Selecione primeiro um lote</option></select></div></div></details>`;
}
