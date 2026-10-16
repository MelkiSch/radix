import { useEffect, useState } from 'react';
import { Smartphone, Download, Share, SquarePlus, X, Check } from 'lucide-react';

const DISMISS_KEY = 'radix:install-dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** "Add Radix to your home screen" call to action (PWA install). */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');
  const ios = isIOS();

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  // Only show when installation is actually possible (Chromium prompt) or on iOS (manual steps).
  if (!deferred && !ios) return null;
  if (dismissed) return null;

  const install = async () => {
    if (ios) return setShowIOSHelp((v) => !v);
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  };

  const dismiss = () => { sessionStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); };

  return (
    <div className="mx-auto mb-6 max-w-3xl animate-fade-up rounded-2xl bg-gradient-to-br from-sage-600 to-sage-700 p-4 text-left text-ivory-50 shadow-lg ring-1 ring-sage-700 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ivory-50/15">
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-snug">Add Radix to your home screen</p>
          <p className="mt-0.5 text-sm text-sage-100">Open it like an app — quick plant lookups, even on the go.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button id="install-app-btn" onClick={install}
              className="inline-flex items-center gap-2 rounded-xl bg-ivory-50 px-4 py-2 text-sm font-semibold text-sage-800 transition hover:bg-white active:scale-95">
              <Download className="h-4 w-4" /> {ios ? 'How to install' : 'Install app'}
            </button>
          </div>
          {ios && showIOSHelp && (
            <ol className="mt-3 space-y-1.5 rounded-xl bg-sage-800/40 p-3 text-sm text-ivory-100">
              <li className="flex items-center gap-2">1. Tap <Share className="h-4 w-4" aria-label="Share" /> <strong>Share</strong> in Safari’s toolbar</li>
              <li className="flex items-center gap-2">2. Choose <SquarePlus className="h-4 w-4" aria-hidden /> <strong>Add to Home Screen</strong></li>
              <li className="flex items-center gap-2">3. Tap <Check className="h-4 w-4" aria-hidden /> <strong>Add</strong></li>
            </ol>
          )}
        </div>
        <button id="dismiss-install-btn" onClick={dismiss} aria-label="Dismiss"
          className="rounded-full p-1.5 text-sage-100 transition hover:bg-ivory-50/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
