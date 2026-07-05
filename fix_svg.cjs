const fs = require('fs');
let content = fs.readFileSync('public/assets/modules/Smart Home/AMPIO MSERV-4S.svg', 'utf8');
content = content.replace(/<g id="Grupa-IN">[\s\S]*?<\/g>/, '');
content = content.replace(/<g id="Grupa-OUT">[\s\S]*?<\/g>/, '');
fs.writeFileSync('public/assets/modules/Smart Home/AMPIO MSERV-4S.svg', content, 'utf8');
console.log('Fixed SVG');
