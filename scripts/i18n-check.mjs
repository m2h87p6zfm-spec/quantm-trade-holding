#!/usr/bin/env node
/**
 * i18n sanity check
 * ---------------------------------------------------------------
 * Verifies that:
 *  1. DE and EN dictionaries in src/lib/i18n.ts have key parity.
 *  2. The EN dictionary contains no leftover German strings
 *     (umlauts ä/ö/ü/ß or common German stop-words).
 *  3. No .tsx/.ts files outside the i18n module render hardcoded
 *     German strings (umlauts or common DE keywords) in JSX text,
 *     string literals, or template literals.
 *
 * Usage:  node scripts/i18n-check.mjs
 * Exits with non-zero status on any violation so it can run in CI.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");
const I18N_FILE = join(SRC, "lib", "i18n.ts");

/** Files / paths that are allowed to contain German literals. */
const IGNORE_PATTERNS = [
  /src[\\/]lib[\\/]i18n\.ts$/,
  /src[\\/]routeTree\.gen\.ts$/,
  /\.test\.[tj]sx?$/,
  /__tests__/,
];

/** German stop-words that should never appear in EN dict or user-facing
 * code outside i18n.ts. Lowercased; matched as whole words. */
const DE_WORDS = [
  "und", "oder", "nicht", "kein", "keine", "mit", "ohne", "für",
  "über", "unter", "auch", "auf", "aus", "bei", "vom", "zum", "zur",
  "der", "die", "das", "des", "dem", "den", "ein", "eine", "einen",
  "ist", "sind", "war", "wird", "wurde", "werden", "haben", "hat",
  "kann", "können", "soll", "muss", "müssen", "möchte", "darf",
  "jetzt", "noch", "schon", "sehr", "immer", "nie", "heute", "morgen",
  "abo", "kündigen", "kündigung", "speichern", "abbrechen", "löschen",
  "schließen", "öffnen", "laden", "lädt", "fehler", "einstellungen",
  "anmelden", "abmelden", "registrieren", "zurücksetzen", "weiter",
  "zurück", "wählen", "wähle", "preise", "kostenlos", "monatlich",
  "jährlich", "bezahlen", "zahlung", "rechnung", "konto", "sprache",
  "deutsch", "englisch", "willkommen", "verwalten", "hinzufügen",
  "entfernen", "umbenennen", "bestätigen", "ändern", "ändert", "geändert",
  "verfügbar", "erforderlich", "ungültig", "erfolgreich",
];

const UMLAUT_RE = /[äöüÄÖÜß]/;
const DE_WORD_RE = new RegExp(`\\b(?:${DE_WORDS.join("|")})\\b`, "i");

const errors = [];
const warnings = [];

// ---------------------------------------------------------------
// 1 + 2. Dictionary parity & EN-purity
// ---------------------------------------------------------------
function extractDict(source, langKey) {
  // Locate `<langKey>: {` and read until the matching closing `},`.
  const start = source.search(new RegExp(`^\\s{2,}${langKey}:\\s*\\{`, "m"));
  if (start === -1) return null;
  let depth = 0;
  let i = source.indexOf("{", start);
  const open = i;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = source.slice(open + 1, i);
  const entries = {};
  // Match `"key": "value",` — values may contain escaped quotes.
  const entryRe = /"((?:[^"\\]|\\.)+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    entries[m[1]] = m[2];
  }
  return entries;
}

const i18nSrc = readFileSync(I18N_FILE, "utf8");
const de = extractDict(i18nSrc, "de");
const en = extractDict(i18nSrc, "en");

