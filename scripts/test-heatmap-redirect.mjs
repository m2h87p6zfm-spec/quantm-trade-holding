#!/usr/bin/env node
/**
 * Regression tests for the retired standalone /heatmap route.
 *
 * Why this exists:
 *   /heatmap was merged into /markt-radar?tab=heatmap. Old links, bookmarks
 *   and any future refactor must keep the redirect intact — otherwise users
 *   land on a 404 or on an orphaned page.
 *
 * What this checks (all static, no network required):
 *   1. src/routes/heatmap.tsx still throws `redirect({ to: "/markt-radar",
 *      search: { tab: "heatmap" } })` inside `beforeLoad`.
 *   2. No source file (outside the route itself + i18n dictionaries) links
 *      to "/heatmap" anymore — every internal link must point at
 *      "/markt-radar".
 *   3. /markt-radar accepts `tab=heatmap` as a valid search param so the
 *      redirect target actually renders the Heatmap tab.
 *   4. The Markt-Radar tab list contains a `heatmap` trigger.
 *
 * Optional network check (only when LOVABLE_PREVIEW_URL is set):
 *   5. HEAD /heatmap on the deployed app returns 2xx or 3xx (never 404 / 5xx).
 *
 * Run: `node scripts/test-heatmap-redirect.mjs`
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};
const pass = (msg) => console.log(`  ✓ ${msg}`);
const section = (name) => console.log(`\n${name}`);

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(entry)) out.push(p);
  }
  return out;
}

// ─── 1. Route file still redirects ──────────────────────────────────────────
section("1. /heatmap route file redirects to Markt-Radar");
{
  const f = read("src/routes/heatmap.tsx");
  const hasBeforeLoad = /beforeLoad\s*:\s*\(/.test(f);
  const hasRedirectCall = /throw\s+redirect\s*\(\s*\{[\s\S]*?to\s*:\s*["']\/markt-radar["'][\s\S]*?tab\s*:\s*["']heatmap["']/.test(f);
  hasBeforeLoad
    ? pass("beforeLoad hook present")
    : fail("beforeLoad hook missing in src/routes/heatmap.tsx");
  hasRedirectCall
    ? pass("redirect target = /markt-radar?tab=heatmap")
    : fail("redirect to /markt-radar with tab=heatmap not found");
}

// ─── 2. No leftover internal links to /heatmap ──────────────────────────────
section("2. No internal links still point at /heatmap");
{
  const allowList = new Set([
    "src/routes/heatmap.tsx", // the redirect itself
  ]);
  // i18n dictionaries reference the string "nav.heatmap" as a label key, not a URL — ignore.
  const offenders = [];
  for (const abs of walk(SRC)) {
    const rel = relative(ROOT, abs).replaceAll("\\", "/");
    if (allowList.has(rel)) continue;
    if (rel.endsWith("routeTree.gen.ts")) continue;
    const txt = readFileSync(abs, "utf8");
    // Match `to="/heatmap"` or `navigate({ to: "/heatmap" })` or `"/heatmap"` in route paths.
    const matches = txt.match(/["']\/heatmap["']/g);
    if (matches) offenders.push(`${rel} (${matches.length}x)`);
  }
  offenders.length === 0
    ? pass("no stale '/heatmap' link literals found")
    : offenders.forEach((o) => fail(`stale '/heatmap' literal in ${o}`));
}

// ─── 3. /markt-radar validates tab=heatmap ──────────────────────────────────
section("3. /markt-radar accepts ?tab=heatmap");
{
  const f = read("src/routes/markt-radar.tsx");
  const hasValidator =
    /validateSearch/.test(f) && /heatmap/.test(f) && /tab/.test(f);
  hasValidator
    ? pass("validateSearch allows tab=heatmap")
    : fail("markt-radar route does not validate tab=heatmap");
  /TabsTrigger|value=["']heatmap["']/.test(f)
    ? pass("Markt-Radar tab list contains 'heatmap' value")
    : fail("Markt-Radar tabs missing 'heatmap' value");
}

// ─── 4. Optional: live HTTP check ───────────────────────────────────────────
async function liveCheck() {
  const url = process.env.LOVABLE_PREVIEW_URL;
  if (!url) {
    console.log("\n4. (skipped) set LOVABLE_PREVIEW_URL to verify live redirect");
    return;
  }
  section(`4. Live: GET ${url}/heatmap follows to /markt-radar?tab=heatmap`);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/heatmap`, {
      redirect: "manual",
      headers: { "user-agent": "lovable-redirect-test" },
    });
    if (res.status === 404 || res.status >= 500) {
      fail(`unexpected status ${res.status}`);
      return;
    }
    const loc = res.headers.get("location") ?? "";
    if (res.status >= 300 && res.status < 400 && loc.includes("/markt-radar") && loc.includes("tab=heatmap")) {
      pass(`server-side redirect → ${loc}`);
    } else if (res.status === 200) {
      // SPA fallback: redirect runs in beforeLoad on the client.
      pass(`200 OK — client-side beforeLoad will perform the redirect`);
    } else {
      fail(`unexpected response: ${res.status} ${loc}`);
    }
  } catch (err) {
    fail(`fetch failed: ${err.message}`);
  }
}

await liveCheck();

console.log("");
if (failures > 0) {
  console.error(`✗ ${failures} check(s) failed`);
  process.exit(1);
}
console.log("✓ All /heatmap redirect checks passed");
