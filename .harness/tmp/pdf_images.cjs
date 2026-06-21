const fs = require('fs');
const zlib = require('zlib');

function analyzeImages(path) {
  const buf = fs.readFileSync(path);
  const text = buf.toString('binary');
  console.log('=== ' + path + ' ===');

  // Find all XObject Image objects with their dimensions
  const re = /(\d+)\s+\d+\s+obj\s*<<\s*\/Type\s*\/XObject\s*\/Subtype\s*\/Image[\s\S]*?\/Width\s+(\d+)[\s\S]*?\/Height\s+(\d+)[\s\S]*?\/Length\s+(\d+)[\s\S]*?>>\s*stream\s*\n/g;
  let m;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    idx++;
    console.log('Image #' + idx + ': obj' + m[1] + ', ' + m[2] + 'x' + m[3] + ', length=' + m[4]);
  }
  console.log('Total images:', idx);
  console.log();
}

analyzeImages(process.argv[2]);
analyzeImages(process.argv[3]);