# 🎲 Play, Pass & Go

**Free local pass-and-play property trading game for 2–4 players on one device.** Buy, rent, trade, and build your real-estate empire — right in the browser, no install, no account, no server.

> ▶️ **Play now: [play-pass-go.vercel.app](https://play-pass-go.vercel.app)**

<!--
  💡 STRONG RECOMMENDATION: add a screenshot or GIF here (it's a game — show it!)
  1. Play a few turns at play-pass-go.vercel.app, capture the board (e.g. with ShareX/OBS/ CleanShot)
  2. Save as docs/screenshot.png (or .gif) in this repo
  3. Uncomment below:
-->
<!-- ![Gameplay screenshot](docs/screenshot.png) -->

## How it works

Add 2–4 players on one device (desktop or tablet) and take turns — the device passes between players after each move. Each player picks a unique token, then it's classic property trading: roll, buy, pay rent, draw Chance cards, trade, and try not to go bankrupt.

The landing page has a **Game Settings** panel for optional rules: turn auctions, trading, the Free Parking pot, and the Get Out of Jail Free cards on or off. Houses, hotels and mortgages are always enabled. Settings persist locally and apply to the **next** game you start — a game already in progress keeps the rules it began with.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| State | Zustand |
| Animation | Motion (Framer Motion) |
| Styling | Tailwind CSS 4 |
| Linting | ESLint 9 |

The game logic lives in [src/engine](src/engine) — a framework-agnostic game engine (`boardData`, `chanceCards`, …) kept separate from the UI, so rules are testable and the UI stays presentational.

## Run locally

```bash
git clone https://github.com/ronnyharianto/play-pass-go.git
cd play-pass-go
npm install
npm run dev
```

Open http://localhost:3000 — add players and start playing.

### Testing from another device (iPad, LAN, tunnel)

Next.js blocks cross-origin dev assets by default. The symptom is a page that renders but where **no button responds**, because the client JavaScript was refused. Allow whatever host you reach the dev server on (comma-separated, no protocol):

```bash
ALLOWED_DEV_ORIGINS=192.168.1.20:3000,my-tunnel.example.com npm run dev
```

## Roadmap

- [ ] More board themes
- [ ] Optional simple AI opponent
- [ ] Sound effects & haptics on tablet
- [ ] Multi-device mode (WebRTC / WebSocket)

---

MIT © 2026 Ronny Harianto
