> **Update (supersedes the data and reveal sections below)**
> - Players now live in **SQLite in the browser** (sql.js, saved to IndexedDB). No server, no `players.json`.
> - **`/add`** is a form: name, position, photo. The background is removed automatically in the browser (`@imgly/background-removal`, model downloaded once from the internet), with a live preview of the card.
> - The reveal screen renders a **card template** (`src/components/PlayerCard.jsx`, based on the purple sample card) filled with the uploaded photo, name and position. No ready-made PNG per player.
> - Revealed state is stored in the database (`players.revealed`); Shift+R resets it.
# VZK Super League â€” Player Reveal Web App: Build Plan

## Context

VZK club runs a football "market window" event for the **VZK Super League**. The organiser needs a simple, showy web app for a projector or big screen. The app shows one card per player on the main screen. Pressing a button picks a random player. A promo video plays full screen, then that player's finished card appears full screen.

The word "auction" never appears anywhere in the UI, code strings or file names the audience can see. The flow only reads as a player reveal. There is no backend, database or login. All player data lives in one JSON file in the frontend, and the card images are stored locally in the project.

Decisions already made:
- Each player image is a **ready-made card PNG**, like the purple GK "AFSAHUDHEEN" sample. The app only displays it.
- After reveal, the tile is **marked as revealed and stays visible** on the grid.
- Selection is a **Random pick button** (not a click on a tile).

## Tech stack

| Part | Choice | Why |
|---|---|---|
| Build | Vite + React (JavaScript) | Fastest setup. Static output, no server needed. |
| Animation | framer-motion | `AnimatePresence` handles screen-to-screen transitions and the card reveal with little code. |
| Styling | Plain CSS with variables (or CSS modules) | Small app, no UI library needed. |
| Data | `src/data/players.json` | Per request. No DB. |
| State | React `useState` plus `localStorage` | Remember revealed players across refresh. |
| Routing | None | One screen with a phase state machine. |

## Screen flow (state machine)

```
 GRID â”€â”€[Random pick]â”€â”€â–º SHUFFLE â”€â”€â–º VIDEO â”€â”€(ended / Skip)â”€â”€â–º REVEAL â”€â”€[Back / Esc / click]â”€â”€â–º GRID
```

1. **GRID (main screen)**
   - Header with the VZK Super League logo/title.
   - Responsive grid of tiles. Each tile shows **player name and position only** (no photo, so the card stays a surprise).
   - Big **"Pick Player"** button at the bottom or centre.
   - Revealed tiles are dimmed with a tick or badge and are not pickable.
   - Counter such as "7 / 24 revealed".
   - When all players are revealed, the button is disabled and shows "All players revealed".
2. **SHUFFLE (about 2 s)**
   - A highlight runs quickly across the unrevealed tiles, slows down and lands on the chosen one. This is the "slot machine" effect.
   - The chosen player is drawn with `Math.random()` from the unrevealed list **before** the animation starts. The animation only lands on that tile.
3. **VIDEO**
   - Full-screen `<video>` with `autoPlay`, `playsInline` and sound.
   - The click on "Pick Player" counts as the user gesture that lets sound play.
   - A small **Skip** button (and the `Esc` key) jumps straight to REVEAL.
   - If `play()` is rejected by the browser, show a "Tap to play" overlay.
   - `onEnded` goes to REVEAL.
4. **REVEAL**
   - The player's card PNG fills the screen (`object-fit: contain`, dark purple backdrop).
   - Entrance animation: scale up from 0.8 and fade in, plus a brief glow or confetti.
   - The player is marked **revealed** and saved to `localStorage` as soon as the card shows.
   - Back arrow, `Esc` or `Space` returns to GRID with that tile now marked.

## Data model

`src/data/players.json` (array, with a stable `id` added to your sketch):

```json
[
  {
    "id": "afsahudheen",
    "name": "Afsahudheen",
    "position": "GK",
    "image": "/cards/afsahudheen.png"
  }
]
```

- `position` is the short code shown on the tile: GK, DEF, MID, FWD (or full words, to be confirmed with the user).
- `image` is a path under `public/`, so the JSON never needs imports.
- To add a player: drop the PNG in `public/cards/` and add one JSON entry.

## Folder structure

```
vzk-league-market-window/
â”œâ”€ index.html
â”œâ”€ package.json
â”œâ”€ vite.config.js
â”œâ”€ public/
â”‚  â”œâ”€ cards/                 # one ready-made PNG per player
â”‚  â”‚   â””â”€ afsahudheen.png
â”‚  â”œâ”€ videos/
â”‚  â”‚   â””â”€ vzk-intro.mp4      # promo video (to be supplied)
â”‚  â””â”€ logo.png               # VZK Super League logo (optional, to be supplied)
â””â”€ src/
   â”œâ”€ main.jsx
   â”œâ”€ App.jsx                # owns phase, chosenPlayer, revealed ids
   â”œâ”€ data/
   â”‚   â””â”€ players.json
   â”œâ”€ hooks/
   â”‚   â””â”€ useRevealed.js     # localStorage-backed Set of revealed ids
   â”œâ”€ components/
   â”‚   â”œâ”€ Header.jsx
   â”‚   â”œâ”€ PlayerGrid.jsx
   â”‚   â”œâ”€ PlayerTile.jsx     # name + position, revealed / highlighted states
   â”‚   â”œâ”€ PickButton.jsx
   â”‚   â”œâ”€ IntroVideo.jsx     # fullscreen video, skip, autoplay fallback
   â”‚   â””â”€ PlayerReveal.jsx   # fullscreen card image
   â””â”€ styles/
       â”œâ”€ tokens.css         # colours and fonts
       â””â”€ app.css
```

