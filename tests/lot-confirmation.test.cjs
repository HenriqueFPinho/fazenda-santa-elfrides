const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map();
const get = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    value: '', hidden: false, textContent: '',
    focus() {}, querySelectorAll() { return [checkbox]; }
  });
  return elements.get(selector);
};
const checkbox = {dataset: {candidate: '0'}, checked: true};
let writes = 0;
const context = vm.createContext({
  db: {lots: [{id: '001'}], animals: [{id: 'A', lot: ''}]},
  signedIn: true, $: get,
  hasInfo: v => v !== '' && v != null,
  today: () => '2026-11-16', esc: String,
  save: () => writes++, updateLots() {}, toast() {}
});
vm.runInContext(fs.readFileSync('dist/js/lots.js', 'utf8'), context);
vm.runInContext('viewLot = () => {}; updateLots = () => {}; bindLotAnimalSelection("001");', context);
checkbox.onchange();
get('#add-lot-animals').onclick();
assert.equal(writes, 0);
assert.equal(context.db.animals[0].lot, '');
assert.equal(get('#lot-confirmation').hidden, false);
get('#cancel-lot-animals').onclick();
assert.equal(writes, 0);
assert.equal(get('#lot-selection').hidden, false);
get('#add-lot-animals').onclick();
get('#confirm-lot-animals').onclick();
assert.equal(writes, 1);
assert.equal(context.db.animals[0].lot, '001');
console.log('Confirmação e cancelamento de vínculos validados.');
