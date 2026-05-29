const EPHEMERAL_PREFIXES = [
  "yh_candles:",
  "qx_tr_v2_",
  "qmt:popularity:v1:",
  "apex_picks_cache_v2_",
  "apex_picks_lastscan_",
];

const EPHEMERAL_KEYS = new Set([
  "apex_picks_recorded",
  "admin_ticker_live_status_v1",
  "apex.decision.stability.v1",
  "quantm_first_run_tour_v2",
]);

function isQuotaError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function removeMatchingStorageEntries(storage: Storage, aggressive = false) {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
    (key): key is string => Boolean(key),
  );

  for (const key of keys) {
    const isEphemeral = EPHEMERAL_KEYS.has(key) || EPHEMERAL_PREFIXES.some((prefix) => key.startsWith(prefix));
    const keepAggressive = key.startsWith("sb-") || key === "qt_remember" || key === "ta_settings" || key === "apex.portfolio.v1" || key === "apex.alerts.v1";
    if (isEphemeral || (aggressive && !keepAggressive)) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}

export function clearEphemeralStorageForAuth() {
  if (typeof window === "undefined") return;
  try {
    removeMatchingStorageEntries(window.localStorage);
  } catch {
    /* ignore */
  }
}

export function installSafariStorageGuard() {
  if (typeof window === "undefined" || typeof Storage === "undefined") return;
  const proto = Storage.prototype as Storage & { __quantmGuardedSetItem?: boolean };
  if (proto.__quantmGuardedSetItem) return;
  const originalSetItem = Storage.prototype.setItem;

  Object.defineProperty(proto, "__quantmGuardedSetItem", { value: true });
  Storage.prototype.setItem = function guardedSetItem(key: string, value: string) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      removeMatchingStorageEntries(this);
      try {
        return originalSetItem.call(this, key, value);
      } catch (secondError) {
        if (!isQuotaError(secondError)) throw secondError;
        removeMatchingStorageEntries(this, true);
        return originalSetItem.call(this, key, value);
      }
    }
  };
}
