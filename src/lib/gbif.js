import { fetchJson } from './http.js';
import { cached } from './cache.js';

const API = 'https://api.gbif.org/v1';
const LANG_MAP = { eng: 'en', fra: 'fr', nld: 'nl' };

/** GBIF Backbone match (cached, shared by family + vernacular lookups). */
export function gbifMatch(taxon) {
  return cached(`gbif:match:${taxon.toLowerCase()}`, async () => {
    const m = await fetchJson(`${API}/species/match?${new URLSearchParams({ name: taxon, kingdom: 'Plantae' })}`, { timeout: 6000 });
    if (!m.usageKey || m.matchType === 'NONE') return null;
    return { key: m.usageKey, family: m.family || '' };
  });
}

/** Vernacular names + family from GBIF for a scientific name. */
export async function gbifFallback(taxon) {
  const m = await gbifMatch(taxon);
  if (!m) return null;
  const vn = await fetchJson(`${API}/species/${m.key}/vernacularNames?limit=300`, { timeout: 6000 });
  const names = { en: [], fr: [], nl: [] };
  for (const r of vn.results || []) {
    const l = LANG_MAP[r.language];
    if (!l || !r.vernacularName) continue;
    const v = r.vernacularName.trim();
    if (!names[l].some((x) => x.toLowerCase() === v.toLowerCase())) names[l].push(v);
  }
  return { family: m.family, names };
}
