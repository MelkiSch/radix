# 🌿 Radix

Search any plant in **English, Français, Nederlands or botanical Latin** and get a card with its multilingual common names, family, and the Latin etymology of its scientific name.

## Features
- Debounced omnibox search across EN / FR / NL / Latin with language-tagged suggestions
- Names & taxonomy from **Wikidata**, with **GBIF** fallback for missing names/family
- Etymology of genus + specific epithet from a curated lexicon, **Wiktionary**, and optionally Gemini
- localStorage caching, timeouts with retry, friendly empty/error states
- Mobile-first responsive layout (bottom sheet → drawer → sidebar)

## Tech
Vite · React · Tailwind CSS v4 · Lucide icons

## Getting started
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

### Optional: AI etymology fallback
Copy `.env.example` to `.env` and set `VITE_LLM_API_KEY` (Gemini).

---
Made by [Smissenbroek](https://www.smissenbroek.com)
