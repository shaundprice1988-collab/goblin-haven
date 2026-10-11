// loads core/town/meta into a fresh global for logic tests
const fs = require('fs'), vm = require('vm');
delete globalThis.module;
const dir = process.argv[2] || require('path').join(__dirname, '..', '..');
for (const f of ['core.js', 'town.js', 'meta.js']) vm.runInThisContext(fs.readFileSync(dir + '/' + f, 'utf8'), { filename: f });
module.exports = globalThis.GH;
