// Registro independente do PWA: não toca nos cadastros nem no localStorage.
(() => {
  const indicator = document.getElementById("offline-status");
  let offlineReady = false;

  function refreshStatus() {
    if (!indicator) return;
    if (offlineReady) {
      indicator.textContent = navigator.onLine === false
        ? "● Sem conexão · dados neste aparelho"
        : "● Pronto para uso offline";
    } else {
      indicator.textContent = "● Dados neste aparelho";
    }
  }

  window.addEventListener("online", refreshStatus);
  window.addEventListener("offline", refreshStatus);
  refreshStatus();

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await navigator.serviceWorker.ready;
      offlineReady = true;
      refreshStatus();
    } catch (error) {
      console.warn("Modo offline indisponível neste navegador.", error);
    }
  });
})();
