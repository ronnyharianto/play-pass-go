# Phase 4: Trading & Auction Systems - Implementation Plan

## Overview
Phase 4 adds the two remaining economy features from the [`Monopoly`](plans/monopoly-architecture.md:1) roadmap: a **property trading system** (properties + cash between players) and a **property auction system** (when a player declines to buy). The other Phase 4 items from the architecture — bankruptcy detection, asset liquidation, winner detection, and `localStorage` persistence — were already implemented during Phase 2 feedback, so this phase covers only trading and auction.

---

## Detailed Clarifications & Rules Addressed

### Trading
1. **Trade eligibility**: The **current player** may open a trade with any other **non-bankrupt** player on their turn (jail does not block trading). At least one property must change hands (official Monopoly rule — prevents pure cash gifting). Cash may be added in either or both directions.
2. **Buildings block trades**: A property with houses/hotels **cannot** be offered in a trade — the owner must sell buildings first via the existing `sellHouse` action (half-cost refund). This mirrors the existing mortgage rule (`colorGroupHasBuildings`).
3. **Mortgaged properties CAN be traded**: The mortgage status transfers to the new owner; they may unmortgage later via the existing `unmortgageProperty` (+10% interest) action. The trade UI marks mortgaged properties with a visible badge.
4. **Pass & Play flow**: The proposer drafts the offer (target player, properties both ways, cash both ways). Clicking **Send Offer** switches the modal to a **review screen for the recipient** (accept / decline). The game is fully paused while a trade is pending — no rolling, ending turn, buying, or auctioning.
5. **Affordability**: The proposer cannot offer more cash than they hold. On the review screen, **Accept** is disabled (with a reason) if the recipient cannot afford the requested cash. No player's cash ever goes negative.

### Auction
6. **Trigger**: A **"Decline & Auction"** button appears whenever the current player lands on an unowned property / railroad / utility — including when they cannot afford to buy. The property is auctioned among **all non-bankrupt players, including the declining player**.
7. **Bidding rules**: Bidding starts with the player **after** the current player and rotates through all bidders. Minimum opening bid **$10**, minimum raise **$10**, custom amounts allowed up to the bidder's cash. A bidder may **Pass** (out of the auction) or **Bid**.
8. **Resolution**: The **highest bidder wins at their bid** once every other bidder has passed; the winner pays the **bank** and receives the property. If nobody bids (all pass with a $0 current bid), the property stays unowned. The auction proceeds on the same turn — after it closes, the current player resumes their turn.
9. **Guards**: No dice rolls, end turn, buying, building, mortgaging, or trading while an auction is open.
10. **No buy-back after decline (fixed 2026-08-15)**: a new `declinedTile` state records the tile the current player declined to buy; the Buy / Decline & Auction buttons stay hidden for it until the next roll or turn — previously the buttons reappeared after a no-sale auction, letting the declining player buy the property anyway.

---

## Detailed Task Breakdown

### 1. State Store Extensions ([`src/store/gameStore.ts`](src/store/gameStore.ts:1))

#### New State Fields
```typescript
// Trading
trade: {
  phase: 'proposing' | 'review';
  fromId: string;          // proposer (must be the current player)
  toId: string | null;     // target player (chosen during proposing)
  offerProps: number[];    // tile ids the proposer gives away
  requestProps: number[];  // tile ids the proposer receives
  offerCash: number;       // cash the proposer gives
  requestCash: number;     // cash the proposer receives
} | null;

// Auction
auction: {
  tileId: number;
  currentBid: number;
  highestBidderId: string | null;
  activeBidders: string[];   // player ids still in the auction
  passedBidders: string[];   // player ids that passed
  currentBidderIndex: number;
  phase: 'bidding' | 'won';
  winnerId: string | null;
  finalBid: number;
} | null;
```

