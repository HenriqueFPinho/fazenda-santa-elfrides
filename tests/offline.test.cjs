const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dist = path.join(__dirname, "../dist");
const read = (file) => fs.readFileSync(path.join(dist, file), "utf8");
const origin = "https://example.test/fazenda-santa-elfrides/";

test("manifesto PWA, ícones PNG e registro do service worker", () => {
  const html = read("index.html");
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /id="offline-status"/);
  assert.match(html, /src="js\/offline\.js"/);

  for (const size of [192, 512]) {
    const icon = fs.readFileSync(path.join(dist, "icons", `icon-${size}.png`));
    assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(icon.readUInt32BE(16), size);
    assert.equal(icon.readUInt32BE(20), size);
    assert.ok(manifest.icons.some(entry => entry.src === `icons/icon-${size}.png` && entry.type === "image/png"));
  }
});

test("precaching completo, abertura offline, atualização online e isolamento de outros sites", async () => {
  const callbacks = {};
  const stores = new Map([
    ["outro-aplicativo", new Map()],
    ["fazenda-santa-elfrides-offline-antigo", new Map()],
  ]);
  const installedFiles = [];
  let online = true;
  let claimed = false;
  let skipped = false;

  const key = (request) => typeof request === "string" ? request : request.url;
  const response = (body) => ({body, ok:true, type:"basic", clone(){return response(body);}});
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(files) {
          for (const url of files) {
            assert.ok(url.startsWith(origin), `Arquivo fora do escopo: ${url}`);
            const relative = new URL(url).pathname.slice(new URL(origin).pathname.length);
            const filename = relative === "" ? "index.html" : relative;
            assert.ok(fs.existsSync(path.join(dist, filename)), `Faltou ${filename}`);
            store.set(url, response("cache:" + relative));
            installedFiles.push(relative);
          }
        },
        async put(request, result) {store.set(key(request), result);},
        async match(request) {return store.get(key(request));},
      };
    },
    async keys() {return [...stores.keys()];},
    async delete(name) {return stores.delete(name);},
  };
  const context = vm.createContext({
    URL, caches, console,
    Response:{error(){return response("erro-offline");}},
    async fetch(request) {
      if (!online) throw new Error("sem internet");
      return response("online:" + new URL(key(request)).pathname);
    },
    self: {
      registration: {scope: origin},
      addEventListener(name, callback) {callbacks[name] = callback;},
      async skipWaiting() {skipped = true;},
      clients: {async claim() {claimed = true;}},
    },
  });
  new vm.Script(read("sw.js"), {filename:"sw.js"}).runInContext(context);

  let pending;
  callbacks.install({waitUntil(promise){pending = promise;}});
  await pending;
  assert.equal(skipped, true);
  const html = read("index.html");
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  for (const file of ["", "index.html", "style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", ...scripts]) {
    assert.ok(installedFiles.includes(file), `O cache não inclui: ${file}`);
  }

  callbacks.activate({waitUntil(promise){pending = promise;}});
  await pending;
  assert.equal(claimed, true);
  assert.ok(stores.has("outro-aplicativo"));
  assert.ok(!stores.has("fazenda-santa-elfrides-offline-antigo"));

  async function request(url, mode = "same-origin", method = "GET") {
    let result = null;
    callbacks.fetch({request:{url,mode,method},respondWith(promise){result = promise;}});
    return result && await result;
  }
  online = false;
  const homepage = await request(origin, "navigate");
  assert.equal(homepage.body, "cache:");
  const script = await request(origin + "js/app.js");
  assert.equal(script.body, "cache:js/app.js");

  // Nova versão online deve substituir a antiga, sem exigir que se apaguem os dados do navegador.
  online = true;
  const updated = await request(origin + "js/app.js");
  assert.equal(updated.body, "online:/fazenda-santa-elfrides/js/app.js");
  online = false;
  const fallback = await request(origin + "js/app.js");
  assert.equal(fallback.body, updated.body);

  assert.equal(await request("https://outro-site.test/arquivo.js"), null);
  assert.equal(await request(origin + "envio", "same-origin", "POST"), null);
  assert.equal(await request(origin + "backup.json"), null);
});
