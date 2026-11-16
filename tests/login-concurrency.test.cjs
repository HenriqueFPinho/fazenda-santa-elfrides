const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('resultado de login antigo não substitui tentativa mais recente', async () => {
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {value: '', focus() {}, reset() {}, open: false});
    return nodes.get(key);
  };
  const pending = [];
  const context = vm.createContext({
    $: node, db: {animals: [], session: []}, storageError: null,
    signedIn: false, currentRole: null, editUnlocked: false, LOGIN_HASH: 'correct',
    document: {querySelectorAll: () => [], body: {classList: {add() {}, remove() {}}}},
    localStorage: {setItem() {}}, hash: () => new Promise(resolve => pending.push(resolve)),
    validateBackup() {}, normalizeLotNumbers: data => data, render() {}, toast() {}
  });
  vm.runInContext(fs.readFileSync(__dirname + '/../dist/js/app.js', 'utf8'), context);
  node('#login-user').value = 'admin';
  const first = node('#login-form').onsubmit({preventDefault() {}});
  const second = node('#login-form').onsubmit({preventDefault() {}});
  pending[1]('wrong');
  await second;
  pending[0]('correct');
  await first;
  assert.equal(context.signedIn, false);
  const third = node('#login-form').onsubmit({preventDefault() {}});
  node('#logout').onclick();
  pending[2]('correct');
  await third;
  assert.equal(context.signedIn, false);
});
