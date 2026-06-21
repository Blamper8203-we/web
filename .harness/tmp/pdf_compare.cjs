const fs = require('fs');
const zlib = require('zlib');

function analyzePdf(path) {
  const buf = fs.readFileSync(path);
  const text = buf.toString('binary');
  console.log('=== ' + path + ' ===');
  console.log('Size:', buf.length);

  // Find Page objects
  const pageCount = (text.match(/\/Type\s*\/Page\b/g) || []).length;
  console.log('Pages:', pageCount);

  // Find XObjects (Image and Form)
  const imageXobjs = (text.match(/\/Type\s*\/XObject[\s\S]*?\/Subtype\s*\/Image/g) || []).length;
  const formXobjs = (text.match(/\/Type\s*\/XObject[\s\S]*?\/Subtype\s*\/Form/g) || []).length;
  console.log('XObject Images:', imageXobjs);
  console.log('XObject Forms (vector):', formXobjs);

  // Find media boxes (page sizes)
  const mediaBoxes = text.match(/\/MediaBox\s*\[\s*([\d.\s-]+)\s*\]/g) || [];
  const uniqueBoxes = [...new Set(mediaBoxes.map(m => m.match(/[\d.\s-]+/)?.[0].trim()))];
  console.log('Unique MediaBoxes:', uniqueBoxes);

  // Decode page contents and report sizes
  const contentObjRe = /(\d+)\s+\d+\s+obj\s*<<\s*\/Length\s+(\d+)[\s\S]*?\/Filter\s*\/FlateDecode[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let totalDecoded = 0;
  let m;
  let cnt = 0;
  while ((m = contentObjRe.exec(text)) !== null) {
    try {
      const decoded = zlib.inflateSync(Buffer.from(m[3], 'binary'));
      totalDecoded += decoded.length;
      cnt++;
    } catch (e) {}
  }
  console.log('Total content streams decoded bytes:', totalDecoded, '(from', cnt, 'streams)');
  console.log();
}

analyzePdf(process.argv[2]);
analyzePdf(process.argv[3]);