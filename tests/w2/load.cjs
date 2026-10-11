const vm = require('vm'), fs = require('fs');
globalThis.window = globalThis;
const keep = globalThis.module; try { delete globalThis.module; } catch (e) {}
for (const f of ['core.js', 'town.js', 'meta.js']) vm.runInThisContext(fs.readFileSync(require('path').join(__dirname, '..', '..', f), 'utf8'), { filename: f });
if (keep) globalThis.module = keep;
module.exports = globalThis.GH;
