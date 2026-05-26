import { useEffect } from "react";

/**
 * Automatically switches between dark and light theme based on the
 * sun's position at the user's geographic location.
 *
 * - Dark mode while the sun is below the horizon (after sunset, before sunrise)
 * - Light mode while the sun is above the horizon
 *
 * Falls back to `prefers-color-scheme` when geolocation is unavailable
 * or denied. Re-evaluates every 5 minutes.
 *
 * The theme is applied by toggling the `.dark` / `.light` classes on
 * `document.documentElement` — matching the existing styles.css setup.
 */

type Coords = { lat: number; lon: number };

// NOAA-style sunrise/sunset calc (returns minutes from local midnight).
// Accurate to ~1 minute, no dependencies.
function sunTimesUTC(date: Date, lat: number, lon: number) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;

  const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
  const toDays = (d: Date) => toJulian(d) - J2000;

  const e = rad * 23.4397; // obliquity
  const M = (d: number) => rad * (357.5291 + 0.98560028 * d);
  const eclipticLon = (M: number) => {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const P = rad * 102.9372;
    return M + C + P + Math.PI;
  };
  const declination = (L: number) => Math.asin(Math.sin(0) * Math.cos(e) + Math.cos(0) * Math.sin(e) * Math.sin(L));
  const julianCycle = (d: number, lw: number) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const approxTransit = (Ht: number, lw: number, n: number) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const solarTransitJ = (ds: number, M: number, L: number) =>
    J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h: number, phi: number, d: number) =>
    Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

  const lw = rad * -lon;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const Ms = M(ds);
  const L = eclipticLon(Ms);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, Ms, L);
  const h0 = rad * -0.833; // sun's "official" horizon (refraction)
  const w0 = hourAngle(h0, phi, dec);
  const Jset = solarTransitJ(ds + w0 / (2 * Math.PI), Ms, L);
  const Jrise = Jnoon - (Jset - Jnoon);
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}

function isNight(coords: Coords, now = new Date()): boolean {
  try {
    const { sunrise, sunset } = sunTimesUTC(now, coords.lat, coords.lon);
    // night = before today's sunrise or after today's sunset
    return now < sunrise || now > sunset;
  } catch {
    return prefersDark();
  }
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.style.colorScheme = dark ? "dark" : "light";
}

const COORDS_KEY = "quantm.geo";

function getCachedCoords(): Coords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v.lat === "number" && typeof v.lon === "number") return v;
  } catch { /* ignore */ }
  return null;
}

export function useAutoTheme(enabled: boolean = true) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let intervalId: number | undefined;

    const update = (coords: Coords | null) => {
      if (cancelled) return;
      applyTheme(coords ? isNight(coords) : prefersDark());
    };

    const cached = getCachedCoords();
    if (cached) update(cached);
    else applyTheme(prefersDark());

    const requestGeo = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          try { localStorage.setItem(COORDS_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
          update(coords);
          // re-check every 5 minutes
          intervalId = window.setInterval(() => update(coords), 5 * 60 * 1000);
        },
        () => {
          // Permission denied → keep system preference, re-check on change
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          const listener = () => applyTheme(mq.matches);
          mq.addEventListener?.("change", listener);
        },
        { timeout: 8000, maximumAge: 24 * 60 * 60 * 1000 },
      );
    };

    requestGeo();

    if (cached) {
      intervalId = window.setInterval(() => update(cached), 5 * 60 * 1000);
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);
}
