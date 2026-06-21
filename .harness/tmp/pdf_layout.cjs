const fs = require('fs');
const zlib = require('zlib');

const path = process.argv[2];
const buf = fs.readFileSync(path);
const text = buf.toString('binary');

// Find all Page objects (orientation)
let idx = 0;
let pageIdx = 0;
while ((idx = text.indexOf('/Type /Page\n', idx)) !== -1) {
  pageIdx++;
  const start = Math.max(0, idx - 100);
  const end = Math.min(text.length, idx + 400);
  console.log('--- Page ' + pageIdx + ' ---');
  console.log(text.slice(start, end).replace(/\s+/g, ' '));
  console.log();
  idx++;
  if (pageIdx > 12) break;
}

// Also check image refs (which pages have XObject refs)
console.log('\n=== Pages with image refs ===');
const pageRe = /(\d+)\s+\d+\s+obj\s*<<\s*\/Type\s*\/Page\b[\s\S]*?\/Contents\s+(\d+)\s+\d+\s+R[\s\S]*?\/Resources\s+(\d+)\s+\d+\s+R[\s\S]*?>>\s*endobj/g;
let m;
while ((m = pageRe.exec(text)) !== null) {
  const pageId = m[1];
  const resId = m[3];
  // Find resource obj
  const resRe = new RegExp(resId + '\\s+\\d+\\s+obj[\\s\\S]*?endobj', 'g');
  const rm = resRe.exec(text);
  if (rm) {
    const hasXObj = /\/XObject\b/.test(rm[0]);
    console.log('Page obj', pageId, 'has /XObject:', hasXObj);
    if (hasXObj) {
      const xref = rm[0].match(/\/I\d+\s+\d+\s+\d+\s+R/g);
      console.log('  XRefs:', xref);
    }
  }
}