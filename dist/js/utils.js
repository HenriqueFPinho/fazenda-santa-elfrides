// Funções utilitárias

const $ = (s) => document.querySelector(s);

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const date = (s) =>
  s ? new Date(s + "T12:00").toLocaleDateString("pt-BR") : "Não informada";

const sort = (a) => [...a.weights].sort((a, b) => a.day.localeCompare(b.day));

const last = (a) => sort(a).at(-1);

const cat = (a) =>
  !hasInfo(a.age)
    ? "Não informada"
    : ageMinimum(a.age) <= 12
      ? "Terneiro"
      : ageMinimum(a.age) <= 24
        ? "Novilha"
        : a.sex === "F"
          ? "Vaca"
          : "Boi";

const due = () =>
  db.animals.reduce(
    (n, a) => n + a.vaccines.filter((v) => v.next && v.next <= today()).length,
    0,
  );

function animalsWithTag(tag) {
  return db.animals.filter(a => (a.tagNumber || a.id) === tag);
}

function newAnimalId(tag) {
  let key = tag;
  let sequence = 1;
  while (find(key)) key = tag + " [" + (++sequence) + "]";
  return key;
}

function chooseAnimal(matches, select) {
  modal('<h2>Selecione a ficha do animal</h2>' + matches.map((a,i) =>
    `<p><button type="button" data-choice="${i}">${["Ficha "+a.id,a.tagColor,a.breed,a.sex==="F"?"Fêmea":a.sex==="M"?"Macho":a.sex,a.age && a.age+" meses",a.origin,a.from,a.arrival && "Entrada "+date(a.arrival),animalLots(a).map(id=>"Lote "+id).join(", ")].filter(Boolean).map(esc).join(" · ")}</button></p>`
  ).join(""));
  $("#modalbody").querySelectorAll("[data-choice]").forEach(b => b.onclick = () => {
    $("#modal").close();
    select(matches[Number(b.dataset.choice)]);
  });
}

function find(id) {
  return db.animals.find((a) => a.id === id.trim().toUpperCase());
}

const hasInfo = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

function vaccinationBadge(next) {
  if (!next) return '';
  const day = today();
  const status = next < day ? 'pending' : next === day ? 'today' : 'scheduled';
  const label = {pending: 'Pendente', today: 'Prevista para hoje', scheduled: 'Agendado'}[status];
  return `<span class="pill vaccine-status vaccine-${status}">${label}</span>`;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const money = value => hasInfo(value) ? Number(value).toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : 'Não informado';

function entryDetails(animal) {
  return `<dl class="animal-details"><div><dt>Cor do brinco</dt><dd>${esc(animal.tagColor || "Não informada")}</dd></div><div><dt>Preço do Kilo de Entrada</dt><dd>${money(animal.entryPriceKg)}</dd></div><div><dt>Preço do Kilo de Saída</dt><dd>${money(animal.exit?.priceKg)}</dd></div><div><dt>Nº do Lote</dt><dd>${esc(animalLots(animal).join(', ') || 'Não informado')}</dd></div></dl>`;
}

function bathHistory(animal) {
  const baths = [...(animal.baths || [])].sort((a,b)=>a.day.localeCompare(b.day));
  return `<section><h3>Histórico de banhos</h3>${baths.length ? baths.map(b=>`<div class="row"><span>${date(b.day)}</span><span>Gado banhado</span></div>`).join('') : '<p>Nenhum banho registrado.</p>'}</section>`;
}

const TAG_COLORS = ["Vermelho", "Azul", "Amarelo", "Laranja", "Verde", "Outro"];
const AGE_RANGES = ['0 a 12', '13 a 24', '25 a 36', '37+'];
const BREEDS = ['Angus preto', 'Angus vermelho', 'Hereford', 'Braford', 'Brangus', 'Charolês', 'Devon', 'Outros'];
function ageMinimum(value) { return Number(String(value).split(' ')[0].replace('+', '')); }
function validAge(value) {
  return AGE_RANGES.includes(String(value)) || (hasInfo(value) && Number.isFinite(Number(value)) && Number(value) >= 0);
}
function profileSelect(id, label, options) {
  return `<div><label for="${id}">${label}</label><select id="${id}"><option value="">Não informado</option>${options.map(value=>`<option>${esc(value)}</option>`).join('')}</select></div>`;
}
function fillProfileSelect(id, value) {
  const select = $('#'+id);
  select.querySelectorAll('[data-legacy]').forEach(option => option.remove());
  // Preserva valores históricos sem convertê-los silenciosamente.
  if (hasInfo(value) && ![...(select.options || [])].some(option=>option.value===String(value))) {
    select.insertAdjacentHTML('beforeend', `<option data-legacy value="${esc(value)}">${esc(value)} (registro anterior)</option>`);
  }
  select.value = value ?? '';
}
