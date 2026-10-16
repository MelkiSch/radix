import { useEffect, useId, useRef, useState } from 'react';
import { Search, Loader2, X, CornerDownLeft } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce.js';
import { searchPlants } from '../lib/wikidata.js';

export const LANG_TAG = {
  en: { label: 'EN', flag: '🇬🇧', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  fr: { label: 'FR', flag: '🇫🇷', cls: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  nl: { label: 'NL', flag: '🇳🇱', cls: 'bg-orange-50 text-orange-800 ring-orange-200' },
  la: { label: 'LA', flag: '🏛️', cls: 'bg-sage-100 text-sage-800 ring-sage-300' },
};

export default function SearchBar({ onSelect, onNoResult, onError, initial = '' }) {
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(q, 300);
  const listId = useId();
  const wrap = useRef(null);
  const lastQuery = useRef('');

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) { setItems([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    lastQuery.current = term;
    searchPlants(term, ctrl.signal)
      .then((r) => { if (!ctrl.signal.aborted) { setItems(r); setActive(r.length ? 0 : -1); } })
      .catch((e) => { if (e.name !== 'AbortError') setItems([]); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [debounced]);

  useEffect(() => {
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const choose = (item) => {
    setOpen(false);
    setQ(item.matched);
    onSelect(item);
  };

  const submit = async () => {
    const term = q.trim();
    if (term.length < 2) return;
    if (items[active] && lastQuery.current === term) return choose(items[active]);
    setLoading(true);
    try {
      const r = await searchPlants(term);
      if (r.length) choose(r[0]);
      else { setOpen(false); onNoResult(term); }
    } catch (e) {
      setOpen(false);
      onError(e);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && q.trim().length >= 2 && (items.length > 0 || (!loading && debounced === q));

  return (
    <div ref={wrap} className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="group flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_10px_40px_-12px_rgb(51_65_47/0.25)] ring-1 ring-sage-200 backdrop-blur transition focus-within:ring-2 focus-within:ring-sage-500 sm:px-5 sm:py-4">
        <Search className="h-5 w-5 shrink-0 text-sage-600" aria-hidden />
        <input
          id="plant-search-input"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search a plant in English, French, Dutch or Latin"
          autoComplete="off"
          spellCheck={false}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Dandelion, Pissenlit, Paardenbloem, Taraxacum…"
          className="min-w-0 flex-1 bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-lg"
        />
        {loading && <Loader2 className="h-5 w-5 animate-spin text-sage-500" aria-label="Searching" />}
        {q && !loading && (
          <button type="button" id="clear-search-btn" onClick={() => { setQ(''); setItems([]); }}
            className="rounded-full p-1 text-slate-400 transition hover:bg-sage-50 hover:text-slate-600" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" id="search-submit-btn"
          className="hidden items-center gap-1.5 rounded-xl bg-sage-600 px-4 py-2 text-sm font-medium text-ivory-50 transition hover:bg-sage-700 active:scale-95 sm:inline-flex">
          Search <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>

      {showList && (
        <ul id={listId} role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-sage-200 animate-fade-up">
          {items.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">No plants match “{q.trim()}”. Press Enter to try anyway.</li>
          )}
          {items.map((it, i) => {
            const tag = LANG_TAG[it.lang] || LANG_TAG.en;
            return (
              <li key={it.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onPointerDown={(e) => { e.preventDefault(); choose(it); }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${i === active ? 'bg-sage-50' : ''}`}>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${tag.cls}`}>
                  <span aria-hidden>{tag.flag}</span>{tag.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800">{it.matched}</span>
                  <span className="block truncate text-sm text-slate-500">
                    <em className="font-serif text-sage-700">{it.taxon}</em>
                    {it.description && <span> · {it.description}</span>}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
