const PREFIX = 'radix:v1:';
const DAY = 24 * 60 * 60 * 1000;
const inflight = new Map();

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const { v, exp } = JSON.parse(raw);
    if (exp && exp < Date.now()) {
      localStorage.removeItem(PREFIX + key);
      return undefined;
    }
    return v;
  } catch {
    return undefined;
  }
}

export function writeCache(key, value, ttl = 30 * DAY) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, exp: Date.now() + ttl }));
  } catch {
    /* quota exceeded or private mode — ignore */
  }
}

/**
 * Return cached value, or run `fn` once (concurrent callers share the same
 * promise) and persist its result in localStorage.
 */
export function cached(key, fn, ttl) {
  const hit = readCache(key);
  if (hit !== undefined) return Promise.resolve(hit);
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve()
    .then(fn)
    .then((v) => {
      if (v !== undefined) writeCache(key, v, ttl);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
