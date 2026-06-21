const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

function dumpContentDecompressed(objId) {
  const re = new RegExp(objId + '\\s+\\d+\\s+obj[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream', 'g');
  const m = re.exec(text);
  if (!m) { console.log('--- obj ' + objId + ': not found'); return; }
  const rawStream = Buffer.from(m[1], 'binary');
  let stream;
  try {
    stream = zlib.inflateSync(rawStream).toString('utf-8');
  } catch (e) {
    stream = 'INFLATE FAILED: ' + e.message;
  }
  console.log('--- obj ' + objId + ' (raw len ' + rawStream.length + ') ---');
  // Show first 1500 chars of decoded stream
  console.log(stream.slice(0, 1500));
  console.log('...');
}
for (const id of [6, 16, 19, 22, 25, 28, 31, 35, 39]) dumpContentDecompressed(id);