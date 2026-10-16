import { fetchJson } from './http.js';
import { cached } from './cache.js';
import { GENERA, EPITHETS, SUFFIXES } from './etymologyData.js';

const LLM_KEY = import.meta.env.VITE_LLM_API_KEY;
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gemini-2.0-flash';

const LANG_NAMES = {
  la: 'Latin', 'la-lat': 'Late Latin', 'la-med': 'Medieval Latin', ML: 'Medieval Latin', 'la-new': 'New Latin', NL: 'New Latin',
  'la-vul': 'Vulgar Latin', grc: 'Ancient Greek', el: 'Greek', ar: 'Arabic', fa: 'Persian', pal: 'Middle Persian',
  fro: 'Old French', frm: 'Middle French', fr: 'French', ang: 'Old English', enm: 'Middle English', en: 'English',
  he: 'Hebrew', hbo: 'Biblical Hebrew', sa: 'Sanskrit', tr: 'Turkish', ota: 'Ottoman Turkish', nl: 'Dutch', de: 'German',
  gem: 'Germanic', 'gem-pro': 'Proto-Germanic', 'ine-pro': 'Proto-Indo-European', cel: 'Celtic', gaul: 'Gaulish',
  qfa: 'unknown source', und: 'an unknown language', mul: 'Translingual', egy: 'Egyptian', es: 'Spanish', pt: 'Portuguese',
  it: 'Italian', ja: 'Japanese', zh: 'Chinese', nah: 'Nahuatl', 'sem-pro': 'Proto-Semitic', akk: 'Akkadian',
};

/** Etymology for a scientific name: { genus, epithet } parts. */
export async function getEtymology(taxon) {
  const words = taxon.replace(/[×✕]/g, ' ').split(/\s+/).filter((w) => /^[A-Za-z-]+$/.test(w));
  const [genus, epithet] = words;
  const [g, e] = await Promise.all([
    genus ? explain(genus, 'genus') : null,
    epithet ? explain(epithet.toLowerCase(), 'epithet', genus) : null,
  ]);
  return { genus: g, epithet: e };
}

function explain(word, kind, genus) {
  return cached(`ety:${kind}:${word.toLowerCase()}`, async () => {
    const base = { word, kind };
    const lex = fromLexicon(word, kind);
    if (lex) return { ...base, ...lex, source: 'Radix lexicon' };

    const wikt = await fromWiktionary(word).catch(() => null);
    if (wikt) return { ...base, text: wikt, ...(kind === 'epithet' ? suffixHint(word) : {}), source: 'Wiktionary' };

    if (LLM_KEY) {
      const ai = await fromLLM(word, kind, genus).catch(() => null);
      if (ai) return { ...base, ...ai, source: 'AI-generated' };
    }
    const hint = kind === 'epithet' ? suffixHint(word) : null;
    if (hint) return { ...base, ...hint, source: 'Radix lexicon (suffix analysis)' };
    return { ...base, missing: true };
  });
}

function candidates(word) {
  const w = word.toLowerCase();
  const out = [w];
  if (w.endsWith('e')) out.push(w.slice(0, -1) + 'is');
  if (w.endsWith('a')) out.push(w.slice(0, -1) + 'us', w.slice(0, -1) + 'is');
  if (w.endsWith('um')) out.push(w.slice(0, -2) + 'us', w.slice(0, -2) + 'is');
  if (w.endsWith('ra')) out.push(w.slice(0, -2) + 'er');
  if (w.endsWith('rum')) out.push(w.slice(0, -3) + 'er');
  return out;
}

function fromLexicon(word, kind) {
  const dict = kind === 'genus' ? GENERA : EPITHETS;
  for (const c of candidates(word)) {
    const hit = dict[c];
    if (hit) {
      const [origin, roots, meaning, note] = hit;
      return { origin, roots: roots.map(([root, gloss]) => ({ root, gloss })), meaning, note };
    }
  }
  return null;
}

function suffixHint(word) {
  const w = word.toLowerCase();
  for (const [re, root, gloss] of SUFFIXES) {
    if (re.test(w)) return { roots: [{ root, gloss }], meaning: undefined };
  }
  return null;
}

/* ---------------- Wiktionary ---------------- */

