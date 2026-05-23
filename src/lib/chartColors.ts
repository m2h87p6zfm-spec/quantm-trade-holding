type Rgba = { r: number; g: number; b: number; a: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clamp255 = (value: number) => Math.round(clamp01(value) * 255);

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function oklchToRgb(l: number, c: number, h: number, alpha = 1): Rgba {
  const hue = (h * Math.PI) / 180;
  const a = Math.cos(hue) * c;
  const b = Math.sin(hue) * c;

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  const linearR = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const linearG = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const linearB = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const gamma = (channel: number) =>
    channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;

  return {
    r: clamp255(gamma(linearR)),
    g: clamp255(gamma(linearG)),
    b: clamp255(gamma(linearB)),
    a: clamp01(alpha),
  };
}

function parseRgba(color: string): Rgba | null {
  const trimmed = color.trim().toLowerCase();

  if (trimmed === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (trimmed === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (trimmed === "black") return { r: 0, g: 0, b: 0, a: 1 };

  const hex = trimmed.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map((ch) => `${ch}${ch}`).join("")
      : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = trimmed.match(/^rgba?\((.+)\)$/);
  if (rgb) {
    const normalized = rgb[1].replace(/\//g, " ").replace(/,/g, " ");
    const values = normalized.split(/\s+/).filter(Boolean).map(Number);
    if (values.length >= 3) {
      return { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 };
    }
  }

  const oklch = trimmed.match(/^oklch\((.+)\)$/);
  if (oklch) {
    const normalized = oklch[1].replace(/\//g, " ");
    const values = normalized.split(/\s+/).filter(Boolean);
    const l = values[0]?.endsWith("%") ? Number.parseFloat(values[0]) / 100 : Number.parseFloat(values[0]);
    const c = Number.parseFloat(values[1]);
    const h = Number.parseFloat(values[2]);
    const alpha = values[3] ? Number.parseFloat(values[3]) : 1;
    if ([l, c, h, alpha].every(Number.isFinite)) return oklchToRgb(l, c, h, alpha);
  }

  return null;
}

function formatRgba({ r, g, b, a }: Rgba): string {
  if (a >= 0.999) return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
}

function parseColorStop(stop: string): { color: string; percent?: number } {
  const match = stop.trim().match(/^(.+?)\s+([+-]?(?:\d+|\d*\.\d+))%$/);
  if (!match) return { color: stop.trim() };
  return { color: match[1].trim(), percent: Number.parseFloat(match[2]) };
}

export function resolveChartColor(el: HTMLElement, color: string, fallback = "rgb(255, 255, 255)"): string {
  const resolve = (value: string, depth = 0): string => {
    const trimmed = value.trim();
    if (!trimmed || depth > 8) return fallback;

    const varMatch = trimmed.match(/^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/);
    if (varMatch) {
      const cssValue = getComputedStyle(el).getPropertyValue(varMatch[1]).trim();
      return resolve(cssValue || varMatch[2] || fallback, depth + 1);
    }

    if (trimmed.startsWith("color-mix(")) {
      const body = trimmed.slice("color-mix(".length, -1).trim();
      const mix = body.match(/^in\s+[^,]+,\s*(.+)$/);
      if (!mix) return fallback;
      const [firstRaw, secondRaw = "transparent"] = splitTopLevel(mix[1]);
      const first = parseColorStop(firstRaw);
      const second = parseColorStop(secondRaw);
      const firstWeight = (first.percent ?? (second.percent == null ? 50 : 100 - second.percent)) / 100;
      const secondWeight = (second.percent ?? 100 - firstWeight * 100) / 100;
      const firstColor = parseRgba(resolve(first.color, depth + 1));
      const secondColor = parseRgba(resolve(second.color, depth + 1));
      if (!firstColor || !secondColor) return fallback;
      const a = firstColor.a * firstWeight + secondColor.a * secondWeight;
      if (a <= 0) return "rgba(0, 0, 0, 0)";
      return formatRgba({
        r: (firstColor.r * firstColor.a * firstWeight + secondColor.r * secondColor.a * secondWeight) / a,
        g: (firstColor.g * firstColor.a * firstWeight + secondColor.g * secondColor.a * secondWeight) / a,
        b: (firstColor.b * firstColor.a * firstWeight + secondColor.b * secondColor.a * secondWeight) / a,
        a,
      });
    }

    const rgba = parseRgba(trimmed);
    return rgba ? formatRgba(rgba) : trimmed;
  };

  return resolve(color);
}

export function chartCssVar(el: HTMLElement, name: string, fallback: string): string {
  return resolveChartColor(el, `var(${name})`, fallback);
}