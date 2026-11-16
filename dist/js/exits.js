// Registro e exclusão de saídas

function exitSummary(x) {
  if (!x) return "";
  return `<div class="hint exit-summary"><div class="exit-details"><b>Saída: ${esc(x.reason)}</b><br>Data: ${date(x.day)}${x.detail ? `<br>Motivo: ${esc(x.detail)}` : ""}${x.recipient ? `<br>Destinatário: ${esc(x.recipient)}` : ""}${x.amount !== undefined ? `<br>Valor: ${Number(x.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}</div><div class="exit-tools"><button type="button" class="icon-button" id="edit-exit" aria-label="Editar saída" title="Editar saída"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 3-.5 2-2 1-2-.5-2 3.5 1.5 1.5v3L2.5 15l2 3.5 2-.5 2 1 .5 2h4l.5-2 2-1 2 .5 2-3.5-1.5-1.5v-3L20 9l-2-3.5-2 .5-2-1-.5-2Z"/><circle cx="11.3" cy="12" r="3"/></svg></button><button type="button" class="icon-button danger-icon" id="remove-exit" aria-label="Excluir saída" title="Excluir saída"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div></div>`;
}

async function openExit(a, draft = a.exit || {}) {
  if (a.exit && !editUnlocked && !(await authorize())) return;
  modal(
    `<form id="exit-form"><h2>Registrar saída</h2><p>Brinco ${esc(a.id)}</p><label for="exit-reason">Tipo de saída</label><select id="exit-reason" required><option value="">Selecione</option>${["Morte", "Venda", "Transferência"].map((r) => `<option ${draft.reason === r ? "selected" : ""}>${r}</option>`).join("")}</select><div id="exit-fields"></div><p id="exit-error" role="alert"></p><div class="actions"><button class="primary" type="submit">Salvar saída</button><button id="exit-back" type="button">Voltar</button></div></form>`,
  );
  $("#modal-close").hidden = true;
  const update = () => {
    const reason = $("#exit-reason").value;
    $("#exit-fields").innerHTML = !reason
      ? ""
      : reason === "Morte"
        ? `${field("exit-detail", "Motivo da morte", "text", draft.detail || "")}${field("exit-day", "Data da morte", "date", draft.day || today())}`
        : reason === "Venda"
          ? `${field("exit-amount", "Valor da venda (R$)", "number", draft.amount ?? "")}${field("exit-price-kg", "Preço do Kilo de Saída (R$/kg)", "number", draft.priceKg ?? "")}${field("exit-recipient", "Para quem foi vendido", "text", draft.recipient || "")}${field("exit-day", "Data da entrega do animal", "date", draft.day || today())}`
          : `${field("exit-detail", "Motivo da transferência", "text", draft.detail || "")}${field("exit-recipient", "Pessoa / propriedade de destino", "text", draft.recipient || "")}${field("exit-day", "Data da transferência", "date", draft.day || today())}`;
    $("#exit-fields")
      .querySelectorAll("input")
      .forEach((el) => (el.required = true));
    if ($("#exit-price-kg")) { $("#exit-price-kg").required = false; $("#exit-price-kg").min = "0"; $("#exit-price-kg").step = ".01"; }
    if ($("#exit-amount")) {
      $("#exit-amount").min = "0";
      $("#exit-amount").step = ".01";
    }
  };
  $("#exit-reason").onchange = update;
  update();
  $("#exit-back").onclick = () => $("#modal").close();
  $("#exit-form").onsubmit = async (e) => {
    e.preventDefault();
    let value;
    try {
      value = validateExit({
        reason: $("#exit-reason").value,
        detail: $("#exit-detail")?.value || "",
        recipient: $("#exit-recipient")?.value || "",
        amount: $("#exit-amount")?.value ?? "",
        priceKg: $("#exit-price-kg")?.value ?? "",
        day: $("#exit-day")?.value || "",
      });
    } catch (error) {
      $("#exit-error").textContent = error.message;
      return;
    }
    if (a.exit && !editUnlocked) {
      const allowed = await authorize();
      if (!allowed) {
        openExit(a, value);
        return;
      }
    }
    const old = a.exit;
    a.exit = value;
    try {
      save();
      $("#modal").close();
      lookup();
      toast("Saída registrada.");
    } catch {
      a.exit = old;
      openExit(a, value);
      $("#exit-error").textContent =
        "Não foi possível salvar. Tente novamente.";
    }
  };
}

async function removeExit(a) {
  if (!(await authorize())) return;
  modal(
    `<h2>Excluir registro de saída?</h2><p>O animal ${esc(a.id)} voltará a permitir novos registros. O histórico de pesagens e vacinas será mantido.</p><div class="actions"><button id="confirm-remove-exit" class="primary">Excluir saída</button><button id="cancel-remove-exit">Voltar</button></div>`,
  );
  $("#modal-close").hidden = true;
  $("#cancel-remove-exit").onclick = () => $("#modal").close();
  $("#confirm-remove-exit").onclick = () => {
    if (!editUnlocked) return;
    const previous = a.exit;
    delete a.exit;
    try {
      save();
      $("#modal").close();
      lookup();
      toast("Registro de saída excluído.");
    } catch {
      a.exit = previous;
      toast("Não foi possível excluir a saída. Tente novamente.");
    }
  };
}