async function fromWiktionary(word) {
  const variants = [...new Set([word, word.toLowerCase(), word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()])];
  for (const page of variants) {
    const data = await fetchJson(
      `https://en.wiktionary.org/w/api.php?${new URLSearchParams({ action: 'parse', page, prop: 'wikitext', format: 'json', origin: '*', redirects: '1' })}`,
      { timeout: 8000 }
    ).catch(() => null);
    const wt = data?.parse?.wikitext?.['*'];
    if (!wt) continue;
    const text = extractEtymology(wt);
    if (text) return text;
  }
  return null;
}

function extractEtymology(wt) {
  const sections = ['Translingual', 'Latin'];
  for (const lang of sections) {
    const start = wt.search(new RegExp(`^==\\s*${lang}\\s*==\\s*$`, 'm'));
    if (start < 0) continue;
    const rest = wt.slice(start + 4);
    const end = rest.search(/^==[^=]/m);
    const sec = end < 0 ? rest : rest.slice(0, end);
    const m = sec.match(/^===\s*Etymology(?: \d+)?\s*===\s*\n([\s\S]*?)(?=^={3,}|$(?![\s\S]))/m);
    if (!m) continue;
    const cleaned = cleanWikitext(m[1]);
    if (cleaned && cleaned.length > 8 && !/^\s*see\b/i.test(cleaned)) return truncate(cleaned, 650);
  }
  return null;
}

function cleanWikitext(src) {
  let s = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '');
  let prev;
  do { prev = s; s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => renderTemplate(inner)); } while (s !== prev);
  s = s
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\S+\s([^\]]+)\]/g, '$1')
    .replace(/'''(.*?)'''/g, '$1')
    .replace(/''(.*?)''/g, '*$1*')
    .replace(/^[*#:]+\s*/gm, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function renderTemplate(inner) {
  const parts = inner.split('|').map((p) => p.trim());
  const name = parts.shift().toLowerCase();
  const named = {};
  const pos = [];
  for (const p of parts) {
    const m = p.match(/^([a-z0-9]+)=(.*)$/i);
    if (m) named[m[1]] = m[2]; else pos.push(p);
  }
  const gloss = (g) => (g ? ` (‘${g}’)` : '');
  const term = (w, alt) => (alt || w ? `*${alt || w}*` : '');
  switch (name) {
    case 'der': case 'inh': case 'bor': case 'der+': case 'inh+': case 'bor+': case 'uder': case 'lbor': case 'cal': case 'slbor': case 'ubor': {
      const lang = LANG_NAMES[pos[1]] || pos[1] || '';
      return `${lang} ${term(pos[2], pos[3])}${gloss(named.t || named.gloss || pos[4])}`.trim();
    }
    case 'm': case 'l': case 'mention': case 'll': case 'l-self': case 'm+': case 'noncog': case 'nc': case 'cog': {
      const offset = name === 'm+' ? 1 : 0;
      const lang = name === 'cog' || name === 'm+' || name === 'noncog' || name === 'nc' ? `${LANG_NAMES[pos[0]] || ''} ` : '';
      return `${lang}${term(pos[1 + offset], pos[2 + offset])}${gloss(named.t || named.gloss || pos[3 + offset])}`;
    }
    case 'taxlink': case 'taxfmt': return term(pos[2] || pos[0]);
    case 'vern': case 'w': case 'pedia': return pos[1] || pos[0] || '';
    case 'gloss': case 'gl': return gloss(pos[0]);
    case 'af': case 'affix': case 'compound': case 'suffix': case 'prefix': case 'confix': case 'com': case 'blend':
      return pos.slice(1).filter(Boolean).map((p) => `*${p}*`).join(' + ');
    case 'q': case 'qualifier': case 'i': return `(${pos.join(', ')})`;
    case 'lang': return pos[1] || '';
    case 'nb...': case 'nb': return '';
    default: return '';
  }
}

function truncate(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf('.') + 1 || n) || cut + '…';
}

/* ---------------- Optional LLM (Gemini) ---------------- */

async function fromLLM(word, kind, genus) {
  const prompt = `You are a botanical Latin etymologist. Explain the ${kind === 'genus' ? 'genus name' : `specific epithet (in "${genus} ${word}")`} "${word}".
Respond ONLY with JSON: {"origin": "source language", "roots": [{"root": "...", "gloss": "..."}], "meaning": "short literal meaning", "note": "one concise sentence of context"}. Be accurate; if unsure, say so in note.`;
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${LLM_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
      timeout: 15000,
    }
  );
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const j = JSON.parse(txt);
  if (!j?.meaning) return null;
  return { origin: j.origin, roots: Array.isArray(j.roots) ? j.roots : [], meaning: j.meaning, note: j.note };
}
