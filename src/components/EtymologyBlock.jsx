import { Quote, BookOpen } from 'lucide-react';

/** Render *italic* markup safely. */
function Rich({ text }) {
  return text.split(/(\*[^*]+\*)/g).map((p, i) =>
    p.startsWith('*') && p.endsWith('*') && p.length > 2
      ? <em key={i} className="text-sage-800">{p.slice(1, -1)}</em>
      : <span key={i}>{p}</span>
  );
}

function Part({ label, part }) {
  if (!part) return null;
  return (
    <div className="relative">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-clay-500">{label}</div>
      <h4 className="font-serif text-3xl italic text-slate-900">{part.word}</h4>
      {part.missing ? (
        <p className="mt-3 font-serif italic text-slate-500">No reliable etymology found for this name.</p>
      ) : (
        <>
          {part.meaning && (
            <p className="mt-2 font-serif text-xl text-slate-700">“{part.meaning}”</p>
          )}
          {part.roots?.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Roots">
              {part.roots.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-sage-400" aria-hidden>+</span>}
                  <span className="rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-sage-200 transition hover:ring-sage-400">
                    <em className="font-serif text-sage-800">{r.root}</em>
                    <span className="text-slate-500"> — {r.gloss}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(part.text || part.note) && (
            <p className="mt-4 font-serif leading-relaxed text-slate-700">
              {part.origin && <span className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-500">{part.origin}. </span>}
              <Rich text={part.text || part.note} />
            </p>
          )}
          {!part.text && !part.note && part.origin && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{part.origin}</p>
          )}
          <p className="mt-3 text-[11px] text-slate-400">Source: {part.source}</p>
        </>
      )}
    </div>
  );
}

export default function EtymologyBlock({ taxon, data, state }) {
  return (
    <section aria-labelledby="etymology-heading"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ivory-200/80 via-ivory-100 to-sage-50 p-6 ring-1 ring-ivory-300 sm:p-8">
      <Quote className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-sage-200/60" aria-hidden />
      <h3 id="etymology-heading" className="relative mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-sage-700">
        <BookOpen className="h-4 w-4" /> Latin Etymology
      </h3>

      {state === 'loading' && (
        <div className="relative grid gap-8 md:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-3 w-20" /><div className="skeleton h-8 w-48" />
              <div className="skeleton h-5 w-40" /><div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      )}
      {state === 'error' && (
        <p className="relative font-serif italic text-slate-500">Etymology could not be loaded right now.</p>
      )}
      {state === 'done' && data && (
        <div className="relative grid gap-8 md:grid-cols-2 md:gap-10 md:divide-x md:divide-sage-200 [&>*:nth-child(2)]:md:pl-10">
          <Part label="Genus" part={data.genus} />
          {data.epithet ? <Part label="Specific epithet" part={data.epithet} />
            : <p className="font-serif italic text-slate-500">“{taxon}” is a genus-level name — no specific epithet.</p>}
        </div>
      )}
    </section>
  );
}
