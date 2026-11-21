// Consulta somente leitura do rebanho

function campoAnimals(filter, query) {
  return db.animals
    .filter(
      (a) =>
        (filter === "todos" || animalStatus(a) === filter) &&
        a.id.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));
}

function renderCampo() {
  $("#view").innerHTML =
    `<div class="card"><h2>Animais cadastrados</h2><p>Abra uma ficha para consultar todos os registros. Esta tela é somente de visualização.</p><div class="fields"><div><label for="campo-filter">Situação</label><select id="campo-filter"><option value="todos">Todos os animais</option><option value="presente">Na fazenda</option><option value="morto">Mortos</option><option value="transferido">Transferidos</option><option value="vendido">Vendidos</option></select></div>${field("campo-search", "Buscar por brinco")}</div><p id="campo-count" aria-live="polite"></p><button type="button" id="campo-export">Exportar Excel</button><div id="campo-list"></div></div>`;
  $("#campo-filter").onchange = updateCampo;
  $("#campo-search").oninput = updateCampo;
  updateCampo();
}

function updateCampo() {
  const animals = campoAnimals(
    $("#campo-filter").value,
    $("#campo-search").value,
  );
  $("#campo-export").disabled = !animals.length;
  $("#campo-export").onclick = () => exportCampo(animals);
  $("#campo-count").textContent = `${animals.length} animal(is) encontrado(s)`;
  $("#campo-list").innerHTML = animals.length
    ? animals
        .map(
          (a, i) =>
            `<button type="button" class="campo-animal" data-animal-index="${i}"><span><b>Brinco ${esc(a.id)}</b>${a.demo?'<span class="muted">Animal fictício para teste</span>':''}<span class="muted">${esc(a.breed || "Raça não informada")} · ${a.weights.length} pesagem(ns)</span></span><span class="campo-right"><span class="pill status-${animalStatus(a)}">${statusLabel(animalStatus(a))}</span><span>${last(a) ? `${last(a).kg} kg` : "Sem pesagem"} <span aria-hidden="true"> →</span></span></span></button>`,
        )
        .join("")
    : '<div class="empty">Nenhum animal encontrado para este filtro.</div>';
  $("#campo-list")
    .querySelectorAll("[data-animal-index]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          viewCampoAnimal(animals[Number(b.dataset.animalIndex)])),
    );
}

function readOnlyAnimal(a) {
  const weights = sort(a),
    item = (label, value) =>
      `<div><dt>${label}</dt><dd>${esc(hasInfo(value) ? value : "Não informado")}</dd></div>`;
  return `<h2>Brinco ${esc(a.id)}</h2><span class="pill status-${animalStatus(a)}">${statusLabel(animalStatus(a))}</span><p>Ficha completa · Somente visualização</p><dl class="animal-details">${item("Idade (Em meses)", hasInfo(a.age) ? a.age + " meses" : "")}${item("Categoria", hasInfo(a.age) ? cat(a) : "")}${item("Raça", a.breed)}${item("Sexo", a.sex === "F" ? "Fêmea" : a.sex === "M" ? "Macho" : "")}${item("Data de entrada", a.arrival ? date(a.arrival) : "")}${item("Origem", a.origin)}${item("Propriedade de Origem", a.from)}${item("Último peso", last(a) ? last(a).kg + " kg" : "")}</dl>${a.exit ? `<section class="hint"><h3>Registro de saída</h3><dl class="animal-details">${item("Tipo", a.exit.reason)}${item("Data", date(a.exit.day))}${item("Motivo", a.exit.detail)}${item("Destinatário", a.exit.recipient)}${a.exit.amount !== undefined ? item("Valor", Number(a.exit.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })) : ""}</dl></section>` : ""}${entryDetails(a)}${movementHistory(a)}${bathHistory(a)}<h3>Histórico completo de pesagens</h3>${weights.length ? weights.map((r, i) => `<div class="row"><span>${date(r.day)}</span><b>${r.kg} kg</b><span>${i ? `${(r.kg - weights[i - 1].kg).toFixed(1)} kg` : "Primeiro registro"}</span></div>`).join("") : "<p>Nenhuma pesagem registrada.</p>"}<h3>Vacinas realizadas, próximas doses e pendências</h3>${a.vaccines.length ? a.vaccines.map((v) => `<div class="row"><span><b>${esc(v.name)}</b><br>Aplicação: ${date(v.day)}<br>Próxima dose: ${v.next ? date(v.next) : "Não informada"}</span>${vaccinationBadge(v.next)}</div>`).join("") : "<p>Sem informação de vacinação.</p>"}`;
}

function viewCampoAnimal(a) {
  modal(readOnlyAnimal(a));
  $("#modal-close").textContent = "Voltar";
}

function exportCampo(animals) {
  const sheets = {};
  for (const animal of animals) {
    const {Cadastro, ...history} = animalSheets(animal);
    if (!sheets.Animais) sheets.Animais = [Cadastro.slice(1).map(row => row[0])];
    sheets.Animais.push(Cadastro.slice(1).map(row => row[1]));
    for (const [name, [header, ...rows]] of Object.entries(history)) {
      if (!sheets[name]) sheets[name] = [['Identificador da ficha', ...header]];
      for (const row of rows) sheets[name].push([animal.id, ...row]);
    }
  }
  download("Campo.xlsx", workbook(sheets), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
