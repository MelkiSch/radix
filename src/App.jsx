import { useCallback, useEffect, useState } from 'react';
import { History, X, Trash2 } from 'lucide-react';
import SearchBar from './components/SearchBar.jsx';
import PlantCard from './components/PlantCard.jsx';
import { EmptyState, ErrorState, CardSkeleton } from './components/States.jsx';
import { getPlant, searchPlants } from './lib/wikidata.js';

const EXAMPLES = ['Dandelion', 'Pissenlit', 'Paardenbloem', 'Taraxacum officinale', 'Quercus robur', 'Lavandula angustifolia'];
const RECENT_KEY = 'radix:recent';

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

export default function App() {
  const [status, setStatus] = useState('idle'); // idle | loading | done | empty | error
  const [plant, setPlant] = useState(null);
  const [error, setError] = useState(null);
  const [emptyQuery, setEmptyQuery] = useState('');
  const [lastSel, setLastSel] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [recent, setRecent] = useState(loadRecent);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); }, [recent]);

  const select = useCallback(async (item) => {
    setLastSel(item);
    setStatus('loading');
    setDrawer(false);
    try {
      const p = await getPlant(item.id);
      setPlant(p);
      setStatus('done');
      setRecent((r) => [{ id: item.id, taxon: p.taxon, name: p.names.en[0] || '' }, ...r.filter((x) => x.id !== item.id)].slice(0, 12));
      if (window.matchMedia('(max-width: 767px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, []);

  const runQuery = useCallback(async (q) => {
    setSearchText(q);
    setStatus('loading');
    try {
      const r = await searchPlants(q);
      if (r.length) select(r[0]);
      else { setEmptyQuery(q); setStatus('empty'); }
    } catch (e) { setLastSel(null); setError(e); setStatus('error'); }
  }, [select]);

  const retry = () => (lastSel ? select(lastSel) : searchText && runQuery(searchText));

  const RecentList = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-700">
          <History className="h-4 w-4" /> Recent
        </h2>
        {recent.length > 0 && (
          <button id="clear-recent-btn" onClick={() => setRecent([])} className="rounded-md p-1 text-slate-400 hover:text-clay-500" aria-label="Clear recent searches">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-slate-400">Your looked-up plants will appear here.</p>
      ) : (
        <ul className="space-y-1">
          {recent.map((r) => (
            <li key={r.id}>
              <button id={`recent-${r.id}`} onClick={() => { setSearchText(r.taxon); select({ id: r.id }); }}
                className={`w-full rounded-xl px-3 py-2 text-left transition hover:bg-sage-100 ${plant?.id === r.id ? 'bg-sage-100' : ''}`}>
                <em className="block truncate font-serif text-slate-800">{r.taxon}</em>
                {r.name && <span className="block truncate text-xs text-slate-500">{r.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between py-5 sm:py-6">
        <a href={import.meta.env.BASE_URL} className="flex items-center gap-2.5" id="home-link">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-600 font-serif text-lg italic text-ivory-50 shadow-sm">R</span>
          <span className="font-serif text-2xl tracking-tight text-slate-900">Radix</span>
        </a>
        <button id="open-recent-btn" onClick={() => setDrawer(true)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-sage-700 ring-1 ring-sage-200 transition hover:bg-sage-50 lg:hidden">
          <History className="h-4 w-4" /> Recent
        </button>
      </header>

      <div className="flex flex-1 gap-8 pb-12">
        <main className="min-w-0 flex-1">
          <section className={`transition-all duration-500 ${status === 'idle' ? 'pt-8 sm:pt-16 lg:pt-20' : 'pt-2'}`}>
            {status === 'idle' && (
              <div className="mb-8 animate-fade-up text-center sm:mb-10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sage-600">A multilingual herbarium</p>
                <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Every plant has a name — <em className="text-sage-700">and a root.</em>
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-slate-600">
                  Search in English, Français, Nederlands or botanical Latin to reveal common names and the etymology behind the scientific name.
                </p>
              </div>
            )}
            {status !== 'idle' && <h1 className="sr-only">Radix plant search</h1>}

            <div className="mx-auto max-w-3xl">
              <SearchBar initial={searchText} onSelect={select}
                onNoResult={(q) => { setEmptyQuery(q); setStatus('empty'); }}
                onError={(e) => { setLastSel(null); setError(e); setStatus('error'); }} />
              {status === 'idle' && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button key={ex} id={`example-${i}`} onClick={() => runQuery(ex)}
                      className="rounded-full bg-white/70 px-3.5 py-1.5 text-sm text-slate-600 ring-1 ring-sage-200 transition hover:-translate-y-0.5 hover:bg-white hover:text-sage-800 hover:shadow-sm">
                      {/\s/.test(ex) ? <em className="font-serif">{ex}</em> : ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 sm:mt-10" aria-live="polite">
            {status === 'loading' && <CardSkeleton />}
            {status === 'done' && plant && <PlantCard key={plant.id} plant={plant} />}
            {status === 'empty' && <EmptyState query={emptyQuery} onExample={runQuery} />}
            {status === 'error' && <ErrorState timeout={error?.name === 'TimeoutError'} onRetry={retry} />}
          </section>
        </main>

        <aside className="hidden w-64 shrink-0 pt-2 lg:block">
          <div className="sticky top-6 rounded-2xl bg-white/60 p-4 ring-1 ring-sage-200 backdrop-blur">{RecentList}</div>
        </aside>
      </div>

      {/* Mobile / tablet drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${drawer ? '' : 'pointer-events-none'}`} aria-hidden={!drawer}>
        <div onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity ${drawer ? 'opacity-100' : 'opacity-0'}`} />
        <div role="dialog" aria-label="Recent searches"
          className={`absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto rounded-t-3xl bg-ivory-50 p-5 shadow-2xl transition-transform duration-300 md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-80 md:rounded-none md:rounded-l-3xl ${drawer ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}>
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sage-200 md:hidden" />
          <button id="close-drawer-btn" onClick={() => setDrawer(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-sage-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          {RecentList}
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-slate-400">
        <p>Names from Wikidata & GBIF · Etymologies from the Radix lexicon & Wiktionary</p>
        <p className="mt-2 text-slate-500">
          Made by{' '}
          <a id="smissenbroek-link" href="https://www.smissenbroek.com" target="_blank" rel="noopener noreferrer"
            className="font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 transition hover:text-sage-900 hover:decoration-sage-600">
            Smissenbroek
          </a>
        </p>
      </footer>
    </div>
  );
}
