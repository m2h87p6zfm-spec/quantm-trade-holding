// Globale Börsen-Sessions. ALLE Zeitberechnungen erfolgen über
// Intl.DateTimeFormat mit echten IANA-Zeitzonen — keine UTC-Offsets,
// kein manuelles Stundenrechnen. DST/Sommer-/Winterzeit wird automatisch
// vom Browser/ICU korrekt aufgelöst.

export type SessionId = "NY" | "LON" | "FRA" | "TYO" | "HKG" | "SGX" | "SYD" | "DXB";

export type Session = {
  id: SessionId;
  city: string;
  exchange: string;
  tz: string; // IANA timezone identifier
  open: [number, number]; // local market time
  close: [number, number];
  preMarket?: [number, number]; // optional pre-market window (local)
};

export const SESSIONS: Session[] = [
  { id: "NY",  city: "New York",  exchange: "NYSE", tz: "America/New_York",  open: [9, 30], close: [16, 0],  preMarket: [4, 0] },
  { id: "LON", city: "London",    exchange: "LSE",  tz: "Europe/London",     open: [8, 0],  close: [16, 30], preMarket: [7, 0] },
  { id: "FRA", city: "Frankfurt", exchange: "XETR", tz: "Europe/Berlin",     open: [9, 0],  close: [17, 30], preMarket: [8, 0] },
  { id: "TYO", city: "Tokyo",     exchange: "TSE",  tz: "Asia/Tokyo",        open: [9, 0],  close: [15, 0],  preMarket: [8, 0] },
  { id: "HKG", city: "Hong Kong", exchange: "HKEX", tz: "Asia/Hong_Kong",    open: [9, 30], close: [16, 0],  preMarket: [9, 0] },
  { id: "SGX", city: "Singapore", exchange: "SGX",  tz: "Asia/Singapore",    open: [9, 0],  close: [17, 0],  preMarket: [8, 30] },
  { id: "SYD", city: "Sydney",    exchange: "ASX",  tz: "Australia/Sydney",  open: [10, 0], close: [16, 0],  preMarket: [7, 0] },
  { id: "DXB", city: "Dubai",     exchange: "DFM",  tz: "Asia/Dubai",        open: [10, 0], close: [15, 0],  preMarket: [9, 30] },
];

export type SessionStatus = "open" | "pre-market" | "closed";

export type SessionState = {
  session: Session;
  status: SessionStatus;
  isOpen: boolean;
  /** HH:MM 24h string in the market's local timezone */
  localTime: string;
  /** "09:41 AM" formatted in the market's local timezone */
  localTime12: string;
  /** Local weekday short, e.g. "Mon" — already in market tz */
  weekday: string;
  minutesUntilOpen: number;
  minutesUntilClose: number;
};

type Parts = {
  weekday: string;
  hour: number;
  minute: number;
  second: number;
  hh: string;
  mm: string;
  ss: string;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
const time12Formatters = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(tz: string) {
  let f = partsFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    partsFormatters.set(tz, f);
  }
  return f;
}

function getTime12Formatter(tz: string) {
  let f = time12Formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    time12Formatters.set(tz, f);
  }
  return f;
}

function partsIn(tz: string, d: Date): Parts {
  const parts = getPartsFormatter(tz).formatToParts(d);
  const obj: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== "literal") obj[p.type] = p.value;
  });
  // Intl returns "24" for midnight in some locales — normalise to "00".
  const hh = obj.hour === "24" ? "00" : (obj.hour ?? "00");
  const mm = obj.minute ?? "00";
  const ss = obj.second ?? "00";
  return {
    weekday: obj.weekday ?? "Mon",
    hour: parseInt(hh, 10),
    minute: parseInt(mm, 10),
    second: parseInt(ss, 10),
    hh,
    mm,
    ss,
  };
}

export function sessionState(s: Session, now: Date = new Date()): SessionState {
  const p = partsIn(s.tz, now);
  const cur = p.hour * 60 + p.minute;
  const openM = s.open[0] * 60 + s.open[1];
  const closeM = s.close[0] * 60 + s.close[1];
  const preM = s.preMarket ? s.preMarket[0] * 60 + s.preMarket[1] : null;
  const isWeekday = p.weekday !== "Sat" && p.weekday !== "Sun";

  let status: SessionStatus = "closed";
  if (isWeekday) {
    if (cur >= openM && cur < closeM) status = "open";
    else if (preM !== null && cur >= preM && cur < openM) status = "pre-market";
  }

  const localTime12 = getTime12Formatter(s.tz).format(now);

  return {
    session: s,
    status,
    isOpen: status === "open",
    localTime: `${p.hh}:${p.mm}`,
    localTime12,
    weekday: p.weekday,
    minutesUntilOpen: status === "open" ? 0 : Math.max(0, openM - cur),
    minutesUntilClose: status === "open" ? Math.max(0, closeM - cur) : 0,
  };
}

export function allSessions(now: Date = new Date()): SessionState[] {
  return SESSIONS.map((s) => sessionState(s, now));
}

export function statusLabel(state: SessionState): string {
  if (state.status === "open") return `${state.session.exchange} OPEN`;
  if (state.status === "pre-market") return "PRE-MARKET";
  return "MARKET CLOSED";
}
