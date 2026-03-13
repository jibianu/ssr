/**
 * Copy both frontends into workspace projects.
 * Expects: frontend/Courses_frontend and frontend/elearn_frontend (siblings of oilandgasclub).
 * Run from repo root: node frontend/oilandgasclub/scripts/copy-all.js
 * Or from frontend/oilandgasclub: node scripts/copy-all.js
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const coursesSrc = path.join(root, '..', 'Courses_frontend', 'src');
const elearnSrc = path.join(root, '..', 'elearn_frontend', 'src');
const siteDest = path.join(root, 'projects', 'site', 'src');
const elearnDest = path.join(root, 'projects', 'elearn', 'src');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

let ok = true;
if (copyRecursive(coursesSrc, siteDest)) {
  console.log('Copied Courses_frontend/src -> projects/site/src');
} else {
  console.warn('Courses_frontend/src not found at', coursesSrc);
  ok = false;
}
if (copyRecursive(elearnSrc, elearnDest)) {
  console.log('Copied elearn_frontend/src -> projects/elearn/src');
} else {
  console.warn('elearn_frontend/src not found at', elearnSrc);
  ok = false;
}
process.exit(ok ? 0 : 1);
