import { useEffect, useState } from 'react';
import { Leaf, Database, ExternalLink, Sprout } from 'lucide-react';
import { getEtymology } from '../lib/etymology.js';
import EtymologyBlock from './EtymologyBlock.jsx';

const LANG_CARDS = [
  { key: 'en', flag: '🇬🇧', title: 'English', accent: 'from-sky-100/70' },
  { key: 'fr', flag: '🇫🇷', title: 'Français', accent: 'from-indigo-100/70' },
  { key: 'nl', flag: '🇳🇱', title: 'Nederlands', accent: 'from-orange-100/70' },
];

export default function PlantCard({ plant }) {
  const [ety, setEty] = useState(null);
  const [etyState, setEtyState] = useState('loading');

  useEffect(() => {
    let live = true;
    setEtyState('loading');
    getEtymology(plant.taxon)
      .then((r) => { if (live) { setEty(r); setEtyState('done'); } })
      .catch(() => { if (live) setEtyState('error'); });
    return () => { live = false; };
  }, [plant.taxon]);

  return (
    <article className="animate-fade-up overflow-hidden rounded-3xl bg-ivory-50/95 shadow-[0_20px_60px_-25px_rgb(35_45_32/0.35)] ring-1 ring-sage-200/80" aria-labelledby="plant-title">
      <header className="relative grid gap-0 md:grid-cols-[1fr_auto]">
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-sage-600">
            <Sprout className="h-4 w-4" aria-hidden />
            {plant.rank || 'taxon'}
          </div>
          <h2 id="plant-title" className="font-serif text-4xl font-normal italic leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {plant.taxon}
          </h2>
          <p className="mt-4 flex items-center gap-2 text-slate-600">
            <Leaf className="h-4 w-4 text-sage-500" aria-hidden />
            <span className="text-sm uppercase tracking-wider text-slate-500">Family</span>
            <span className="font-serif text-lg text-slate-800">{plant.family || <span className="text-slate-400">Unknown</span>}</span>
          </p>
        </div>
        {plant.image && (
          <div className="relative h-56 md:h-auto md:w-64 lg:w-80">
            <img src={plant.image} alt={`Photograph of ${plant.taxon}`} loading="lazy"
              className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ivory-50/95 via-transparent md:bg-gradient-to-r md:from-ivory-50 md:via-ivory-50/10" />
          </div>
        )}
      </header>

      <section aria-label="Common names" className="grid gap-3 px-6 sm:grid-cols-3 sm:px-8 lg:gap-4 lg:px-10">
        {LANG_CARDS.map((c) => {
          const names = plant.names[c.key] || [];
          return (
            <div key={c.key} id={`lang-card-${c.key}`}
              className={`group rounded-2xl bg-gradient-to-br ${c.accent} to-white p-5 ring-1 ring-sage-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-sage-300`}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="text-xl" aria-hidden>{c.flag}</span>{c.title}
              </div>
              {names.length ? (
                <>
                  <p className="font-serif text-2xl leading-snug text-slate-900">{names[0]}</p>
                  {names.length > 1 && (
                    <p className="mt-2 text-sm text-slate-500">also: {names.slice(1).join(', ')}</p>
                  )}
                </>
              ) : (
                <p className="font-serif text-lg italic text-slate-400">Not commonly recorded</p>
              )}
            </div>
          );
        })}
      </section>

      <div className="p-6 sm:p-8 lg:p-10">
        <EtymologyBlock taxon={plant.taxon} data={ety} state={etyState} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-sage-200/70 bg-sage-50/60 px-6 py-4 text-xs text-slate-500 sm:px-8 lg:px-10">
        <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Data: {plant.sources.join(' · ')}</span>
        <a href={`https://www.wikidata.org/wiki/${plant.id}`} target="_blank" rel="noreferrer" id="wikidata-link"
          className="inline-flex items-center gap-1 font-medium text-sage-700 hover:text-sage-900 hover:underline">
          {plant.id} on Wikidata <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </article>
  );
}
