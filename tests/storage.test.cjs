const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../dist/js/config.js', 'utf8');
for (const raw of ['{broken', 'null', '{"animals":{}}']) {
  let writes = 0;
  const context = vm.createContext({localStorage: {getItem: () => raw, setItem: () => writes++}});
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('Boolean(storageError)', context), true);
  assert.equal(vm.runInContext('storedData', context), raw);
  assert.equal(writes, 0);
}
console.log('PASS dados corrompidos preservados sem sobrescrita.');
