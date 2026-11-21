// Componentes e navegação

function save() {
  if (!canManageAnimal()) throw Error("Perfil sem permissão de gravação.");
  persist(db);
  stats();
}

let toastTimer;
function toast(s) {
  clearTimeout(toastTimer);
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 3500);
}

function stats() {
  $("#stats").innerHTML =
    `<div class="stat"><span>ANIMAIS CADASTRADOS</span><b>${db.animals.length}</b></div><div class="stat"><span>PESAGENS REGISTRADAS</span><b>${db.animals.reduce((n, a) => n + a.weights.length, 0)}</b></div><div class="stat"><span>DOSES A VENCER / VENCIDAS</span><b>${due()}</b></div>`;
}

function modal(s) {
  $("#modal-close").textContent = "Fechar";
  $("#modal-close").hidden = false;
  $("#modalbody").innerHTML = s;
  if (!$("#modal").open) $("#modal").showModal();
}

function field(id, label, type = "text", value = "") {
  return `<div><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`;
}

function render() {
  const visual = currentRole === "visual";
  const allowed = ["consulta", "campo", "lotes"];
  if (visual && !allowed.includes(tab)) tab = "consulta";
  $("#settings").hidden = visual;
  document.querySelectorAll("[data-tab]").forEach(b => b.hidden = visual && !allowed.includes(b.dataset.tab));
  stats();
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("#title").textContent = {
    consulta: "Registros do Rebanho",
    sessao: "🐄 Pesagem em sequência",
    individual: "📋 Registro individual",
    campo: "🌾 Campo",
    lotes: "📦 Lotes",
  }[tab];
  $("#subtitle").textContent = {
    consulta: "Histórico dos animais",
    sessao: "Registre, confirme e siga para o próximo animal.",
    individual: "Cadastre uma entrada ou complete o histórico de um animal.",
    campo: "Todos os animais e seus históricos, em um só lugar.",
    lotes: "Entradas, animais e resultados de cada lote.",
  }[tab];
  if (tab === "lotes") { renderLots(); return; }
  if (tab === "campo") {
    renderCampo();
    return;
  }
  if (tab === "consulta") {
    $("#view").innerHTML =
      `<div class="card"><h2>Consultar animal</h2><div id="animal-search" role="search"><div class="fields">${field("search", "Número do brinco")}<div><label for="search-color">Cor do brinco</label><select id="search-color"><option value="">Selecione a cor</option>${TAG_COLORS.map(c=>`<option>${esc(c)}</option>`).join("")}${db.animals.some(a=>!a.tagColor)?'<option value="sem-cor">Sem cor registrada</option>':''}</select></div></div><div class="actions"><button type="button" class="primary" id="searchbtn">Buscar animal</button></div></div>${animalLotPicker()}<div id="result" class="empty"><i>◉</i>O histórico de cada animal, em um só lugar.</div></div>`;
    $("#searchbtn").onclick = () => lookup();
    $("#search").onkeydown = e => {
      if (e.key === "Enter") { e.preventDefault(); lookup(); }
    };
    $("#animal-search").oninput = () => {
      $("#pick-lot").value = "";
      $("#pick-animal").innerHTML = '<option value="">Selecione primeiro um lote</option>';
      $("#pick-animal").disabled = true;
      $("#result").textContent = "";
    };
    bindLotPicker(member => {
      $("#search").value = member ? member.tagNumber || member.id : "";
      $("#search-color").value = member ? member.tagColor || "sem-cor" : "";
      $("#result").textContent = "";
      if (member) lookup(member);
    });
    return;
  }
  $("#view").innerHTML =
    `<div class="grid ${tab === "individual" ? "individual-grid" : ""}"><form class="card" id="entry"><div class="row"><h2>${tab === "sessao" ? "Próximo animal" : "Dados do registro"}</h2>${tab === "individual" && currentRole === "tecnico" ? '<button type="button" id="merge-animals">Vincular cadastros</button>' : ""}</div>${field("brinco", "Brinco do animal")}<label for="tag-color">Cor do brinco</label><select id="tag-color"><option value="">Selecione a cor</option>${TAG_COLORS.map(c => `<option>${c}</option>`).join("")}</select><label><input type="checkbox" id="new-animal">Novo cadastro</label><button type="button" id="verify" style="margin-top:12px">Verificar brinco</button><p>Informe o brinco e clique em "Verificar brinco".</p>${animalLotPicker()}${tab === "sessao" ? `<div class="fields">${field("weight", "Peso (kg)", "number")}${field("day", "Data", "date", db.lastWeighingDay || today())}</div>` : ""}${tab === "sessao" ? '<label id="complete-option" hidden><input type="checkbox" id="complete-profile">Completar cadastro</label>' : ""}<div id="profile-fields" ${tab === "sessao" ? "hidden" : ""}>${profileFields()}</div><label><input type="checkbox" id="vaccinated">${tab === "sessao" ? "Vacinado nesta pesagem" : "Adicionar vacinação"}</label><div id="vfields" hidden>${tab === "sessao" ? '<label><input type="checkbox" id="repeat-vaccine">Aplicar na próxima pesagem</label>' : ""}${field("vname", "Nome da vacina")}<div class="fields">${tab === "individual" ? field("vday", "Data que foi realizada", "date", today()) : ""}${field("next", "Próxima dose (opcional)", "date")}</div></div>${tab === "sessao" ? '<label><input type="checkbox" id="bathed">Gado banhado</label>' : ""}<div class="actions"><button class="primary" id="save-entry" type="button">Registrar</button></div></form>${tab === "sessao" ? '<div class="card"><h2>Nesta sessão</h2><div id="sessionrows"></div></div>' : ""}</div>`;
  if (tab === "individual" && currentRole === "tecnico") $("#merge-animals").onclick = openAnimalMerge;
  $("#profile-legend").onclick = showProfileLegend;
  $("#entryPriceKg").min = "0";
  $("#entryPriceKg").step = ".01";
  if (tab === "sessao") {
    $("#weight").min = ".01";
    $("#weight").step = ".01";
    $("#weight").required = true;
    $("#day").required = true;
    $("#day").onchange = () => {
      if ($("#day").value) {
        const previous = db.lastWeighingDay;
        db.lastWeighingDay = $("#day").value;
        try { save(); } catch { db.lastWeighingDay = previous; toast("Não foi possível salvar a data."); }
      }
    };
  }
  $("#brinco").required = true;
  $("#vaccinated").onchange = () => {
    const checked = $("#vaccinated").checked;
    $("#vfields").hidden = !checked;
    $("#vfields").querySelectorAll("input").forEach(input => input.disabled = !checked);
    $("#vname").required = checked;
    if (tab === "individual") $("#vday").required = checked;
    if (tab === "sessao" && checked && db.sessionVaccine) {
      $("#vname").value = db.sessionVaccine.name;
      $("#next").value = db.sessionVaccine.next;
      $("#repeat-vaccine").checked = true;
    }
  };
  if (tab === "sessao") {
    $("#repeat-vaccine").checked = Boolean(db.sessionVaccine);
    const rememberVaccine = () => {
      const previous = db.sessionVaccine;
      if ($("#repeat-vaccine").checked) {
        db.sessionVaccine = {
          name: $("#vname").value,
          next: $("#next").value,
        };
      } else {
        delete db.sessionVaccine;
      }
      try { save(); } catch { db.sessionVaccine = previous; toast("Não foi possível salvar a preferência da vacina."); }
    };
    $("#repeat-vaccine").onchange = rememberVaccine;
    for (const id of ["vname", "next"]) {
      $("#" + id).oninput = () => {
        if ($("#repeat-vaccine").checked) rememberVaccine();
      };
    }
  }
  const controls = [
    ...$("#entry").querySelectorAll("input,select,#save-entry"),
  ].filter((el) => !["brinco","tag-color","new-animal","pick-lot","pick-animal"].includes(el.id));
  const lock = () => {
    if ($("#brinco").dataset.verified) {
      if (tab === "sessao") { $("#weight").value = ""; $("#bathed").checked = false; }
      $("#vaccinated").checked = false;
      $("#vfields").hidden = true;
      $("#vname").required = false;
      $("#vname").value = "";
      $("#next").value = "";
      if (tab === "individual") { $("#vday").required = false; $("#vday").value = today(); }
    }
    if (tab === "sessao") {
      $("#complete-option").hidden = true;
      $("#complete-profile").checked = false;
      $("#profile-fields").hidden = true;
    }
    controls.forEach((el) => (el.disabled = true));
    delete $("#brinco").dataset.recordId;
    delete $("#brinco").dataset.verified;
  };
  lock();
  $("#tag-color").onchange = lock;
  $("#new-animal").onchange = lock;
  $("#brinco").oninput = () => {
    lock();
    $("#pick-lot").value = "";
    $("#pick-animal").innerHTML = '<option value="">Selecione primeiro um lote</option>';
    $("#pick-animal").disabled = true;
  };
  bindLotPicker(member => {
    lock();
    $("#brinco").value = member ? member.tagNumber || member.id : "";
    $("#tag-color").value = member?.tagColor || "";
    $("#new-animal").checked = false;
    if (member) verifyTag(member);
  });
  $("#verify").onclick = () => verifyTag();
  function verifyTag(selected) {
    const id = $("#brinco").value.trim().toUpperCase();
    if (!id) {
      toast("⚠️ Informe o brinco do animal.");
      $("#brinco").focus();
      return;
    }
    $("#brinco").value = id;
    const color = $("#tag-color").value;
    const candidates = animalsWithTag(id).filter(a => !a.tagColor || a.tagColor === color);
    const creating = $("#new-animal").checked;
    if (!creating && color && !selected && candidates.length > 1)
      return chooseAnimal(candidates, verifyTag);
    const a = creating ? undefined : selected || candidates[0];
    const problem = tagProblem(a);
    if (problem) {
      lock();
      toast(`⚠️ ${problem}`);
      ($("#tag-color").value ? $("#brinco") : $("#tag-color")).focus();
      return;
    }
    $("#brinco").dataset.recordId = a?.id || "";
    $("#brinco").dataset.color = $("#tag-color").value;
    $("#brinco").dataset.verified = id;
    for (const k of visibleProfileKeys()) {
      if (["age","breed"].includes(k)) fillProfileSelect(k, a?.[k]);
      else $("#" + k).value = a?.[k] ?? "";
    }
    if (tab === "sessao") {
      $("#complete-option").hidden = !visibleProfileKeys().some(k => !hasInfo(a?.[k]));
      $("#complete-profile").checked = false;
      $("#profile-fields").hidden = true;
      if (!a && candidates.length) $("#complete-profile").disabled = true;
      if (!a) { $("#complete-profile").checked = true; $("#profile-fields").hidden = false; }
      $("#complete-profile").onchange = () => {
        $("#profile-fields").hidden = !$("#complete-profile").checked;
        refreshProfileLocks();
      };
    }
    refreshProfileLocks();
    if (tab === "individual" && canReturnAnimal(a)) {
      offerAnimalReturn(a, verifyTag);
      return;
    }
    if (registrationBlocked(a, editUnlocked)) {
      showDepartedMessage();
      return;
    }
    (tab === "sessao" ? $("#weight") : $("#age")).focus();
  };
  $("#brinco").onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#verify").click();
    }
  };
  $("#entry").onsubmit = submit;
  $("#save-entry").onclick = e => { if ($("#entry").reportValidity()) submit(e); };
  sessionRows();
}

function bindLotPicker(onSelect) {
  $("#pick-lot").onchange = () => {
    onSelect(null);
    const members = allLots().find(lot=>lot.id === $("#pick-lot").value)?.animals || [];
    $("#pick-animal").innerHTML = '<option value="">' + (members.length ? 'Selecione um animal' : 'Nenhum animal neste lote') + '</option>' +
      members.map(animal=>`<option value="${esc(animal.id)}">${esc(animal.id)} · ${statusLabel(animalStatus(animal))}</option>`).join('');
    $("#pick-animal").disabled = !members.length;
  };
  $("#pick-animal").onchange = () => {
    const id = $("#pick-animal").value;
    const member = allLots().find(lot=>lot.id === $("#pick-lot").value)?.animals.find(animal=>animal.id === id);
    onSelect(member);
  };
}
