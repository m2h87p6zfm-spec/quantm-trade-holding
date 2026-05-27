import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSettings } from "@/lib/settings";
import { translateTexts } from "@/lib/translate.functions";

/**
 * AutoTranslate — runtime DOM translation engine.
 *
 * Walks the rendered document, finds text nodes / translatable attributes in
 * the source language (German) and replaces them with the user's selected
 * target language. Translations come from `translateTexts` (server fn) which
 * is backed by an AI gateway + DB cache, so each unique string is translated
 * once across the entire user base and then served instantly.
 *
 * Mount once near the root of the app. No props.
 */

const SOURCE_LANG = "de";
const STORAGE_PREFIX = "qx_tr_v2_";

// Skip these elements entirely (text + attrs).
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH", "CANVAS",
  "INPUT", "TEXTAREA", "SELECT",
]);

const ATTR_TARGETS = ["placeholder", "title", "aria-label", "alt"] as const;

/** Quick guard: does this string look translatable? */
function looksTranslatable(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 2) return false;
  // Must contain at least one letter
  if (!/\p{L}/u.test(trimmed)) return false;
  // Pure number / percent / currency
  if (/^[\d\s.,%+\-€$£¥]+$/.test(trimmed)) return false;
  // Single ALLCAPS ticker (1-5 letters, optional dot suffix)
  if (/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(trimmed)) return false;
  // Pure URL / email
  if (/^https?:\/\//.test(trimmed)) return false;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return false;
  return true;
}

function isInSkipZone(node: Node): boolean {
  let el: Node | null = node.nodeType === 1 ? node : node.parentNode;
  while (el && el.nodeType === 1) {
    const e = el as Element;
    if (SKIP_TAGS.has(e.tagName)) return true;
    if (e.hasAttribute("data-no-translate")) return true;
    if (e.getAttribute("contenteditable") === "true") return true;
    el = e.parentNode;
  }
  return false;
}

type Cache = Map<string, string>;

function loadCache(lang: string): Cache {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + lang);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveCache(lang: string, cache: Cache) {
  if (typeof window === "undefined") return;
  try {
    // Cap to last 5000 entries to keep localStorage tidy
    const entries = Array.from(cache.entries()).slice(-5000);
    const obj: Record<string, string> = {};
    for (const [k, v] of entries) obj[k] = v;
    localStorage.setItem(STORAGE_PREFIX + lang, JSON.stringify(obj));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function AutoTranslate() {
  const { settings } = useSettings();
  const targetLang = (settings.language ?? "de") as string;
  const translate = useServerFn(translateTexts);

  // Refs survive re-renders
  const cacheRef = useRef<Cache>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // No-op when already in source language
    if (targetLang === SOURCE_LANG) {
      // Restore originals if previously translated
      // (handled passively: source language renders directly from React)
      return;
    }

    cacheRef.current = loadCache(targetLang);
    pendingRef.current = new Set();
    inflightRef.current = new Set();

    // Reverse lookup: translated string -> original. Used to ignore text we
    // already swapped so we don't queue translations as new source strings.
    const reverse = new Set<string>();
    for (const v of cacheRef.current.values()) reverse.add(v);



    const flushPending = async () => {
      const batch = Array.from(pendingRef.current);
      pendingRef.current.clear();
      if (batch.length === 0) return;

      // De-dup against in-flight + cache
      const toFetch = batch.filter(
        (t) => !cacheRef.current.has(t) && !inflightRef.current.has(t),
      );
      if (toFetch.length === 0) {
        scheduleScan();
        return;
      }
      toFetch.forEach((t) => inflightRef.current.add(t));

      try {
        // Chunk into 60-string batches
        for (let i = 0; i < toFetch.length; i += 60) {
          const chunk = toFetch.slice(i, i + 60);
          const res = await translate({
            data: { texts: chunk, targetLang, sourceLang: SOURCE_LANG },
          });
          for (const [src, tr] of Object.entries(res.map ?? {})) {
            cacheRef.current.set(src, tr);
            reverse.add(tr);
          }
          // Mark unfetched-but-attempted as identity (avoid retry storms)
          for (const s of chunk) {
            if (!cacheRef.current.has(s)) cacheRef.current.set(s, s);
          }
        }
        saveCache(targetLang, cacheRef.current);
        scheduleScan();
      } catch (err) {
        console.warn("[AutoTranslate] batch failed", err);
        // Mark as identity so we don't retry endlessly
        for (const s of toFetch) {
          if (!cacheRef.current.has(s)) cacheRef.current.set(s, s);
        }
      } finally {
        toFetch.forEach((t) => inflightRef.current.delete(t));
      }
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushPending();
      }, 250);
    };

    const scheduleScan = () => {
      if (scanTimerRef.current != null) return;
      scanTimerRef.current = window.setTimeout(() => {
        scanTimerRef.current = null;
        scan();
      }, 60);
    };

    // Walk the DOM and translate / queue text nodes + attributes
    const scan = () => {
      const root = document.body;
      if (!root) return;
      let queued = false;

      // Text nodes
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          if (isInSkipZone(n)) return NodeFilter.FILTER_REJECT;
          const v = n.nodeValue ?? "";
          if (!looksTranslatable(v)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textNodes: Text[] = [];
      let cur: Node | null;
      while ((cur = walker.nextNode())) textNodes.push(cur as Text);

      for (const tn of textNodes) {
        const orig = (tn.nodeValue ?? "").trim();
        if (!orig) continue;
        // Already a translated value — leave alone
        if (reverse.has(orig)) continue;
        const hit = cacheRef.current.get(orig);
        if (hit && hit !== orig) {
          const raw = tn.nodeValue ?? "";
          const lead = raw.match(/^\s*/)?.[0] ?? "";
          const tail = raw.match(/\s*$/)?.[0] ?? "";
          if (tn.nodeValue !== lead + hit + tail) {
            tn.nodeValue = lead + hit + tail;
          }
        } else if (!cacheRef.current.has(orig)) {
          pendingRef.current.add(orig);
          queued = true;
        }
      }

      // Attributes (placeholder, title, aria-label, alt)
      const all = root.querySelectorAll<HTMLElement>(
        "[placeholder], [title], [aria-label], [alt]",
      );
      all.forEach((el) => {
        if (SKIP_TAGS.has(el.tagName) && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
        if (el.hasAttribute("data-no-translate")) return;
        for (const attr of ATTR_TARGETS) {
          const val = el.getAttribute(attr);
          if (!val) continue;
          const trimmed = val.trim();
          if (!looksTranslatable(trimmed)) continue;
          const hit = cacheRef.current.get(trimmed);
          if (hit && hit !== trimmed) {
            if (val !== hit) el.setAttribute(attr, hit);
          } else if (!cacheRef.current.has(trimmed)) {
            pendingRef.current.add(trimmed);
            queued = true;
          }
        }
      });

      if (queued) scheduleFlush();
    };

    // Initial scan after first paint
    const initialTimer = window.setTimeout(scan, 50);

    // Observe future changes
    const obs = new MutationObserver((mutations) => {
      // Coalesce — just schedule a scan
      for (const m of mutations) {
        if (m.type === "characterData" || m.addedNodes.length > 0 || m.type === "attributes") {
          scheduleScan();
          return;
        }
      }
    });
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt"],
    });
    observerRef.current = obs;

    return () => {
      window.clearTimeout(initialTimer);
      if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current);
      if (scanTimerRef.current != null) window.clearTimeout(scanTimerRef.current);
      obs.disconnect();
      observerRef.current = null;
    };
  }, [targetLang, translate]);

  return null;
}
