const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dist = path.join(__dirname, '../dist');

test('todos os scripts carregados existem e têm sintaxe válida', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(scripts).size, scripts.length);
  for (const script of scripts) {
    new vm.Script(fs.readFileSync(path.join(dist, script), 'utf8'), {filename: script});
  }
  const files = fs.readdirSync(path.join(dist, 'js')).filter(file => file.endsWith('.js'));
  assert.deepEqual(scripts.map(src => path.basename(src)).sort(), files.sort());
});
