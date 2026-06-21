const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

function inspect(objId) {
  const re = new RegExp(objId + '\\s+\\d+\\s+obj[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream', 'g');
  const m = re.exec(text);
  if (!m) return;
  const stream = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('binary');
  console.log('=== obj ' + objId + ' (raw ' + m[1].length + ', decoded ' + stream.length + ') ===');
  const inlineImg = stream.match(/BI[\s\S]*?EI/g) || [];
  console.log('Inline images (BI/EI):', inlineImg.length);
  // count typical vector ops
  const lineCount = (stream.match(/\bl\b/g) || []).length;
  const rectCount = (stream.match(/\bre\b/g) || []).length;
  const curvCount = (stream.match(/\bc\b/g) || []).length;
  const txtCount = (stream.match(/\bTj\b/g) || []).length;
  console.log('Lines (l):', lineCount, 'Rects (re):', rectCount, 'Curves (c):', curvCount, 'Text (Tj):', txtCount);
  // Last 200 chars
  console.log('Last 200:', stream.slice(-200));
}
inspect(19);
inspect(22);
inspect(25);
inspect(31);
inspect(35);
inspect(39);