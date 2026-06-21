const fs = require('fs');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');

const re = /(\d+)\s+\d+\s+obj\s*<<\s*\/Type\s*\/Page\b[\s\S]*?\/Contents\s+(\d+)\s+\d+\s+R\s*>>\s*endobj/g;
let m;
while ((m = re.exec(text)) !== null) {
  console.log('Page obj', m[1], '-> Contents obj', m[2]);
  console.log('  Snippet:', m[0].slice(0, 250).replace(/\s+/g, ' '));
}