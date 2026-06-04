const fs = require('fs');
const { JSDOM } = require('jsdom');

const content = fs.readFileSync('C:\\Users\\blamp\\Desktop\\MODUŁY\\nowe moduły\\przełączniki sieci\\Przełącznik sieci 4P.svg', 'utf-8');

const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

function applyDynamicRatingText(svgRoot, newText) {
  if (!newText || !newText.trim()) return;

  const RATING_REGEX = /^(([BCD]\d+)|(\d+A(\/\d+,\d+A)?)|(\d+A))$/i;

  let replaced = false;
  for (const textElement of Array.from(svgRoot.querySelectorAll("text"))) {
    const content = textElement.textContent?.trim();
    if (content && RATING_REGEX.test(content)) {
      textElement.textContent = newText;
      console.log(`Replaced '${content}' with '${newText}'`);
      replaced = true;
      return; 
    }
  }
  if (!replaced) console.log("Not found any matching text.");
}

const parser = new DOMParser();
const doc = parser.parseFromString(content, "image/svg+xml");
applyDynamicRatingText(doc.documentElement, "63A");
