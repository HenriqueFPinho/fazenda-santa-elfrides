// Regras de negócio

function profileUpdates(animal, values, unlocked) {
  const updates = {};
  for (const k of PROFILE_FIELDS) {
    if (!Object.hasOwn(values, k)) continue;
    const value = String(values[k] ?? "").trim();
    if (hasInfo(animal?.[k]) && !unlocked) continue;
    if (value !== String(animal?.[k] ?? "")) updates[k] = value;
  }
  return updates;
}

function validateExit(values) {
  const { reason, detail, recipient, day, amount } = values;
  if (!["Morte", "Venda", "Transferência"].includes(reason))
    throw Error("Selecione o motivo da saída.");
  if (!validDate(day)) throw Error("Informe a data.");
  if (reason !== "Venda" && !detail.trim()) throw Error("Informe o motivo.");
  if (reason !== "Morte" && !recipient.trim())
    throw Error("Informe o destinatário.");
  if (
    reason === "Venda" &&
    (amount === "" || !Number.isFinite(Number(amount)) || Number(amount) < 0)
  )
    throw Error("Informe um valor de venda válido.");
  if (reason === "Venda" && hasInfo(values.priceKg) && (!Number.isFinite(Number(values.priceKg)) || Number(values.priceKg) < 0)) throw Error("Informe um preço por quilo de saída válido.");
  return {
    ...(reason === "Venda" && hasInfo(values.priceKg) ? {priceKg: Number(values.priceKg)} : {}),
    reason,
    day,
    detail: reason === "Venda" ? "" : detail.trim(),
    ...(reason !== "Morte" ? { recipient: recipient.trim() } : {}),
    ...(reason === "Venda" ? { amount: Number(amount) } : {}),
  };
}

function registrationBlocked(animal, authorized) {
  return Boolean(animal?.exit) && !authorized;
}

function withoutAnimal(data, id) {
  return {
    ...data,
    animals: data.animals.filter((animal) => animal.id !== id),
    session: data.session.filter((record) => record.id !== id),
  };
}

function animalStatus(a) {
  if (!a.exit) return "presente";
  const reason = String(a.exit.reason || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return reason === "morte"
    ? "morto"
    : reason === "venda"
      ? "vendido"
      : reason === "transferencia"
        ? "transferido"
        : "saida";
}

function statusLabel(status) {
  return {
    presente: "Na fazenda",
    morto: "Morto",
    vendido: "Vendido",
    transferido: "Transferido",
    saida: "Saída registrada",
  }[status];
}
