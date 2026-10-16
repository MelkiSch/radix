import { fetchJson, TimeoutError } from './http.js';
import { cached } from './cache.js';
import { gbifFallback, gbifMatch } from './gbif.js';

const API = 'https://www.wikidata.org/w/api.php';
// Latin taxon names live in the default ("en"/"mul") labels, so 3 languages suffice.
const SEARCH_LANGS = ['en', 'fr', 'nl'];
export const LANGS = ['en', 'fr', 'nl'];

const RANKS = {
  Q7432: 'species', Q34740: 'genus', Q35409: 'family', Q68947: 'subspecies',
  Q767728: 'variety', Q4886: 'cultivar', Q42621: 'hybrid', Q3238261: 'subgenus',
};
const FAMILY = 'Q35409';

const qs = (o) => new URLSearchParams({ format: 'json', origin: '*', ...o }).toString();
const norm = (l = '') => l.toLowerCase().split('-')[0];

/** Retry once on timeout / transient network errors (not on user aborts). */
async function withRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    await new Promise((r) => setTimeout(r, 400));
    return fn();
  }
}

const getEntities = (ids, props, extra = {}, signal) =>
  withRetry(() => fetchJson(`${API}?${qs({ action: 'wbgetentities', ids: ids.join('|'), props, ...extra })}`, { signal, timeout: 8000 }));

const claimValue = (claims, p) => claims?.[p]?.find((c) => c.rank !== 'deprecated')?.mainsnak?.datavalue?.value;

/** Search taxa by any name (EN / FR / NL / Latin). */
export async function searchPlants(query, signal) {
  const q = query.trim();
  if (q.length < 2) return [];
  return cached(`search3:${q.toLowerCase()}`, async () => {
    const settled = await Promise.allSettled(
      SEARCH_LANGS.map((language) =>
        fetchJson(`${API}?${qs({ action: 'wbsearchentities', search: q, language, uselang: language, type: 'item', limit: '7' })}`, { signal, timeout: 7000 })
      )
    );
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const ok = settled.filter((s) => s.status === 'fulfilled');
    if (!ok.length) throw settled[0].reason instanceof TimeoutError ? settled[0].reason : new Error('Search failed');

    const byId = new Map();
    ok.flatMap((s) => s.value.search || []).forEach((r) => { if (!byId.has(r.id)) byId.set(r.id, r); });
    if (!byId.size) return [];

    // Lightweight taxon check: claims only (no labels/sitelinks), max 15 ids.
    const ids = [...byId.keys()].slice(0, 15);
    const ent = await getEntities(ids, 'claims', {}, signal);

    const out = [];
    for (const id of ids) {
      const taxon = claimValue(ent.entities?.[id]?.claims, 'P225');
      if (!taxon) continue;
      const hit = byId.get(id);
      const matchText = hit.match?.text || hit.label || taxon;
      const isLatin = matchText.toLowerCase() === taxon.toLowerCase();
      out.push({ id, taxon, matched: matchText, lang: isLatin ? 'la' : norm(hit.match?.language) || 'en', description: hit.description || '' });
    }
    return out.slice(0, 8);
  }, 7 * 24 * 60 * 60 * 1000);
}

/** Full details for a taxon QID — Wikidata API + GBIF in parallel (no SPARQL). */
export function getPlant(id) {
  return cached(`plant3:${id}`, async () => {
    const data = await getEntities([id], 'labels|claims', { languages: 'en|fr|nl' });
    const e = data.entities?.[id];
    const claims = e?.claims || {};
    const taxon = claimValue(claims, 'P225');
    if (!taxon) throw new Error('Not a taxon');

    const rankId = claimValue(claims, 'P105')?.id;
    const imageFile = claimValue(claims, 'P18');
    const plant = {
      id, taxon,
      rank: RANKS[rankId] || '',
      family: '',
      image: imageFile ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}?width=900` : '',
      names: { en: [], fr: [], nl: [] },
      sources: ['Wikidata'],
    };

    // Vernacular names (P1843) and labels that differ from the Latin name.
    for (const c of claims.P1843 || []) {
      const v = c.mainsnak?.datavalue?.value;
      const l = norm(v?.language);
      if (v && plant.names[l]) pushUnique(plant.names[l], v.text);
    }
    for (const l of LANGS) {
      const lab = e.labels?.[l]?.value;
      if (lab && lab.toLowerCase() !== taxon.toLowerCase()) plant.names[l].unshift(lab);
    }

    // Family: GBIF match is a single fast call; walk Wikidata parents only if needed.
    if (rankId === FAMILY) plant.family = taxon;
    else {
      const m = await gbifMatch(taxon).catch(() => null);
      if (m?.family) { plant.family = m.family; plant.sources.push('GBIF'); }
      else plant.family = await walkToFamily(claimValue(claims, 'P171')?.id).catch(() => '');
    }

    if (LANGS.some((l) => !plant.names[l].length)) {
      const g = await gbifFallback(taxon).catch(() => null);
      if (g) {
        let used = false;
        for (const l of LANGS) {
          if (!plant.names[l].length && g.names[l]?.length) { plant.names[l] = g.names[l]; used = true; }
        }
        if (used && !plant.sources.includes('GBIF')) plant.sources.push('GBIF');
      }
    }
    for (const l of LANGS) plant.names[l] = dedupe(plant.names[l]).slice(0, 4);
    return plant;
  });
}

async function walkToFamily(parentId, hops = 5) {
  let cur = parentId;
  for (let i = 0; cur && i < hops; i++) {
    const d = await getEntities([cur], 'claims');
    const c = d.entities?.[cur]?.claims;
    if (claimValue(c, 'P105')?.id === FAMILY) return claimValue(c, 'P225') || '';
    cur = claimValue(c, 'P171')?.id;
  }
  return '';
}

function pushUnique(arr, v) {
  if (arr && v && !arr.some((x) => x.toLowerCase() === v.toLowerCase())) arr.push(v);
}
function dedupe(arr) {
  const seen = new Set();
  return arr.filter((v) => { const k = v.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1));
}
