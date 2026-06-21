// Render schematic from fixture project to PNG, save locally for inspection
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

// Setup JSDOM for canvas
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.window = dom.window;

// Now import the schematic service
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectPath = join(__dirname, "..", "..", "fixtures", "testProject.dinboard");
const project = JSON.parse(readFileSync(projectPath, "utf8"));

console.log("Loaded project with", project.symbols.length, "symbols");

// Use canvas polyfill
const { createCanvas } = await import("canvas").catch(() => ({}));
console.log("Canvas available:", typeof createCanvas);

// Try to build schematic layout
const { buildSchematicLayout } = await import("../lib/schematic/schematicLayoutEngine.ts");
const layout = buildSchematicLayout(project.symbols);
console.log("Layout pages:", layout.pages.length);
console.log("Layout nodes:", layout.nodes.length);
for (const p of layout.pages) {
  console.log("Page", p.pageIndex, "yOffset:", p.yOffset);
}