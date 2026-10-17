# Phase 6: Landing-Page Game Settings

## Goal

Add a **Game Settings** card to the landing page so players can enable or disable
optional rule features before starting a game. The choices persist locally and are
enforced in both the store (authoritative) and the UI (no dead buttons), so a
disabled feature can never be triggered.

**Core rules are not optional:** houses/hotels and mortgages are always enabled and
are intentionally not part of the settings model.

## Scope — four toggles (all default ON = classic rules)

| Toggle | Key | When OFF |
|--------|-----|----------|
| Auctions | `auctions` | Declining an unowned property simply ends the turn; the tile stays with the bank. |
| Trading | `trading` | Trade button/modal unavailable; players trade only through rent and bankruptcy. |
| Free Parking Pot | `freeParking` | Taxes and card fees go to the bank; landing on Free Parking pays nothing; the pot reads "Pot off". |
| Get Out of Jail Free Cards | `jailFreeCards` | Both jail-free cards are removed from the Chance/Community Chest decks, so no player can draw or be awarded one. Jail escape still works via doubles, $50 bail, or the 3-turn rule. |

## Design decisions

1. **One persisted `settings` object in `gameStore`** holding the landing-page choices.
   Defaults are all `true`, so saves created before this feature exist fall back to
   classic behavior with no persist-version migration.
2. **Rules are frozen per game, not locked in the UI.** `startGame` snapshots the
   chosen settings into `activeRules`, and every in-game behaviour reads that snapshot.
   The landing-page toggles therefore stay editable at all times and always describe the
   **next** game — a game in progress keeps the rules it started with, whatever is
   toggled afterwards (including across a refresh, since `activeRules` is persisted).
   An earlier design disabled the switches while a game was running; that left players
   unable to change anything until they reset, so it was replaced.
3. **Two enforcement layers.** Store guards are authoritative; the UI hides or disables
   controls so nothing looks clickable but dead.
4. **Registry-driven toggle list.** `GAME_FEATURE_TOGGLES` drives the panel, so adding a
   future feature means one registry entry plus its store guard.

## Implementation

### `src/engine/gameSettings.ts` (new)

- `GameSettings` interface (`auctions`, `trading`, `freeParking`, `jailFreeCards`).
- `DEFAULT_GAME_SETTINGS` — all `true`.
- `GAME_FEATURE_TOGGLES` — `{ key, label, description, icon }` entries for the panel.
- `isDefaultGameSettings()` — powers the "Classic rules" / "Custom rules" badge.

### `src/engine/chanceCards.ts` / `communityChestCards.ts`

- Added `grantsJailFreeCard?: true` to both card interfaces and tagged the two
  "You have been awarded a Get Out of Jail Free card!" definitions, so the deck
  builders can filter them without relying on card text.

### `src/store/gameStore.ts`

- New state `settings` (lobby choices) and `activeRules` (rules the running game was
  started with), plus `setSetting(key, enabled)` and `resetSettings()`. Both stay
  editable while a game is running, since they only affect the next game. Disabling
  `freeParking` clears any leftover pot, but never touches a game in progress (it still
  plays by `activeRules`).
- A custom persist `merge` folds the stored feature flags over
  `DEFAULT_GAME_SETTINGS`, so a save written by an older version never leaves a
  newly added rule `undefined` (which would silently switch it off).
- `buildChanceDeck()` / `buildCommunityChestDeck()` helpers used by `startGame`,
  `drawChanceCard` and `drawCommunityChestCard` (including the empty-deck reshuffle),
  dropping jail-free cards when the feature is off.
- `normalizePotMessage()` rewrites "Free Parking pot" → "bank" in card messages while
  the pot is disabled, instead of editing every card definition.
- Guards/behaviour changes: `startAuction`, `endTurn` (auction shortcut),
  `startTrade`, `useGetOutOfJailCard`, `payDebt` (pot credit), tax collection in
  `rollDice` and `resolveCardLanding`, Free Parking payouts in both, and the
  `applyCardEffect` pot patch.

### UI

- `src/components/lobby/GameSettingsPanel.tsx` (new) — card under the player-setup card
  with a row per toggle. Each row is a `<label>` wrapping a real (visually hidden)
  checkbox styled as a switch, so tapping **anywhere on the row** toggles it; keyboard
  focus stays visible via `peer-focus-visible`. Includes a Classic/Custom badge, a reset
  button, and an informational note (not a lock) while a game is running.
- `src/app/page.tsx` — renders the panel below the start/resume buttons.
- `src/components/board/CenterPanel.tsx` — reads `activeRules` (never `settings`) so the
  game on screen matches the rules it started with; hides the Trade button when trading is off;
  "End Turn & Auction" and the buy/decline hint only mention auctions while they are
  on; the Free Parking chip becomes "Pot off"; the "Use Get Out of Jail Free" button is
  hidden when the jail-free feature is off.
- `src/app/game/page.tsx` — mounts `TradeModal`/`AuctionModal` only when their feature
  is enabled.

## Verification

`src/test/settingsPlaytest.ts` (run with `npx tsx src/test/settingsPlaytest.ts`) covers:

- Classic defaults, `resetGame` keeping settings, `resetSettings` restoring them, and
  the lock while a game is playing.
- Auctions off: `endTurn` passes the turn instead of auctioning; direct `startAuction`
  is a no-op; both behaviours are re-checked with the feature on as controls.
- Trading off: `startTrade` is a no-op.
- Free Parking off: taxes and card fees never reach the pot, landing on Free Parking
  pays nothing, debt paid "to the pot" goes to the bank, unaffordable card fees message
  the bank instead of the pot, and turning the rule off clears an existing pot.
- Jail-free off: both decks ship 15 cards with no jail-free card (including after a
  reshuffle), and spending a stale card is a no-op.
- The settings model contains only the four optional features.

`src/test/settingsPersistencePlaytest.ts` covers refresh/rehydration using the real
storage shape zustand expects (`window.localStorage`): a save written before this
feature exists rehydrates to classic defaults, a save with all four features off
restores them, and a partial `settings` object defaults the missing keys.

Also re-run the existing suites for parity: `handoffPlaytest.ts` and
`bugFindingsPlaytest.ts` (both pass), plus `npx tsc --noEmit`, `npm run lint`
(no new findings) and `npm run build`.

### Dev-server note (why buttons did nothing once)

Next.js 16 refuses cross-origin requests for its dev assets. Through the cloud preview
(or any LAN/tunnel host) the page still rendered, but every JS chunk returned **403**, so
React never hydrated and *no* button on the page responded. `next.config.js` now reads
`ALLOWED_DEV_ORIGINS` (comma-separated hostnames) and feeds it to `allowedDevOrigins`,
and the dev server is started with that env var set. Verifying this needs a browser-like
request — `curl` with no `Origin` header returns 200 even while the browser is blocked,
so the check must send `Origin: https://<preview-host>`.

## Out of scope / possible follow-ups

- Toggles for jail rules, starting cash, or preset rule modes.
- Per-player or per-profile settings, and a rules summary shown during play.
