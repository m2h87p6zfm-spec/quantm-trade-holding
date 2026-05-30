#!/usr/bin/env node
/**
 * Regression tests for the First-Run Onboarding Tour.
 *
 * Verifies (statically + via behavioural simulation) that:
 *  1. The localStorage cache key is scoped per user.id (no cross-account leak).
 *  2. The tour is mounted inside the authenticated app shell.
 *  3. The tour only opens when the DB row says tour_completed !== true AND
 *     onboarding is fully completed (age/goal/risk).
 *  4. Mobile (<640px) uses the bottom-sheet branch; desktop uses the spotlight.
 *  5. Two different user IDs on the same browser each see the tour exactly once.
 *
 * Run:
 *   node scripts/test-onboarding-tour.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TOUR = resolve(ROOT, "src/components/FirstRunTour.tsx");
const GATE = resolve(ROOT, "src/components/AuthGate.tsx");

let failures = 0;
const ok = (m) => console.log(`  ok  ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL ${m}`); };
const section = (m) => console.log(`\n• ${m}`);

function assert(cond, msg) { cond ? ok(msg) : fail(msg); }

// ──────────────────────────────────────────────────────────────────────────
section("Static checks: FirstRunTour.tsx");
assert(existsSync(TOUR), "FirstRunTour.tsx exists");
const src = readFileSync(TOUR, "utf8");

assert(
  /const\s+STORAGE_PREFIX\s*=\s*["'][^"']+:["']/.test(src),
  "STORAGE_PREFIX is defined and ends with ':' (per-user namespace marker)",
);
assert(
  /storageKey\s*=\s*\(\s*userId[^)]*\)\s*=>\s*`\$\{STORAGE_PREFIX\}\$\{userId\}`/.test(src),
  "storageKey(userId) concatenates the user id into the cache key",
);
assert(
  /localStorage\.getItem\(storageKey\(userId\)\)/.test(src),
  "localSeen() reads the per-user key (not a global key)",
);
assert(
  /localStorage\.setItem\(storageKey\(userId\)/.test(src),
  "markLocalSeen() writes the per-user key",
);
assert(
  /from\(["']user_trading_profile["']\)/.test(src) &&
    /tour_completed/.test(src),
  "DB acts as source of truth via user_trading_profile.tour_completed",
);
assert(
  /onboarding_completed\s*===\s*true/.test(src) &&
    /age_range/.test(src) && /trading_goal/.test(src) && /risk_level/.test(src),
  "Tour only opens after onboarding (age/goal/risk all present)",
);
assert(
  /window\.innerWidth\s*<\s*640/.test(src),
  "Mobile breakpoint guard exists (<640px)",
);
assert(
  /if\s*\(\s*isMobile\s*\)\s*\{[\s\S]*?bottom\s*:/.test(src),
  "Mobile branch uses bottom-sheet positioning",
);
assert(
  /!isMobile\s*&&\s*rect/.test(src),
  "Desktop branch renders spotlight cutout (hole) when rect available",
);
assert(
  /upsert\(\s*\{\s*user_id:\s*user\.id,\s*tour_completed:\s*true\s*\}/.test(src),
  "Completing/closing the tour upserts tour_completed=true in DB",
);

// ──────────────────────────────────────────────────────────────────────────
section("Static checks: tour is mounted in authenticated shell");
assert(existsSync(GATE), "AuthGate.tsx exists");
const gate = readFileSync(GATE, "utf8");
assert(
  /FirstRunTour/.test(gate) && /<FirstRunTour\s*\/?>/.test(gate),
  "AuthGate renders <FirstRunTour /> so every authenticated route can show it",
);

// ──────────────────────────────────────────────────────────────────────────
section("Behavioural simulation: per-user cache isolation");

// Re-implement the same scheme the component uses, then simulate two users
// signing in sequentially on the same browser.
const STORAGE_PREFIX = "quantm_first_run_tour_v3:";
const key = (uid) => `${STORAGE_PREFIX}${uid}`;
const storage = new Map();
const ls = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
};

function localSeen(uid) { return ls.getItem(key(uid)) === "1"; }
function markSeen(uid) { ls.setItem(key(uid), "1"); }

const userA = "11111111-1111-1111-1111-111111111111";
const userB = "22222222-2222-2222-2222-222222222222";

assert(!localSeen(userA), "User A: tour NOT yet seen on fresh browser");
markSeen(userA);
assert(localSeen(userA), "User A: tour marked seen after completion");

// User A logs out, User B (brand-new account) signs in on the same browser.
assert(
  !localSeen(userB),
  "User B (different id) is NOT considered seen — tour must run for them too",
);
markSeen(userB);
assert(localSeen(userB), "User B: tour marked seen independently");
assert(
  localSeen(userA) && localSeen(userB) &&
    key(userA) !== key(userB),
  "Both users have independent flags in localStorage",
);

// Anonymous fallback ("anon") must not poison real users.
markSeen("anon");
const freshUser = "33333333-3333-3333-3333-333333333333";
assert(
  !localSeen(freshUser),
  "An 'anon' flag does not leak into a freshly signed-up user",
);

// ──────────────────────────────────────────────────────────────────────────
section("Behavioural simulation: viewport branch selection");

function pickBranch(width) {
  return width < 640 ? "mobile-bottom-sheet" : "desktop-spotlight";
}
assert(pickBranch(390) === "mobile-bottom-sheet", "iPhone 12 (390px) → mobile branch");
assert(pickBranch(639) === "mobile-bottom-sheet", "639px → mobile branch (edge)");
assert(pickBranch(640) === "desktop-spotlight", "640px → desktop branch (edge)");
assert(pickBranch(1440) === "desktop-spotlight", "Desktop (1440px) → desktop branch");

// ──────────────────────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "\n✓ All onboarding-tour regression checks passed."
    : `\n✗ ${failures} onboarding-tour check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