## Component and logic notes

- **App.jsx** holds `phase` (`'grid' | 'shuffle' | 'video' | 'reveal'`), `chosen` (a player object) and `revealed` (from `useRevealed`).
- **pickRandom()**:
  1. `pool = players.filter(p => !revealed.has(p.id))`.
  2. If the pool is empty, return.
  3. Set `chosen` to a random item from the pool, then set `phase = 'shuffle'`.
- **Shuffle animation**: `PlayerGrid` receives `chosenId` and `phase`. It steps a highlight index with an easing timer (about 60 ms stretching to about 300 ms) across the pool and stops on `chosenId`. Then it calls `onShuffleDone`, and App sets `phase = 'video'`.
- **useRevealed**: `localStorage` key `vzk.revealed` holding an array of ids. Reads and writes are wrapped in try/catch. It exposes `markRevealed(id)` and `reset()`.
- **Reset**: hidden control (Shift+R, or a long-press on the logo) with a confirm step, so nobody wipes progress by accident during the event.
- **Preloading**: the video gets `preload="auto"` on mount. When the pick is made, create `new Image().src = chosen.image` so the card is ready when the video ends.
- **Layout targets**: 16:9 projector (primary) and phone portrait (secondary). The card PNG is about 4:5, so it is centred and letterboxed on wide screens.
- **Theme**: match the sample card: deep violet `#2a0a8f`, bright violet `#5a00d6`, white text, rounded pill shapes. Font: a bold geometric sans (e.g. Poppins or Sora via Google Fonts, with a local fallback).
- **Wording rule**: UI strings are limited to "Pick Player", "Revealed", "All players revealed", "Skip", "VZK Super League". Do not use auction vocabulary (bid, sold, price, lot, hammer).

## Assets the user must supply

1. **Promo video**: MP4 (H.264 + AAC), 1080p, ideally under about 20 MB. Place it at `public/videos/vzk-intro.mp4`.
2. **Player card PNGs**: same size as the sample (1125 Ã— 1398). Compress to about 300 KB each (TinyPNG or export as WebP) so reveals load instantly. Name each file after the player id.
3. **Player list**: name, position and the card file for each. Confirm the total count.
4. **Logo** (optional): for the header.

Placeholder video and sample card (the GK card already shared) are enough to build and test everything first.

## Milestones

1. **Scaffold**: Vite + React, install framer-motion, theme tokens, empty screens wired to the phase state.
2. **Data and grid**: `players.json` with 3â€“5 test entries, `PlayerGrid` and `PlayerTile`, revealed styling.
3. **Pick logic**: `useRevealed` hook, `pickRandom`, shuffle highlight animation.
4. **Video stage**: `IntroVideo` with skip, autoplay fallback and a placeholder clip.
5. **Reveal stage**: `PlayerReveal` with entrance animation and back navigation.
6. **Polish**: sounds if wanted, confetti or glow, keyboard shortcuts, reset control, fullscreen toggle (F key).
7. **Real content**: drop in the real video, all cards and the full JSON.
8. **Ship**: `npm run build`, then either run `npm run preview` on the event laptop (works offline) or deploy `dist/` to Netlify, Vercel or GitHub Pages.

## Critical files to create

- `package.json`, `vite.config.js`, `index.html`
- `src/App.jsx` (flow and state)
- `src/hooks/useRevealed.js`
- `src/components/PlayerGrid.jsx`, `IntroVideo.jsx`, `PlayerReveal.jsx`
- `src/data/players.json`

## Verification

1. `npm install && npm run dev`, then open the local URL.
2. The grid shows every JSON player with name and position only.
3. Press "Pick Player". The highlight shuffles and lands, the video plays full screen with sound, and the card appears full screen.
4. Skip (button and `Esc`) during the video goes straight to the card.
5. Going back shows that tile marked as revealed. The counter goes up and the tile cannot be picked again.
6. Refresh the page. Revealed state persists. The reset control clears it.
7. Reveal every player. The button becomes disabled and shows "All players revealed". The random pick never repeats a player.
8. A search of `src/` and the built `dist/` for "auction", "bid", "sold" and "price" returns nothing user-visible.
9. Check at 1920Ã—1080 (projector) and at a phone viewport (390Ã—844). There should be no overflow and the card must not crop.
10. `npm run build` succeeds and `npm run preview` works with the network disabled.
11. The browser console shows no errors and no autoplay-blocked warnings on the happy path.

## Open items (not blocking the start)

- Exact position labels (GK / DEF / MID / FWD, or full words).
- Total number of players and any position-based grouping or colour-coding on the grid.
- Whether the promo video has its own sound, or the app should add a background track or a reveal sting.
- The event device and screen (affects the fullscreen and offline choice).

