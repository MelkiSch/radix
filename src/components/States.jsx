import { SearchX, WifiOff, RotateCcw } from 'lucide-react';

export function EmptyState({ query, onExample }) {
  return (
    <div className="animate-fade-up rounded-3xl bg-ivory-50/90 p-8 text-center ring-1 ring-sage-200 sm:p-12">
      <SearchX className="mx-auto h-12 w-12 text-sage-400" aria-hidden />
      <h2 className="mt-4 font-serif text-2xl text-slate-800">No plant found for “{query}”</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-500">Check the spelling, or try a common name in another language — or the botanical Latin.</p>
      <button id="empty-try-example" onClick={() => onExample('Lavandula angustifolia')}
        className="mt-6 rounded-xl bg-sage-600 px-5 py-2.5 text-sm font-medium text-ivory-50 transition hover:bg-sage-700">
        Try <em className="font-serif">Lavandula angustifolia</em>
      </button>
    </div>
  );
}

export function ErrorState({ timeout, onRetry }) {
  return (
    <div role="alert" className="animate-fade-up rounded-3xl bg-clay-100/60 p-8 text-center ring-1 ring-clay-500/30 sm:p-12">
      <WifiOff className="mx-auto h-12 w-12 text-clay-500" aria-hidden />
      <h2 className="mt-4 font-serif text-2xl text-slate-800">
        {timeout ? 'The herbarium is taking too long to answer' : 'We couldn’t reach the botanical databases'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        {timeout ? 'The query timed out. Wikidata can be slow at times — give it another go.' : 'Please check your connection and try again.'}
      </p>
      <button id="error-retry-btn" onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900">
        <RotateCcw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-3xl bg-ivory-50/90 p-6 ring-1 ring-sage-200 sm:p-10" aria-busy="true" aria-label="Loading plant">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-4 h-12 w-3/4" />
      <div className="skeleton mt-4 h-5 w-48" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton mt-8 h-48" />
    </div>
  );
}
