// Pesagens e cadastro parcial

function sessionRows() {
  if (tab === "individual") return;
  $("#sessionrows").innerHTML = db.session.length
    ? db.session
        .map(
          (r) =>
            `<div class="row"><b>${esc(r.id)}</b><span>${r.kg} kg</span></div>`,
        )
        .join("") +
      `<div class="actions"><button id="finish">Finalizar sessão (${db.session.length})</button></div>`
    : '<div class="empty"><i>▦</i>Nenhum registro nesta sessão.<p>Os animais pesados aparecerão aqui.</p></div>';
  if ($("#finish"))
    $("#finish").onclick = () => {
      modal(
        "<h2>Resumo da sessão</h2>" +
          db.session
            .map(
              (r) =>
                `<div class="row"><b>${esc(r.id)}</b><span>${r.kg} kg · ${date(r.day)}</span></div>`,
            )
            .join("") +
          '<p>Todos os registros foram salvos no aparelho.</p><button onclick="window.print()">Imprimir / salvar PDF</button>',
      );
      const previous = db;
      db = {...db, session: []};
      delete db.sessionVaccine;
      try { save(); } catch {
        db = previous;
        toast("Não foi possível finalizar a sessão. Tente novamente.");
        return;
      }
      render();
    };
}

function refreshProfileLocks() {
  if (!$("#brinco")?.dataset.verified) return;
  const current = find($("#brinco").dataset.verified);
  const blocked = registrationBlocked(current, editUnlocked);
  for (const el of $("#entry").querySelectorAll(
    "input,select,button[type=submit]",
  ))
    if (!["brinco","pick-lot","pick-animal"].includes(el.id)) el.disabled = blocked;
  $("#vfields").querySelectorAll("input").forEach(input => input.disabled = blocked || !$("#vaccinated").checked);
  if (blocked) {
    $("#known").textContent = DEPARTED_MESSAGE;
    return;
  }
  $("#known").textContent = current
    ? `Animal cadastrado • Peso anterior: ${last(current)?.kg ?? "—"} kg (${date(last(current)?.day)})${current.exit ? " • Animal com saída registrada — edição autorizada" : ""}`
    : (tab === "individual" ? "Novo cadastro • Preencha os dados do animal." : "Novo cadastro • Complete o peso e a vacinação.");
  if (!profileEditingActive()) {
    for (const k of visibleProfileKeys()) $("#" + k).disabled = true;
    return;
  }
  for (const k of visibleProfileKeys()) {
    const el = $("#" + k);
    el.disabled = hasInfo(current?.[k]) && !editUnlocked;
    el.title = el.disabled
      ? "Verifique a senha em Dados e segurança para alterar."
      : "";
  }
}

