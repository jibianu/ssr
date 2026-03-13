/**
 * Copy Courses_frontend src into projects/site/src (except node_modules).
 * Run from workspace root: node scripts/copy-site.js
 */
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../Courses_frontend/src');
const dest = path.resolve(__dirname, '../projects/site/src');

if (!fs.existsSync(source)) {
  console.warn('Courses_frontend/src not found at', source);
  console.warn('Run this script from frontend/oilandgasclub with Courses_frontend as sibling, or set path.');
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
console.log('Copied Courses_frontend/src -> projects/site/src');
