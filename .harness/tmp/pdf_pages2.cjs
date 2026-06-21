const fs = require('fs');
const buf = fs.readFileSync('C:/Users/blamp/Downloads/dokumentacja_zlecenie (25).pdf');
const text = buf.toString('binary');
console.log('Text length:', text.length);

// Try simpler: find /Type /Page occurrences
let idx = 0;
let count = 0;
while ((idx = text.indexOf('/Type /Page\n', idx)) !== -1) {
  count++;
  console.log('Page ref at', idx);
  // Get context: 200 chars before, 300 after
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 300);
  console.log(text.slice(start, end).replace(/\s+/g, ' '));
  console.log('---');
  idx++;
  if (count > 12) break;
}
console.log('Total /Type /Page:', count);