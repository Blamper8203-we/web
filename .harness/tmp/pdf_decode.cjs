const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

function inspect(objId) {
  const re = new RegExp(objId + '\\s+\\d+\\s+obj[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream', 'g');
  const m = re.exec(text);
  if (!m) { console.log('obj ' + objId + ': not found'); return; }
  const stream = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('utf-8');
  console.log('=== obj ' + objId + ' (raw ' + m[1].length + ', decoded ' + stream.length + ') ===');
  console.log('Has /I1 Do:', stream.includes('/I1 Do'));
  console.log('Has "Do":', stream.includes(' Do'));
  const xrefs = stream.match(/\/(\w+)\s+Do/g) || [];
  console.log('XObject Do:', xrefs.join(','));
  console.log('First 300 chars:', stream.slice(0, 300));
}
inspect(19);
inspect(22);
inspect(25);
inspect(31);
inspect(35);
inspect(39);