const fs = require('fs');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

function dumpContent(objId) {
  const re = new RegExp(objId + '\\s+\\d+\\s+obj[\\s\\S]*?stream\\s*([\\s\\S]*?)endstream', 'g');
  const m = re.exec(text);
  if (!m) { console.log('--- obj ' + objId + ': not found'); return; }
  const stream = m[1];
  const xobjs = stream.match(/\/(\w+)\s+Do/g) || [];
  console.log('--- obj ' + objId + ' (length ' + stream.length + ') ---');
  console.log('  XObject Do:', xobjs.join(','));
  // Show first 300 chars
  console.log('  Start:', stream.slice(0, 300).replace(/\s+/g, ' '));
}
for (const id of [6, 16, 19, 22, 25, 28, 31, 35, 39]) dumpContent(id);