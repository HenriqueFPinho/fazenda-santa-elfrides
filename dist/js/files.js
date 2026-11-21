// Exportação local: mantém um link real disponível para nova tentativa.
let activeDownloadUrl = null;

function download(name, content, type = "application/octet-stream") {
  try {
    const url = URL.createObjectURL(new Blob([content], { type }));
    if (activeDownloadUrl) URL.revokeObjectURL(activeDownloadUrl);
    activeDownloadUrl = url;
    modal(`<h2>Arquivo preparado</h2><p>O download foi solicitado. Confira a pasta de downloads do aparelho.</p><p>Se não iniciar, use o link abaixo:</p><p><a id="download-file" class="download-link">Baixar arquivo</a></p>`);
    const link = $("#download-file");
    link.href = url;
    link.download = name;
    link.textContent = name;
    link.click();
  } catch {
    modal('<h2>Não foi possível preparar o arquivo</h2><p>Tente novamente ou abra o site diretamente no navegador do aparelho.</p>');
  }
}

function validateAdditionalLots(animal) {
  const ids = animal?.additionalLots;
  if (ids !== undefined && (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !id.trim())))
    throw Error("Os lotes adicionais devem formar uma lista de números de lote entre aspas.");
}

function validateAnimal(animal) {
  if (!animal || typeof animal !== "object" || typeof animal.id !== "string" || !animal.id.trim()) throw Error("Brinco inválido.");
  if (animal.id !== animal.id.trim().toUpperCase()) throw Error("O brinco deve estar em maiúsculas e sem espaços nas extremidades.");
  validateAdditionalLots(animal);
  for (const key of PROFILE_FIELDS) {
    if (animal[key] != null && typeof animal[key] !== "string" && !(["age", "entryPriceKg", "lot"].includes(key) && typeof animal[key] === "number")) throw Error("Cadastro inválido.");
  }
  if (hasInfo(animal.age) && !validAge(animal.age)) throw Error("Idade inválida.");
  if (hasInfo(animal.arrival) && !validDate(animal.arrival)) throw Error("Data de entrada inválida.");
  if (hasInfo(animal.sex) && !["F", "M"].includes(animal.sex)) throw Error("Sexo inválido.");
  if (!Array.isArray(animal.weights) || animal.weights.some(r => !r || typeof r.kg !== "number" || !Number.isFinite(r.kg) || r.kg <= 0 || !validDate(r.day))) throw Error("Pesagem inválida.");
  if (!Array.isArray(animal.vaccines) || animal.vaccines.some(v => !v || typeof v.name !== "string" || !v.name.trim() || !validDate(v.day) || (v.next && (!validDate(v.next) || v.next < v.day)))) throw Error("Vacinação inválida.");
  const checkExit = exit => validateExit({detail: "", recipient: "", amount: "", ...exit});
  if (animal.exit) checkExit(animal.exit);
  if (hasInfo(animal.entryPriceKg) && (!Number.isFinite(Number(animal.entryPriceKg)) || Number(animal.entryPriceKg) < 0)) throw Error("Preço por quilo de entrada inválido.");
  if (animal.baths !== undefined && (!Array.isArray(animal.baths) || animal.baths.some(b => !b || !validDate(b.day)))) throw Error("Histórico de banhos inválido.");
  if (animal.movements !== undefined) {
    if (!Array.isArray(animal.movements)) throw Error("Histórico de retornos inválido.");
    for (const movement of animal.movements) {
      if (!movement?.exit || !movement.return) throw Error("Histórico de retornos inválido.");
      checkExit(movement.exit);
      validateReturn({exit: movement.exit}, {from: "", amount: "", transferReason: "", ...movement.return});
    }
  }
  return animal;
}

function validateBackup(data) {
  if (!data || !Array.isArray(data.animals) || !Array.isArray(data.session)) throw Error("Arquivo de backup inválido.");
  if (data.lots !== undefined) {
    if (!Array.isArray(data.lots)) throw Error("Lista de lotes inválida.");
    const lotIds = new Set();
    for (const lot of data.lots) {
      if (!lot || typeof lot.id !== "string") throw Error("Lote inválido.");
      const validated = validateLot(lot);
      if (lotIds.has(validated.id)) throw Error("O backup contém lotes duplicados.");
      lotIds.add(validated.id);
    }
  }
  const ids = new Set();
  for (const animal of data.animals) {
    validateAnimal(animal);
    if (ids.has(animal.id)) throw Error("O backup contém brincos duplicados.");
    ids.add(animal.id);
  }
  if (data.session.some(r => !r || !ids.has(r.id) || typeof r.kg !== "number" || !Number.isFinite(r.kg) || r.kg <= 0 || !validDate(r.day))) throw Error("Sessão inválida no backup.");
  if (data.lastWeighingDay && !validDate(data.lastWeighingDay)) throw Error("Data de pesagem inválida no backup.");
  if (data.sessionVaccine && ["name", "next"].some(k => typeof data.sessionVaccine[k] !== "string")) throw Error("Preferência de vacinação inválida.");
  return data;
}
