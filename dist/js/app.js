// Inicialização e eventos globais
let loginAttempt = 0;

$("#settings").onclick = () => {
  if (!canManageAnimal()) return;
  modal(
    '<h2>Dados e segurança</h2><p>No momento, não há sincronização entre aparelhos ou backup, todos os dados ficam salvos neste navegador deste aparelho.</p><p>Por tanto, é possível baixar uma cópia dos arquivos registrados. Assim como, também é possível anexar o arquivo para visualiza-los no site.</p><p>Caso necessite realizar edição ou exclusão de dados, verifique a senha de proteção para liberar a ferramenta de edição e exclusão.</p><div class="actions"><button id="backup">Baixar cópia de segurança</button><button id="pin">Verificar senha</button></div><label>Restaurar cópia de segurança (substitui dados locais)</label><input type="file" id="restore" accept=".json,application/json"><p>Guarde a cópia em um local seguro. Limpar os dados do navegador pode apagar os registros.</p><h3>Dados fictícios para teste</h3><p>Substitui todos os animais e lotes atuais por exemplos variados.</p><button id="test-data">Substituir por exemplos fictícios</button>',
  );
  $("#test-data").onclick = () => replaceWithTestData();
  $("#backup").onclick = () =>
    download(
      "campo-backup-" + today() + ".json",
      JSON.stringify(db, null, 2),
      "application/json",
    );
  $("#pin").onclick = async () => {
    if (editUnlocked)
      toast("Edição e exclusão já estão liberadas nesta sessão.");
    else await authorize();
  };
  if (currentRole === "tecnico") {
    $("#pin").closest(".actions").previousElementSibling.remove();
    $("#pin").remove();
  }
  $("#restore").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported?.animals)) throw Error("Arquivo de backup inválido.");
      imported.animals.forEach(validateAdditionalLots);
      const x = normalizeLotNumbers(imported);
      validateBackup(x);
      if (
        (await authorize()) &&
        confirm("Substituir os registros locais por esta cópia?")
      ) {
        const previous = db;
        db = x;
        try { save(); } catch (error) { db = previous; throw error; }
        $("#modal").close();
        render();
      }
    } catch (error) {
      toast(error.message || "Não foi possível restaurar o backup.");
    }
  };
};

document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      render();
    }),
);

async function enterFarm(e) {
  e.preventDefault();
  const attempt = ++loginAttempt;
  if (storageError) {
    $("#login-error").textContent = "Não foi possível ler os dados locais. Os registros originais foram preservados. Baixe uma cópia para recuperação antes de limpar os dados do navegador.";
    if (storedData) download("campo-recuperacao.json", storedData, "application/json");
    return;
  }
  const user = $("#login-user").value.trim().toLowerCase();
  let digest;
  try {
    digest = await hash($("#login-password").value);
  } catch {
    if (attempt === loginAttempt)
      $("#login-error").textContent = "Não foi possível verificar o login. Tente novamente.";
    return;
  }
  if (attempt !== loginAttempt) return;
  if (Object.hasOwn(LOGIN_HASHES, user) && digest === LOGIN_HASHES[user]) {
    signedIn = true;
    currentRole = user;
    editUnlocked = user === "tecnico";
    document.body.classList.add("signed-in");
    $("#login-password").value = "";
    $("#login-error").textContent = "";
    try {
      const normalized = normalizeLotNumbers(db);
      if (canManageAnimal()) persist(normalized);
      db = normalized;
    } catch (error) { toast(error.message || "Não foi possível atualizar os números dos lotes."); }
    tab = "consulta";
    render();
  } else {
    $("#login-error").textContent = "Login ou senha incorretos.";
    $("#login-password").value = "";
    $("#login-password").focus();
  }
};

$("#login-form").onsubmit = enterFarm;
$("#login-enter").onclick = enterFarm;
$("#login-form").onkeydown = e => {
  if (e.key === "Enter" && !e.isComposing) enterFarm(e);
};
$("#login-enter").disabled = false;

$("#logout").onclick = () => {
  loginAttempt++;
  signedIn = false;
  currentRole = null;
  editUnlocked = false;
  if ($("#modal").open) $("#modal").close();
  document.body.classList.remove("signed-in");
  $("#login-form").reset();
  $("#login-error").textContent = "";
  $("#login-user").focus();
};

$("#login-error").textContent = "";
try { validateBackup(db); } catch (error) { storageError = error; }
if (storageError) {
  $("#login-error").textContent = "Os dados locais não puderam ser lidos. Entre para obter uma cópia de recuperação.";
} else render();