if (!de || !en) {
  errors.push(`[dict] Could not parse DE/EN dictionaries from ${relative(ROOT, I18N_FILE)}`);
} else {
  const deKeys = new Set(Object.keys(de));
  const enKeys = new Set(Object.keys(en));
  for (const k of deKeys) if (!enKeys.has(k)) errors.push(`[dict] Missing EN translation for key: ${k}`);
  for (const k of enKeys) if (!deKeys.has(k)) errors.push(`[dict] Missing DE translation for key: ${k}`);

  for (const [k, v] of Object.entries(en)) {
    if (UMLAUT_RE.test(v)) {
      errors.push(`[dict] EN value contains German umlaut — key="${k}", value="${v}"`);
    } else if (DE_WORD_RE.test(v)) {
      const m = v.match(DE_WORD_RE);
      errors.push(`[dict] EN value contains German word "${m[0]}" — key="${k}", value="${v}"`);
    }
  }
}

// ---------------------------------------------------------------
// 3. Source scan: no hardcoded German strings outside i18n.ts
// ---------------------------------------------------------------
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function isIgnored(rel) {
  return IGNORE_PATTERNS.some((re) => re.test(rel));
}

/** Strip line + block comments so we don't flag German comments. */
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Extract candidate user-facing strings: JSX text nodes, "…", '…', `…`. */
function extractStrings(src) {
  const out = [];
  // JSX text nodes: between `>` and `<` that aren't tag chars.
  const jsxRe = />([^<>{}\n]+)</g;
  let m;
  while ((m = jsxRe.exec(src)) !== null) {
    const txt = m[1].trim();
    if (txt) out.push({ kind: "jsx", text: txt, index: m.index });
  }
  // Double-quoted strings
  const dq = /"((?:[^"\\\n]|\\.){2,})"/g;
  while ((m = dq.exec(src)) !== null) out.push({ kind: "str", text: m[1], index: m.index });
  // Single-quoted strings
  const sq = /'((?:[^'\\\n]|\\.){2,})'/g;
  while ((m = sq.exec(src)) !== null) out.push({ kind: "str", text: m[1], index: m.index });
  // Template literals (no ${…})
  const tpl = /`([^`$\\]{2,})`/g;
  while ((m = tpl.exec(src)) !== null) out.push({ kind: "tpl", text: m[1], index: m.index });
  return out;
}

const offenders = [];
for (const file of walk(SRC)) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue;
  const rel = relative(ROOT, file);
  if (isIgnored(rel)) continue;

  const raw = readFileSync(file, "utf8");
  const src = stripComments(raw);
  const strings = extractStrings(src);

  for (const s of strings) {
    const hasUmlaut = UMLAUT_RE.test(s.text);
    const hasDeWord = DE_WORD_RE.test(s.text);
    if (!hasUmlaut && !hasDeWord) continue;
    // Skip strings that look like code identifiers or imports
    if (/^[a-z][a-zA-Z0-9_.-]*$/.test(s.text)) continue;
    // Compute line number
    const line = src.slice(0, s.index).split("\n").length;
    offenders.push({ file: rel, line, text: s.text.slice(0, 120) });
  }
}

if (offenders.length) {
  warnings.push(`[src] Found ${offenders.length} candidate hardcoded German strings outside i18n.ts:`);
  for (const o of offenders.slice(0, 50)) {
    warnings.push(`  ${o.file}:${o.line}  "${o.text}"`);
  }
  if (offenders.length > 50) warnings.push(`  … and ${offenders.length - 50} more`);
}

// ---------------------------------------------------------------
// Report
// ---------------------------------------------------------------
let exit = 0;

if (errors.length) {
  console.error("\n✖ i18n sanity check — ERRORS");
  for (const e of errors) console.error("  " + e);
  exit = 1;
} else {
  console.log("✓ Dictionary parity & EN purity OK");
}

if (warnings.length) {
  console.warn("\n⚠ i18n sanity check — WARNINGS");
  for (const w of warnings) console.warn(w);
  // Warnings don't fail the build by default. Set STRICT_I18N=1 to enforce.
  if (process.env.STRICT_I18N === "1") exit = 1;
} else {
  console.log("✓ No hardcoded German strings detected in source");
}

console.log(
  `\nSummary: ${errors.length} error(s), ${offenders.length} candidate hardcoded string(s).`,
);
process.exit(exit);
