const fs = require('fs');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

function showObj(id) {
  const re = new RegExp('(?:^|\\n)' + id + '\\s+\\d+\\s+obj[\\s\\S]*?endobj', 'g');
  const m = re.exec(text);
  if (!m) { console.log('obj', id, 'not found'); return; }
  console.log('=== obj', id, '===');
  console.log(m[0].slice(0, 700));
  console.log();
}
showObj(34);
showObj(35);
showObj(39);