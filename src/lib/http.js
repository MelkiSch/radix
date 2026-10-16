export class TimeoutError extends Error {
  constructor() {
    super('The request timed out');
    this.name = 'TimeoutError';
  }
}

/** fetch JSON with a timeout; honours an external AbortSignal too. */
export async function fetchJson(url, { timeout = 10000, signal, ...init } = {}) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeout);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.error && json.error.code) throw new Error(`API error: ${json.error.code}`);
    return json;
  } catch (err) {
    if (timedOut) throw new TimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
