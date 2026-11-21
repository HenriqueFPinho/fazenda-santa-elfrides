// Autenticação local e permissões

async function hash(s) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

async function authorize() {
  if (!signedIn) {
    toast("Entre para continuar.");
    return false;
  }
  if (!canManageAnimal()) return false;
  if (editUnlocked) return true;
  return new Promise((resolve) => {
    modal(
      `<form id="security-form"><h2>Verificar senha</h2><p>Informe a senha de segurança para liberar edição e exclusão nesta sessão.</p><label for="security-password">Senha de segurança</label><input id="security-password" type="password" autocomplete="off" required><p id="security-error" role="alert"></p><div class="actions"><button class="primary" type="submit">Verificar senha</button><button type="button" id="security-back">Voltar</button></div></form>`,
    );
    $("#modal-close").hidden = true;
    let done = false;
    const d = $("#modal");
    const finish = (value) => {
      if (done) return;
      done = true;
      d.removeEventListener("close", closed);
      d.close();
      resolve(value);
    };
    const closed = () => finish(false);
    d.addEventListener("close", closed);
    $("#security-back").onclick = () => finish(false);
    const form = $("#security-form");
    let verifying = false;
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (verifying || done) return;
      verifying = true;
      try {
        const digest = await hash($("#security-password").value);
        if (done || !signedIn || $("#security-form") !== form) return;
        if (digest === SECURITY_HASH) {
          editUnlocked = true;
          refreshProfileLocks();
          finish(true);
          toast("Edição e exclusão liberadas nesta sessão.");
        } else {
          $("#security-error").textContent = "Senha incorreta. Tente novamente.";
          $("#security-password").value = "";
          $("#security-password").focus();
        }
      } catch {
        if (!done && $("#security-form") === form)
          $("#security-error").textContent = "Não foi possível verificar a senha. Tente novamente.";
      } finally {
        verifying = false;
      }
    };
    $("#security-password").focus();
  });
}

function canManageAnimal() {
  return signedIn && ["tecnico", "operador", "admin"].includes(currentRole);
}
