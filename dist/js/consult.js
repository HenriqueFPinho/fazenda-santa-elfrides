// Consulta e administração da ficha

function lookup() {
  const a = find($("#search").value);
  if (!a) {
    $("#result").className = "empty";
    $("#result").textContent = "Animal não cadastrado.";
    return;
  }
  $("#result").className = "";
  const w = sort(a);
  const minimum = w.reduce((min, point) => Math.min(min, point.kg), Infinity);
  const maximum = w.reduce((max, point) => Math.max(max, point.kg), -Infinity);
  $("#result").innerHTML =
    `<div class="row"><h2>Brinco ${esc(a.id)}</h2><span class="pill">${esc(cat(a))}</span></div><p>${esc(a.breed || "Raça não informada")} · Idade: ${esc(hasInfo(a.age) ? a.age : "não informada")} ${hasInfo(a.age) ? "meses" : ""} · Entrada: ${date(a.arrival)}</p>${entryDetails(a)}${exitSummary(a.exit)}${movementHistory(a)}${bathHistory(a)}<div class="grid"><div><h3>Histórico de pesagens</h3>${w.length > 1 ? `<svg class="chart" viewBox="0 0 400 120" role="img" aria-label="Evolução do peso"><polyline fill="none" stroke="#6e8d4e" stroke-width="3" points="${w.map((p, i) => `${10 + (i * 380) / (w.length - 1)},${100 - ((p.kg - minimum) * 80) / (maximum - minimum || 1)}`).join(" ")}"/></svg>` : ""}${w.map((r, i) => `<div class="row"><span>${date(r.day)}</span><b>${r.kg} kg</b><span>${i ? (r.kg - w[i - 1].kg).toFixed(1) + " kg" : "Primeiro registro"}</span></div>`).join("")}<h3>Comparar duas pesagens</h3><div class="fields"><select id="c1">${w.map((r, i) => `<option value="${i}">${date(r.day)} · ${r.kg} kg</option>`).join("")}</select><select id="c2">${w.map((r, i) => `<option value="${i}" ${i === w.length - 1 ? "selected" : ""}>${date(r.day)} · ${r.kg} kg</option>`).join("")}</select></div><p id="difference"></p></div><div><h3>Vacinas e próximas doses</h3>${a.vaccines.length ? a.vaccines.map((v) => `<div class="row"><span><b>${esc(v.name)}</b><br><span class="muted">Aplicação: ${date(v.day)}<br>Próxima: ${date(v.next)}</span></span>${vaccinationBadge(v.next)}</div>`).join("") : "<p>Sem informação de vacinação.</p>"}</div></div><div class="actions">${!a.exit ? '<button id="exit">Registrar saída</button>' : ""}<button onclick="window.print()">PDF / imprimir</button><button id="csv">Exportar Excel (CSV)</button></div>${animalAdminActions()}`;
  const compare = () =>
    ($("#difference").textContent = w.length
      ? `Variação: ${(w[$("#c2").value].kg - w[$("#c1").value].kg).toFixed(1)} kg`
      : "");
  $("#c1").onchange = $("#c2").onchange = compare;
  compare();
  $("#csv").onclick = () =>
    download(
      "pesagens.csv",
      "\ufeffBrinco;Data;Peso (kg)\n" +
        w.map((r) => [a.id, r.day, r.kg].map(csv).join(";")).join("\n"),
      "text/csv",
    );
  if ($("#delete")) $("#delete").onclick = () => confirmDeleteAnimal(a);
  if ($("#exit")) $("#exit").onclick = () => openExit(a);
  if ($("#edit-exit")) $("#edit-exit").onclick = () => openExit(a);
  if ($("#remove-exit")) $("#remove-exit").onclick = () => removeExit(a);
  if ($("#edit"))
    $("#edit").onclick = async () => {
      if (!canManageAnimal()) return;
      if (!(await authorize())) return;
      modal(
        `<h2>Editar ficha e registros</h2><p>Corrija pesos, datas ou vacinas. O brinco é preservado.</p><textarea id="raw" style="width:100%;height:300px">${esc(JSON.stringify(a, null, 2))}</textarea><button id="apply">Salvar alterações</button>`,
      );
      $("#apply").onclick = () => {
        if (!canManageAnimal() || !editUnlocked) return;
        try {
          const x = validateAnimal(JSON.parse($("#raw").value));
          if (x.id !== a.id) throw Error("O brinco não pode ser alterado.");
          const previous = db;
          db = {...db, animals: db.animals.map(item => item.id === a.id ? x : item)};
          try { save(); } catch (error) { db = previous; throw error; }
          $("#modal").close();
          lookup();
        } catch {
          toast("Dados inválidos. Revise os campos.");
        }
      };
    };
}

function confirmDeleteAnimal(a) {
  if (!canManageAnimal()) return;
  modal(
    `<h2>Excluir todas as informações?</h2><p>Deseja excluir todas as informações do animal <b>${esc(a.id)}</b>?</p><p>Serão apagados o cadastro, as pesagens, as vacinas e o registro de saída. Esta ação não pode ser desfeita pelo site.</p><div class="actions"><button id="confirm-delete-animal" class="danger-button">Excluir animal</button><button id="cancel-delete-animal">Voltar</button></div>`,
  );
  $("#modal-close").hidden = true;
  $("#cancel-delete-animal").onclick = () => $("#modal").close();
  $("#confirm-delete-animal").onclick = async () => {
    if (!canManageAnimal()) return;
    if (!(await authorize())) return;
    if (!canManageAnimal() || !editUnlocked) return;
    const previous = db;
    db = withoutAnimal(db, a.id);
    try {
      save();
      $("#modal").close();
      lookup();
      toast("Animal e todos os seus registros excluídos.");
    } catch {
      db = previous;
      toast("Não foi possível excluir. Tente novamente.");
    }
  };
}

function animalAdminActions() {
  if (!canManageAnimal()) return "";
  return `<div class="animal-admin-actions" aria-label="Administração do animal"><button id="edit" class="admin-icon" title="Editar ficha" aria-label="Editar ficha"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 3-.5 2-2 1-2-.5-2 3.5 1.5 1.5v3L2.5 15l2 3.5 2-.5 2 1 .5 2h4l.5-2 2-1 2 .5 2-3.5-1.5-1.5v-3L20 9l-2-3.5-2 .5-2-1-.5-2Z"/><circle cx="11.3" cy="12" r="3"/></svg></button><button id="delete" class="admin-icon" title="Excluir animal" aria-label="Excluir animal"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div>`;
}
