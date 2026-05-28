import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const TARGETS = [
  'components/ApexDashboard.tsx',
  'components/AppSidebar.tsx',
  'routes/index.tsx',
];

const GERMAN_HINT = /[äöüÄÖÜß]|(\b(und|oder|der|die|das|ist|für|mit|auf|von|im|zu|sind|wird|werden)\b)/i;
const ENGLISH_HINT = /\b(the|and|with|for|from|loading|error|click|please|your)\b/i;

function looksLikeUserText(s) {
  const t = s.trim();
  if (t.length < 3) return false;
  if (/^[\d\s.,:%×→·\-—+#$€£*/\\?!()[\]{}<>=]+$/.test(t)) return false;
  if (/^\{[^}]+\}$/.test(t)) return false;
  if (/^[a-z]+(\.[a-z0-9_]+)+$/i.test(t)) return false;
  if (!/[A-Za-zÄÖÜäöüß]{3,}/.test(t)) return false;
  return GERMAN_HINT.test(t) || ENGLISH_HINT.test(t) || /[A-Z][a-zäöü]+ [A-Z]?[a-zäöü]+/.test(t);
}

// Strip translated regions: tr("...", "...") | tr(`...`, `...`)
function stripTrCalls(line) {
  return line.replace(/\btr\s*\(\s*(?:`[^`]*`|"[^"]*"|'[^']*')\s*,\s*(?:`[^`]*`|"[^"]*"|'[^']*')\s*\)/g,
    (m) => ' '.repeat(m.length));
}

const findings = [];

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((rawLine, idx) => {
    const ln = idx + 1;
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    const line = stripTrCalls(rawLine);
    const hasT = /\bt\(\s*['"`]/.test(line);

    const jsxMatches = [...line.matchAll(/>([^<>{}\n]+)</g)];
    for (const m of jsxMatches) {
      const txt = m[1];
      if (looksLikeUserText(txt) && !hasT) {
        findings.push({ file: rel, line: ln, kind: 'jsx-text', text: txt.trim() });
      }
    }
    const attrMatches = [...line.matchAll(/(?:title|label|placeholder|aria-label)\s*[:=]\s*['"]([^'"]+)['"]/g)];
    for (const m of attrMatches) {
      const txt = m[1];
      if (looksLikeUserText(txt)) {
        findings.push({ file: rel, line: ln, kind: 'attr', text: txt });
      }
    }
    const germanLits = [...line.matchAll(/['"`]([^'"`\n]*[äöüÄÖÜß][^'"`\n]*)['"`]/g)];
    for (const m of germanLits) {
      const txt = m[1];
      if (!findings.some(f => f.file === rel && f.line === ln && f.text.includes(txt))) {
        findings.push({ file: rel, line: ln, kind: 'literal-de', text: txt });
      }
    }
  });
}

const seen = new Set();
const unique = findings.filter(f => {
  const k = `${f.file}:${f.line}:${f.text}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(`\n=== i18n Hardcoded-String Scan (tr-aware) ===`);
console.log(`Files scanned: ${TARGETS.length}`);
console.log(`Hardcoded strings remaining: ${unique.length}\n`);

const byFile = {};
for (const f of unique) (byFile[f.file] ||= []).push(f);
for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n── ${file} (${items.length})`);
  for (const it of items.slice(0, 60)) {
    console.log(`  L${String(it.line).padStart(4)} [${it.kind}] ${it.text.slice(0, 100)}`);
  }
}
if (unique.length === 0) console.log('✅ Keine hartcodierten UI-Strings gefunden.\n');
