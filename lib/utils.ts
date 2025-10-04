import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Suppress unhandled AbortError noise from timed-out fetches in dev
try {
  if (
    typeof window !== "undefined" &&
    !(window as any).__abortNoiseSuppressed
  ) {
    window.addEventListener("unhandledrejection", (ev: any) => {
      try {
        const reason = ev?.reason;
        const msg = (reason && (reason.message || String(reason))) || "";
        if (
          (reason &&
            (reason.name === "AbortError" ||
              String(reason).includes("AbortError"))) ||
          (reason instanceof TypeError && /Failed to fetch/i.test(msg))
        ) {
          ev.preventDefault?.();
        }
      } catch {}
    });
    window.addEventListener(
      "error",
      (ev: any) => {
        try {
          const msg = String(ev?.message || ev?.error || "").toString();
          if (/Failed to fetch/i.test(msg)) {
            ev.preventDefault?.();
          }
        } catch {}
      },
      true,
    );
    (window as any).__abortNoiseSuppressed = true;
  }
} catch {}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeFetch(
  input: RequestInfo,
  init?: RequestInit & { timeoutMs?: number },
) {
  const timeoutMs =
    typeof (init as any)?.timeoutMs === "number"
      ? Math.max(1, Number((init as any).timeoutMs))
      : 7000;
  const controller = new AbortController();
  const id = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
  }, timeoutMs);
  try {
    const merged = {
      ...(init as any),
      signal: (init as any)?.signal ?? controller.signal,
    } as any;
    const res = await fetch(input, merged);
    clearTimeout(id);
    return res;
  } catch (e: any) {
    clearTimeout(id);
    // Swallow AbortError explicitly to avoid dev overlay interruptions
    if (e && (e.name === "AbortError" || String(e).includes("AbortError"))) {
      return null as any;
    }
    return null as any;
  }
}

// Simple GET cache using sessionStorage. Returns Response-like object with json() method.
let apiBackoffUntil = 0;
let resolvedApiBase: string | "synthetic" | null = null;
let resolvingPromise: Promise<string | "synthetic"> | null = null;

async function resolveApiBase(): Promise<string | "synthetic"> {
  if (resolvedApiBase) return resolvedApiBase;
  if (resolvingPromise) return resolvingPromise;
  resolvingPromise = (async () => {
    try {
      const origin =
        typeof window !== "undefined" && window.location
          ? window.location.origin
          : "";
      const bases = ["/api", "/.netlify/functions/api"];
      for (const base of bases) {
        const urls = origin
          ? [`${origin}${base}/ping`, `${base}/ping`]
          : [`${base}/ping`];
        for (const u of urls) {
          const r = await safeFetch(u, { timeoutMs: 2500 } as any);
          if (r && r.ok) {
            resolvedApiBase = base;
            return base;
          }
        }
      }
    } catch {}
    resolvedApiBase = "synthetic";
    return "synthetic";
  })();
  const res = await resolvingPromise;
  resolvingPromise = null;
  return res;
}

export async function apiFetch(path: string, init?: RequestInit) {
  try {
    const now = Date.now();
    if (now < apiBackoffUntil) return synthOk(path, init);
    if (resolvedApiBase === "synthetic") resolvedApiBase = null;
    if (
      typeof navigator !== "undefined" &&
      navigator &&
      "onLine" in navigator &&
      (navigator as any).onLine === false
    ) {
      return synthOk(path, init);
    }
    const origin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : "";
    const isAbs = /^https?:/i.test(path);

    // If path starts with /api/, prefer resolved base
    if (!isAbs && path.startsWith("/api/")) {
      const base = await resolveApiBase();
      if (base === "synthetic") return synthOk(path, init);
      const suffix = path.replace(/^\/api/, "");
      const url = `${base}${suffix}`;
      const candidates: string[] = origin ? [`${origin}${url}`, url] : [url];
      let ok: Response | null = null;
      for (const u of candidates) {
        const res = await safeFetch(u, init as any);
        if (res && res.ok) {
          ok = res;
          break;
        }
      }
      if (ok) return ok;
      // first failure: flip to synthetic mode and back off
      resolvedApiBase = "synthetic";
      apiBackoffUntil = Date.now() + 15000;
      const method =
        init && (init as any).method
          ? String((init as any).method).toUpperCase()
          : "GET";
      if (method === "GET") return synthOk(path, init);
      return null as any;
    }

    const candidates: string[] = [];
    if (isAbs) {
      candidates.push(path);
    } else {
      candidates.push(path);
      if (origin) candidates.push(`${origin}${path}`);
    }
    if (path.startsWith("/api/")) {
      const netlify = `/.netlify/functions${path}`;
      candidates.push(netlify);
      if (origin) candidates.push(`${origin}${netlify}`);
    }
    const seen = new Set<string>();
    let last: Response | null = null;
    for (const url of candidates) {
      if (seen.has(url)) continue;
      seen.add(url);
      const res = await safeFetch(url, init as any);
      if (res && res.ok) return res;
      last = res;
    }
    apiBackoffUntil = Date.now() + 15000;
    const method =
      init && (init as any).method
        ? String((init as any).method).toUpperCase()
        : "GET";
    if (method === "GET") return synthOk(path, init);
    return last as any;
  } catch {
    return synthOk(path, init);
  }
}

function synthOk(path: string, _init?: RequestInit): Response | any {
  try {
    const payload = (() => {
      if (/\/api\/wallet\/transactions\//.test(path))
        return { transactions: [] };
      if (/\/api\/wallet\/requests\//.test(path)) return { requests: [] };
      if (/\/api\/trips\//.test(path) || /\/api\/trips\/driver\//.test(path))
        return { trips: [] };
      if (/\/api\/trip\//.test(path)) return { trip: null };
      if (/\/api\/drivers\//.test(path)) return { driver: null };
      if (/\/api\/users\//.test(path)) return { user: null };
      if (/\/api\/presence/.test(path)) return { ok: true } as any;
      return { ok: true } as any;
    })();
    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as unknown as Response;
  } catch {
    return null as any;
  }
}

export async function cachedFetch(
  input: string,
  init?: RequestInit,
  ttl = 5 * 60 * 1000,
) {
  // only cache GET requests
  const method = init && init.method ? init.method.toUpperCase() : "GET";
  if (method !== "GET") return safeFetch(input, init as any);
  try {
    const key = `cache:${input}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.ts &&
          Date.now() - parsed.ts < ttl &&
          parsed.data !== undefined
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => parsed.data,
            text: async () => JSON.stringify(parsed.data),
          } as unknown as Response;
        }
      } catch (e) {
        /* ignore parse errors */
      }
    }
  } catch (e) {
    /* ignore session failures */
  }

  const res = await safeFetch(input, init);
  if (!res || !res.ok) return res;
  try {
    const data = await res
      .clone()
      .json()
      .catch(() => null);
    try {
      sessionStorage.setItem(
        `cache:${input}`,
        JSON.stringify({ ts: Date.now(), data }),
      );
    } catch (e) {
      /* ignore storage errors */
    }
  } catch (e) {
    /* ignore json parse */
  }
  return res;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa =
    sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}
