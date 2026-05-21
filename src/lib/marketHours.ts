// Globale Börsen-Sessions in UTC; Mo–Fr; Feiertage werden ignoriert (gut genug für UX).
export type SessionId = "NY" | "LON" | "FRA" | "TYO";

export type Session = {
  id: SessionId;
  city: string;
  tz: string;       // IANA
  // Lokale Handelszeiten (open/close in HH:MM 24h, lokaler Zeit der Börse)
  open: [number, number];
  close: [number, number];
};

export const SESSIONS: Session[] = [
  { id: "NY",  city: "New York",  tz: "America/New_York", open: [9, 30],  close: [16, 0] },
  { id: "LON", city: "London",    tz: "Europe/London",    open: [8, 0],   close: [16, 30] },
  { id: "FRA", city: "Frankfurt", tz: "Europe/Berlin",    open: [9, 0],   close: [17, 30] },
  { id: "TYO", city: "Tokyo",     tz: "Asia/Tokyo",       open: [9, 0],   close: [15, 0] },
];

function partsIn(tz: string, d = new Date()) {
  // Intl Parts → { weekday, hour, minute }
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const obj: Record<string, string> = {};
  parts.forEach((p) => { obj[p.type] = p.value; });
  const wd = obj.weekday; // Mon, Tue ...
  const isWeekday = wd !== "Sat" && wd !== "Sun";
  const hour = parseInt(obj.hour || "0", 10);
  const minute = parseInt(obj.minute || "0", 10);
  return { isWeekday, hour, minute, hh: obj.hour, mm: obj.minute, wd };
}

export type SessionState = {
  session: Session;
  isOpen: boolean;
  localTime: string;
  // Minuten bis Open (negativ wenn offen → bis Close)
  minutesUntilOpen: number;
  minutesUntilClose: number;
};

export function sessionState(s: Session, now = new Date()): SessionState {
  const p = partsIn(s.tz, now);
  const cur = p.hour * 60 + p.minute;
  const openM = s.open[0] * 60 + s.open[1];
  const closeM = s.close[0] * 60 + s.close[1];
  const isOpen = p.isWeekday && cur >= openM && cur < closeM;
  const minutesUntilOpen = isOpen ? 0 : Math.max(0, openM - cur);
  const minutesUntilClose = isOpen ? Math.max(0, closeM - cur) : 0;
  return {
    session: s,
    isOpen,
    localTime: `${p.hh}:${p.mm}`,
    minutesUntilOpen,
    minutesUntilClose,
  };
}

export function allSessions(now = new Date()): SessionState[] {
  return SESSIONS.map((s) => sessionState(s, now));
}
