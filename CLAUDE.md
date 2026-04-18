# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node.js version must be sourced from nvm before running any commands:
```bash
source /home/mint/.nvm/nvm.sh
```

### Frontend
```bash
npm run dev          # Vite dev server only (no auth, no API)
npm run build        # tsc + vite build (output: dist/)
npx tsc --noEmit     # type-check without building
```

### Full stack (recommended for development)
```bash
# Terminal 1 — Vite dev server
npm run dev

# Terminal 2 — Azure Functions API
cd api && npm run start

# Or combined via SWA CLI (handles auth emulation at http://localhost:4280)
npm run start
```

### API only
```bash
cd api && npm run build    # compile TypeScript
cd api && npm run start    # start Azure Functions (func start)
```

No test suite exists in this project.

## Architecture

### Two-package structure

- `/` — Frontend: vanilla Web Components + Vite, deployed as static files
- `/api/` — Backend: Azure Functions v4 (Node/TypeScript), deployed as serverless functions

Both share no code; the frontend talks to the backend only via HTTP (`/api/*`).

### Frontend: vanilla Web Components with shadow DOM

All UI is implemented as custom elements. Every component:
- Extends `BaseComponent` ([src/components/base-component.ts](src/components/base-component.ts)), which calls `attachShadow({ mode: 'open' })` and exposes:
  - `this.root` — the shadow root (use instead of `this`)
  - `this.subscribe(store, handler)` — subscribe to a reactive store; auto-unsubscribes on disconnect
  - `this.emit(event, detail?)` — dispatch a bubbling/composed CustomEvent
  - `this.navigate(path)` — emit a `navigate` event (handled by `capybara-app`)
- Uses `render(html\`...\`, this.root)` from **lit-html** for templating
- Injects its own CSS via `import styles from './component.css?raw'` and `<style>${styles}</style>` inside the lit-html template (shadow DOM prevents global styles from reaching inside)

### Routing

`capybara-app` ([src/components/capybara-app.ts](src/components/capybara-app.ts)) is the app shell. It owns the router:
- Listens for `navigate` CustomEvents bubbling up from any child
- Calls `history.pushState` and swaps the shadow root content via `render()`
- Handles `session-complete` events from game components by navigating to `/results` and passing `SessionResult[]` via the `.sessionResults` property setter on `<results-screen>`

### State management

Three global stores in [src/services/store.ts](src/services/store.ts):
- `wordsStore` — `Word[]` (full vocabulary list, loaded once at boot)
- `progressStore` — `Map<string, WordProgress>` (keyed by `wordId`)
- `profileStore` — `UserProfile | null` (XP, level, streak, badges)

Stores are updated optimistically in the frontend and persisted to the API with fire-and-forget `Promise.all`.

### Game flow

All four game modes (`flashcard`, `spelling`, `match`, `quickfire`) share the same lifecycle:
1. `connectedCallback` calls `selectSessionWords(words, progress)` to build a session queue
2. The component renders each word card, collects `SessionResult[]`
3. On completion, emits `session-complete` with the results
4. `capybara-app` routes to `results-screen`, which applies XP/mastery/badges and persists

### Backend: Azure Functions v4

Three HTTP endpoints, all requiring authenticated users (SWA auth injects `x-ms-client-principal`):

| Route | Methods | Storage |
|---|---|---|
| `/api/words` | GET | Azure Blob (vocabulary.csv) — 5-min in-memory cache |
| `/api/progress` | GET, PUT | Azure Table Storage (`UserProgress`, partition = userId) |
| `/api/profile` | GET, PUT | Azure Table Storage (`UserProfile`, partition = userId) |

Mastery progression (PUT progress): correct answer → `masteryLevel + 1`, wrong → `masteryLevel - 1`, clamped to [0, 4]. Spaced-repetition `nextReview` intervals: 0/1/3/7/21 days per mastery level.

### Auth

Azure Static Web Apps handles authentication (Microsoft identity provider). The frontend reads `/.auth/me` to get the current user. All `/api/*` routes are locked to `authenticated` role via [staticwebapp.config.json](staticwebapp.config.json). Local dev uses the SWA CLI to emulate auth.

### Animal/word relationship

Words are assigned SVG animals deterministically by their `index` (position in vocabulary.csv) via `getAnimalForWord(index)` in [src/services/session.ts](src/services/session.ts). Animal state (`locked` / `peeking` / `befriended`) is derived from `masteryLevel`: 0→locked, 1-3→peeking, 4→befriended.

### CSS pattern

Each component has a sibling `.css` file imported as a raw string via Vite's `?raw` suffix. Dynamic values (progress bar widths, XP animation keyframe endpoints) are applied post-render via `element.style` — they cannot live in the imported CSS string. The `results-screen` XP bar uses CSS custom properties (`--xp-from`, `--xp-to`) set via `style.setProperty()` to drive the `@keyframes xp-fill` animation.
