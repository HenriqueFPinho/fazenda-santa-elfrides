// Configuração e estado local

let storageError = null;
let storedData = null;
let db = {animals: [], session: []};
try {
  storedData = localStorage.getItem("campo-v1");
  if (storedData) db = JSON.parse(storedData);
  if (!db || !Array.isArray(db.animals) || !Array.isArray(db.session)) throw Error("Formato inválido.");
} catch (error) {
  storageError = error;
  db = {animals: [], session: []};
}

function persist(data) {
  localStorage.setItem("campo-v1", JSON.stringify(data));
}

let tab = "consulta";

const PROFILE_FIELDS = ["age", "sex", "breed", "arrival", "origin", "from", "entryPriceKg", "lot"];

let signedIn = false;

let editUnlocked = false;

let currentRole = null;

const SECURITY_HASH =
  "688e86ef1bc1bf27cac386b180b23cf3c8bb3d50b634c69a5d38bb8283438772";

const LOGIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

const LOGIN_HASHES = {admin: LOGIN_HASH, 'tecnico': 'dcdc240c9e0c71a200eec8cc118ae8dbd640ae3f79b8d41515d96462bc09bcc7', 'operador': 'b278d52bfa3225e70001ea4bd9a9070f933b42a5f8153c17890320372210d4aa', 'visual': '4b9a7f50c0bb198c6f5414c5a8459f5d216d34ab521ea94c060ea35cac66f900'};

const DEPARTED_MESSAGE =
  "O animal verificado não pode mais ter informações alteradas, pois não está presente no campo. Caso necessário, entre em contato com a equipe responsável pelo sistema.";
