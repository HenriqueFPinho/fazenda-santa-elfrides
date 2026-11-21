// Arquivos essenciais da Fazenda Santa Elfrides para acesso sem internet.
const CACHE_PREFIX = "fazenda-santa-elfrides-offline-";
const CACHE_NAME = CACHE_PREFIX + "v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/config.js",
  "./js/utils.js",
  "./js/rules.js",
  "./js/ui.js",
  "./js/records.js",
  "./js/consult.js",
  "./js/exits.js",
  "./js/campo.js",
  "./js/auth.js",
  "./js/returns.js",
  "./js/files.js",
  "./js/lots.js",
  "./js/test-data.js",
  "./js/app.js",
  "./js/offline.js",
];

const scope = new URL(self.registration.scope);
const shellPaths = new Set(APP_SHELL.map((file) => new URL(file, scope).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // Instalação só é concluída quando TODOS os arquivos necessários estiverem salvos.
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map((file) => new URL(file, scope).href));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;

  const inScope = url.pathname.startsWith(scope.pathname);
  const isNavigation = request.mode === "navigate" && inScope;
  if (!isNavigation && !shellPaths.has(url.pathname)) return;

  event.respondWith((async () => {
    // Enquanto houver conexão, busque a versão atual e mantenha o cache atualizado.
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== "opaque") {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (error) {
          // Erro de gravação em cache não deve impedir o uso online.
          console.warn("Não foi possível atualizar o cache offline.", error);
        }
      }
      return response;
    } catch (error) {
      // Sem conexão: usa a última versão baixada; nunca altera os registros locais.
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (isNavigation) {
        const home = await cache.match(new URL("./index.html", scope).href);
        if (home) return home;
      }
      return Response.error();
    }
  })());
});
