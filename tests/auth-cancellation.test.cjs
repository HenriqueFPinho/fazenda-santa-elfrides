const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {value: '', focus() {}});
    return nodes.get(key);
  };
  const listeners = new Map();
  Object.assign(node('#modal'), {
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name) { listeners.delete(name); },
    close() { listeners.get('close')?.(); }
  });
  const ctx = vm.createContext({
    signedIn: true, currentRole: "operador", editUnlocked: false, SECURITY_HASH: 'correct',
    $: node, modal() {}, toast() {}, refreshProfileLocks() {}
  });
  vm.runInContext(fs.readFileSync(__dirname + '/../dist/js/auth.js', 'utf8'), ctx);
  let complete, reject;
  ctx.hash = () => new Promise((resolve, fail) => { complete = resolve; reject = fail; });
  return {ctx, node, resolve: value => complete(value), reject: () => reject(Error('Digest failed'))};
}

test('cancelar impede liberação tardia da senha', async () => {
  const s = setup();
  const authorized = s.ctx.authorize();
  const pending = s.node('#security-form').onsubmit({preventDefault() {}});
  s.node('#security-back').onclick();
  s.resolve('correct');
  await pending;
  assert.equal(await authorized, false);
  assert.equal(s.ctx.editUnlocked, false);
});

test('senha válida libera edição apenas enquanto a tela está ativa', async () => {
  const s = setup();
  const authorized = s.ctx.authorize();
  const pending = s.node('#security-form').onsubmit({preventDefault() {}});
  s.resolve('correct');
  await pending;
  assert.equal(await authorized, true);
  assert.equal(s.ctx.editUnlocked, true);
});

test('falha de verificação permite tentar novamente sem liberar edição', async () => {
  const s = setup();
  const authorized = s.ctx.authorize();
  const pending = s.node('#security-form').onsubmit({preventDefault() {}});
  s.reject();
  await pending;
  assert.equal(s.ctx.editUnlocked, false);
  assert.match(s.node('#security-error').textContent, /Não foi possível/);
  const retry = s.node('#security-form').onsubmit({preventDefault() {}});
  s.resolve('correct');
  await retry;
  assert.equal(await authorized, true);
});