#### New Actions (Trading)
- `startTrade()`: Opens the trade modal for the current player (`phase: 'proposing'`, defaults empty). No-op if fewer than 2 active players or mid-move/debt/card/auction.
- `sendTradeOffer({ toId, offerProps, requestProps, offerCash, requestCash })`: Validates (different non-bankrupt target, all props owned correctly, no buildings on offered props, ≥ 1 property total, offerCash ≤ proposer cash), then sets `trade` to `phase: 'review'` with a message prompting the recipient to review.
- `acceptTrade()`: Applies the deal — transfers properties (updates `properties` map owner + both players' `properties` arrays, keeping `houses`/`isMortgaged` intact) and cash both ways; clears `trade`; popup + sound + message. Blocks with a message if the recipient cannot afford `requestCash`.
- `declineTrade()`: Clears `trade`, message "Player X declined the trade."
- `closeTrade()`: Cancels the draft (proposing phase only), clears `trade`.

#### New Actions (Auction)
- `startAuction(tileId)`: Validates the tile is unowned and the player is not mid-move/debt/card/trade. Initializes `auction` with `activeBidders` = all non-bankrupt players ordered starting from the player after the current one, `currentBid: 0` (the **$10 opening minimum** is enforced on the first bid), `currentBidderIndex: 0`, `phase: 'bidding'`.
- `submitBid(amount)`: Current bidder places a bid — must be ≥ `currentBid + 10`, so the first bid is at least the **$10 opening minimum**, and ≤ the bidder's cash. Updates `currentBid` / `highestBidderId`, advances to the next active bidder.
- `passAuction()`: Marks the current bidder as passed and removes them from `activeBidders`; advances rotation. When only the `highestBidderId` remains active **and** `currentBid > 0`, the auction ends: winner pays `currentBid` to the bank, receives the property (`phase: 'won'`, popup + sound + message). If `currentBid === 0`, the property stays unowned and the auction closes.
- `closeAuction()`: Clears `auction` state; the current player resumes their turn.

#### Updated Actions & Guards
- `rollDice()`, `endTurn()`, `buyProperty()`: early-return when `trade` or `auction` is non-null.
- `startGame()` / `resetGame()`: initialize `trade: null`, `auction: null`.
- Optional internal helper `transferPropertyOwnership(properties, tileId, fromId, toId)` reused by `acceptTrade` and the auction win path.

### 2. Trade Modal ([`src/components/modals/TradeModal.tsx`](src/components/modals/TradeModal.tsx:1)) — **Create**
- Rendered from the game page; renders `null` when `trade === null` (same pattern as `CardModal`).
- **Proposing view** (current player):
  - Target player selector (chips of all non-bankrupt players except current).
  - Two lists ("Your properties" / "Their properties") with toggleable tiles; properties with houses/hotels are disabled (tooltip "Sell houses first"); mortgaged properties show a badge but remain tradable.
  - Cash inputs "You give $" and "You receive $" (numeric, clamped to cash).
  - Live summary + **Send Offer** button (disabled until ≥ 1 property total and valid cash), **Cancel** button.
- **Review view** (recipient): clear header naming the recipient, full offer summary (what each side gives/receives), **Accept** / **Decline** buttons. Accept is disabled with a reason when the recipient cannot afford `requestCash`.

### 3. Auction Modal ([`src/components/modals/AuctionModal.tsx`](src/components/modals/AuctionModal.tsx:1)) — **Create**
- Rendered from the game page; renders `null` when `auction === null`.
- **Bidding view**: tile name + cost, current highest bid, whose turn it is to bid, bid input (+$10 quick chip, custom amount up to bidder cash), **Bid** and **Pass** buttons.
- **Won view**: "Sold to X for $Y" + **OK** button that calls `closeAuction()`.

### 4. Action Panel ([`src/components/controls/ActionPanel.tsx`](src/components/controls/ActionPanel.tsx:1)) — **Modify**
- Add a **Trade** button in the main controls row (visible on the current player's turn; disabled while rolling/moving/debt-resolution/card-modal open/trade open/auction open or fewer than 2 active players) → calls `onStartTrade`.
- Add a **Decline & Auction** button next to the existing Buy button whenever the current tile is an unowned property/railroad/utility (including when the player can't afford it) → calls `onStartAuction(tile.id)`. Hidden while moving or in debt resolution.

### 5. Game Page ([`src/app/game/page.tsx`](src/app/game/page.tsx:1)) — **Modify**
- Render `<TradeModal />` and `<AuctionModal />` alongside the existing `<CardModal />`.
- Pass `onStartTrade={startTrade}`, `onStartAuction={startAuction}`, `hasActiveTrade`, `hasActiveAuction` (for button gating) to `ActionPanel`.

### 6. Optional Cleanup (not required for acceptance)
- Extract the inline winner modal in the game page into [`src/components/modals/GameOverModal.tsx`](src/components/modals/GameOverModal.tsx:1) to match the architecture file tree.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| [`src/store/gameStore.ts`](src/store/gameStore.ts:1) | **Modify** | Add `trade` + `auction` state, trade/auction actions, guards in `rollDice`/`endTurn`/`buyProperty`, resets in `startGame`/`resetGame` |
| [`src/components/modals/TradeModal.tsx`](src/components/modals/TradeModal.tsx:1) | **Create** | Property + cash trading UI (draft & review phases) |
| [`src/components/modals/AuctionModal.tsx`](src/components/modals/AuctionModal.tsx:1) | **Create** | Sequential bidding auction UI |
| [`src/components/controls/ActionPanel.tsx`](src/components/controls/ActionPanel.tsx:1) | **Modify** | "Trade" button + "Decline & Auction" button with gating |
| [`src/app/game/page.tsx`](src/app/game/page.tsx:1) | **Modify** | Render TradeModal + AuctionModal, wire new props |

---

## Acceptance Criteria

> **Status: ✅ Complete** (verified against the codebase on 2026-08-15)

- [x] The current player can open the Trade modal, pick a target player, and select properties/cash in both directions.
- [x] Properties with houses/hotels cannot be traded (must sell buildings first); mortgaged properties can be traded with their status transferred.
- [x] Send Offer switches the modal to the recipient's review screen; the recipient can Accept or Decline, and Accept is blocked if they can't afford the requested cash.
- [x] Accepting transfers properties and cash exactly as offered (popup + message); Declining cancels cleanly; the game is paused throughout.
- [x] At least one property must change hands; cash-only trades are rejected.
- [x] A "Decline & Auction" button appears when landing on an unowned property (even if unaffordable) and starts the auction among all non-bankrupt players, including the decliner.
- [x] Bidding rotates after the current player with a $10 minimum opening bid and $10 minimum raise; bids are capped at the bidder's cash.
- [x] The highest bidder wins at their bid once everyone else passes, pays the bank, and receives the property; if nobody bids, the property stays unowned.
- [x] The game resumes on the same turn after the auction closes.
- [x] No dice rolls / end turn / buying / building / trading while a trade or auction is open.