async function submit(e) {
  e.preventDefault();
  const id = $("#brinco").value.trim().toUpperCase();
  if (!id || $("#brinco").dataset.verified !== id)
    return toast("Verifique o brinco antes de registrar.");
  if (registrationBlocked(find(id), editUnlocked)) return showDepartedMessage();
  const weightText = tab === "sessao" ? $("#weight").value.trim() : "",
    kg = weightText === "" ? null : Number(weightText),
    day = tab === "sessao" ? $("#day").value : today();
  if (tab === "sessao" && kg === null) return toast("Informe o peso.");
  if (kg !== null && (!Number.isFinite(kg) || kg <= 0 || !validDate(day)))
    return toast("Informe um peso válido e a data da pesagem.");
  const existing = find(id),
    values = profileEditingActive()
      ? Object.fromEntries(visibleProfileKeys().map((k) => [k, $("#" + k).value]))
      : {};
  const updates = profileEditingActive()
    ? profileUpdates(existing, values, editUnlocked)
    : {};
  if (hasInfo(updates.lot)) {
    const lot = allLots().find(item => item.id === updates.lot);
    if (!lot) return toast("Selecione um lote existente.");
    if (!editUnlocked && !lotAcceptsAnimals(lot))
      return toast("Este lote já recebeu uma saída. Selecione um lote aberto.");
  }
  if (
    hasInfo(updates.age) &&
    !validAge(updates.age)
  )
    return toast("Informe uma idade válida.");
  if (hasInfo(updates.arrival) && !validDate(updates.arrival)) return toast("Informe uma data de entrada válida.");
  const bathed = tab === "sessao" && $("#bathed").checked;
  const v = $("#vaccinated").checked
    ? {
        name: $("#vname").value.trim(),
        day: tab === "individual" ? $("#vday").value : day,
        next: $("#next").value,
      }
    : null;
  if (bathed && !validDate(day)) return toast("Informe uma data válida para o banho.");
  if (hasInfo(updates.entryPriceKg) && (!Number.isFinite(Number(updates.entryPriceKg)) || Number(updates.entryPriceKg) < 0)) return toast("Informe um preço por quilo de entrada válido.");
  if (v && (!v.name || !validDate(v.day) || (v.next && !validDate(v.next))))
    return toast("Informe a vacina e a data de aplicação.");
  if (v && v.next && v.next < v.day)
    return toast("A próxima dose deve ser posterior à aplicação.");
  if (kg === null && !v && !Object.keys(updates).length)
    return toast("Preencha pelo menos uma informação nova ou alterada.");
  const originalTab = tab;
  if (!(await confirmRecord(id, kg, day))) return;
  if (tab !== originalTab || find(id) !== existing) return;
  if (registrationBlocked(existing, editUnlocked)) return showDepartedMessage();
  const before = JSON.stringify(db);
  let a = existing;
  if (!a) {
    a = {
      id,
      age: "",
      sex: "",
      breed: "",
      arrival: "",
      origin: "",
      from: "",
      weights: [],
      vaccines: [],
    };
    db.animals.push(a);
  }
  if (profileEditingActive()) Object.assign(a, updates);
  if (kg !== null) a.weights.push({ kg, day, time: new Date().toISOString() });
  if (v) a.vaccines.push(v);
  if (bathed) (a.baths ||= []).push({day});
  if (tab === "sessao") db.session.push({ id, kg, day });
  try {
    save();
    render();
    toast("Registro salvo neste aparelho.");
    $("#brinco").focus();
  } catch {
    db = JSON.parse(before);
    toast("Não foi possível salvar. Tente novamente.");
  }
}

function confirmRecord(id, kg, day) {
  return new Promise((resolve) => {
    modal(
      `<h2>Confirmar registro</h2><p>Brinco <b>${esc(id)}</b>${kg === null ? " · Atualização cadastral" : ` · ${kg} kg<br>Data: ${date(day)}`}</p><div class="actions"><button id="confirm-save" class="primary">Confirmar registro</button><button id="cancel-save">Voltar</button></div>`,
    );
    $("#modal-close").hidden = true;
    const d = $("#modal");
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      d.removeEventListener("close", closed);
      d.close();
      resolve(value);
    };
    const closed = () => finish(false);
    d.addEventListener("close", closed);
    $("#confirm-save").onclick = () => finish(true);
    $("#cancel-save").onclick = () => finish(false);
  });
}

function visibleProfileKeys() {
  return tab === "sessao" ? PROFILE_FIELDS.filter(k => !["origin", "from", "arrival"].includes(k)) : PROFILE_FIELDS;
}

function profileFields() {
  return `<div class="fields">${profileSelect("age", "Idade estimada (Meses)", AGE_RANGES)}<div><label>Sexo</label><select id="sex"><option value="">Não informado</option><option value="F">Fêmea</option><option value="M">Macho</option></select></div>${profileSelect("breed", "Raça", BREEDS)}${tab === "individual" ? field("arrival", "Data de entrada", "date") : ""}${tab === "individual" ? `<div><label>Origem</label><select id="origin"><option value="">Não informada</option><option>Criação própria</option><option>Compra</option><option>Transferência</option></select></div>${field("from", "Pessoa / propriedade de origem")}` : ""}${field("entryPriceKg", "Preço do kg de entrada (R$)", "number")}${lotSelect()}</div>`;
}

function profileEditingActive() {
  return (
    tab === "individual" ||
    (tab === "sessao" &&
      $("#complete-profile")?.checked &&
      !$("#complete-option")?.hidden)
  );
}

function showDepartedMessage() {
  modal(`<h2>Animal com saída registrada</h2><p>${DEPARTED_MESSAGE}</p>`);
  $("#modal-close").textContent = "Voltar";
}
