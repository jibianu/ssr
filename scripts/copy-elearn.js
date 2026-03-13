/**
 * Copy elearn_frontend src into projects/elearn/src.
 * Run from workspace root: node scripts/copy-elearn.js
 */
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../elearn_frontend/src');
const dest = path.resolve(__dirname, '../projects/elearn/src');

if (!fs.existsSync(source)) {
  console.warn('elearn_frontend/src not found at', source);
  console.warn('Run this script from frontend/oilandgasclub with elearn_frontend as sibling.');
  process.exit(1);
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

copyRecursive(source, dest);
console.log('Copied elearn_frontend/src -> projects/elearn/src');
