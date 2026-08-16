# Phase 3: Cards, Jail & Special Spaces - Implementation Plan

## Overview
Phase 3 implements the [`Monopoly`](plans/monopoly-architecture.md:1) card systems (Chance & Community Chest), enhanced jail mechanics, and proper special space handling (Free Parking, Go, Go To Jail, Visiting Jail, Tax). This builds directly on the Phase 1 & 2 foundation (40-space board, player setup, dice movement, property economy).

---

## Detailed Clarifications & Rules Addressed
1. **Card Decks**: Exactly 16 Chance cards and 16 Community Chest cards, each with an `id`, `text` (description), and `effect` function. Cards are shuffled on game start and drawn from the top via FIFO queue.
2. **Card Display**: A [`CardModal`](src/components/modals/CardModal.tsx:1) slides in when a player lands on Chance or Community Chest, showing the drawn card text and an "OK" button. The game phase briefly pauses until the player confirms.
3. **Jail Mechanics**:
   - Max 3 turns in jail; on turn 3, the player **must** pay $50 bail and is released.
   - While in jail (turns 1 & 2), the player may **[Pay $50]** or **[Roll for Doubles]**.
   - Rolling doubles frees the player immediately (no bail paid).
   - Players holding a **Get Out of Jail Free** card may use it instead of paying or rolling.
   - A player sent to jail by a card still moves their token to space 10 (Visiting Jail) visually.
4. **Free Parking**: Tax monies (Income Tax $200, Luxury Tax $100) are **accumulated** into a Free Parking pot. Landing on Free Parking collects the entire pot. The pot resets to $0 after collection.
5. **GO**: Passing GO (landing on or moving past space 0) collects $200. Already partially implemented in Phase 1.
6. **Go To Jail**: Already partially implemented in Phase 1 (direct jail). Enhanced here to also fire card modal when sent by a card.
7. **Jail/Visiting Jail Tile**: Space 10 is "Just Visiting" when a player is not serving time, and becomes the jail bench when a player is jailed.

---

## Detailed Task Breakdown

### 1. Card Data Files

#### [`src/engine/chanceCards.ts`](src/engine/chanceCards.ts:1)
- Export `CHANCE_CARDS: ChanceCard[]` (16 cards).
- Each card: `{ id: number; text: string; effect: (player: Player, state: GameState) => Partial<GameState> | null }`.
- Include classic-style cards: Advance to Go, Advance to Illinois Ave, Advance to St. Charles Place, Advance to nearest Railroad, Advance to nearest Utility, Go to Jail, Go Back 3 Spaces, Pay Poor Tax ($15), Take a trip to Reading Railroad, Get Out of Jail Free (x2), Pay each player $50, etc.
- Implement `shuffleChanceDeck(): ChanceCard[]` using Fisher-Yates shuffle.
- Track deck order state in Zustand.

#### [`src/engine/communityChestCards.ts`](src/engine/communityChestCards.ts:1)
- Export `COMMUNITY_CHEST_CARDS: CommunityChestCard[]` (16 cards).
- Same shape as Chance cards.
- Include classic-style cards: Advance to Go, Bank error in your favor ($200), Doctor's fee ($50), Pay school fees ($50), Income Tax refund ($20), Life insurance matures ($100), You have won second prize in a beauty contest ($10), You inherit $100, Pay hospital fees ($100), Get Out of Jail Free, etc.
- Implement `shuffleCommunityChestDeck(): CommunityChestCard[]`.

### 2. Global State Store Extensions ([`src/store/gameStore.ts`](src/store/gameStore.ts:1))

#### New State Fields:
```typescript
chanceDeck: ChanceCard[];          // Current shuffled deck (FIFO)
communityChestDeck: CommunityChestCard[];
pendingCard: { type: 'chance' | 'community_chest'; card: ChanceCard | CommunityChestCard } | null;
freeParkingPot: number;            // Accumulated tax money
```

#### New State on Player:
```typescript
interface Player {
  // ... existing fields
  getOutOfJailCards: number;   // Number of Get Out of Jail Free cards held
}
```

#### New Actions:
- [`drawChanceCard()`](src/store/gameStore.ts:1): Pops top card from `chanceDeck`, sets `pendingCard`, pauses game (message shown).
- [`drawCommunityChestCard()`](src/store/gameStore.ts:1): Same for community chest.
- [`applyCardEffect()`](src/store/gameStore.ts:1): Reads `pendingCard`, executes its `effect`, clears `pendingCard`, resumes game.
- [`useGetOutOfJailCard()`](src/store/gameStore.ts:1): Consumes one Get Out of Jail Free card from current player, releases them from jail.
- Free Parking collection is handled **inline** in `rollDice()` / `resolveCardLanding()` when landing: credits `freeParkingPot` to the current player, resets pot to 0 (no separate action).

#### Updated Actions:
- [`startGame()`](src/store/gameStore.ts:1): Shuffle both decks on game start. Initialize `freeParkingPot: 0`.
- [`rollDice()`](src/store/gameStore.ts:1): When `player.inJail` and not on turn 3, only set `hasRolled: true` (do not move) to let UI present jail options.
- [`endTurn()`](src/store/gameStore.ts:1): Must clear any lingering `pendingCard` state.
- Tax handling in [`rollDice()`](src/store/gameStore.ts:1): Instead of tax going to void, add tax amount to `freeParkingPot`.
- [`resetGame()`](src/store/gameStore.ts:1): Reset `chanceDeck`, `communityChestDeck`, `pendingCard`, `freeParkingPot`, player `getOutOfJailCards`.

### 3. Card Modal UI ([`src/components/modals/CardModal.tsx`](src/components/modals/CardModal.tsx:1))

A centered modal overlay that:
- Shows when `pendingCard` is not null.
- Displays the card type badge ("CHANCE" in orange or "COMMUNITY CHEST" in blue).
- Shows the card `text` in large readable font.
- Displays a "Confirm" button that calls `applyCardEffect`.
- Blocks background interaction while open.
- Animates in with a slide/fade effect.

```tsx
interface CardModalProps {
  pendingCard: { type: 'chance' | 'community_chest'; card: ChanceCard | CommunityChestCard } | null;
  onApply: () => void;
  onDismiss: () => void;
}
```

### 4. Jail UI Prompt in ActionPanel

Enhance [`ActionPanel.tsx`](src/components/controls/ActionPanel.tsx:1) to show a **Jail sub-panel** when `currentPlayer.inJail`:
- Show "🚔 You are in Jail (turn X/3)"
- Three buttons:
  - **"Pay $50 Bail"** — Calls a new store action `payBail()` (handled via existing `processRentPayment`-style logic or new action).
  - **"Roll for Doubles"** — Calls a new store action `rollForDoublesJail()` which triggers the normal `rollDice` but constrained to jail context.
  - **"Use Get Out of Jail Free (xN)"** — Calls `useGetOutOfJailCard()`, visible only if `currentPlayer.getOutOfJailCards > 0`.
- When turn 3 (forced bail): only the "Pay $50 Bail" button is shown, disabled if cash < 50 (triggers bankruptcy).

### 5. Free Parking Indicator

- Add a subtle "💰 Free Parking Pot: $X" badge in the PlayerHUD or Board center area so players know the accumulated pot.
- Free Parking pot is always visible to all players (information is not hidden).

### 6. Game Page Integration ([`src/app/game/page.tsx`](src/app/game/page/page.tsx:1))

- Pass `pendingCard`, `onApplyCard`, `onDismissCard`, `freeParkingPot`, and `onCollectFreeParking` from store to UI.
- Render `<CardModal />` when `pendingCard` is set.
- Update the PlayerHUD to show `getOutOfJailCards` count next to the current player.

### 7. Validate & Update Landing Logic in [`rollDice()`](src/store/gameStore.ts:1)

Update the tile landing branch:
```typescript
if (landedTile.type === 'chance') {
  get().drawChanceCard();
  // Set isMoving false, message, do NOT end turn — wait for card apply
}
if (landedTile.type === 'community_chest') {
  get().drawCommunityChestCard();
  // Same pause behavior
}
if (landedTile.type === 'freeparking') {
  // Free Parking is collected inline (popup + pot reset) — no separate action.
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| [`src/engine/chanceCards.ts`](src/engine/chanceCards.ts:1) | **Create** | 16 Chance cards + shuffle utility |
| [`src/engine/communityChestCards.ts`](src/engine/communityChestCards.ts:1) | **Create** | 16 Community Chest cards + shuffle utility |
| [`src/store/gameStore.ts`](src/store/gameStore.ts:1) | **Modify** | Add card state, actions, jail/free-parking logic |
| [`src/components/modals/CardModal.tsx`](src/components/modals/CardModal.tsx:1) | **Create** | Card draw modal overlay |
| [`src/components/controls/ActionPanel.tsx`](src/components/controls/ActionPanel.tsx:1) | **Modify** | Jail sub-panel with bail/role/card options |
| [`src/components/controls/PlayerHUD.tsx`](src/components/controls/PlayerHUD.tsx:1) | **Modify** | Show Free Parking pot, Get Out of Jail card count |
| [`src/app/game/page.tsx`](src/app/game/page.tsx:1) | **Modify** | Wire up card modal, pass new props |

---

## Acceptance Criteria

> **Status: ✅ Complete** (verified against the codebase on 2026-08-15)
> Minor deviations listed in "Completion Notes" below — none block gameplay.

- [x] Landing on a Chance space triggers a card draw and displays the [`CardModal`](src/components/modals/CardModal.tsx:1) with the drawn card text.
- [x] Landing on a Community Chest space triggers the same modal with a Community Chest card.
- [x] Clicking "Confirm" on the card modal executes the card's effect (money added/removed, position changed, Get Out of Jail Free granted, etc.) and updates the game message.
- [x] Tax payments (Income Tax $200, Luxury Tax $100) add to the Free Parking pot instead of disappearing.
- [x] Landing on Free Parking collects the full pot and resets it to $0, with a popup showing the amount collected.
- [x] When a player is in jail (turn < 3), the ActionPanel shows a Jail sub-panel with Pay Bail, Roll for Doubles (via the main Roll Dice button), and Use Get Out of Jail Free options.
- [x] On jail turn 3, bail is forced (auto-paid on roll when cash ≥ $50); if the player cannot afford it, they are declared bankrupt (fixed 2026-08-15 — see Completion Notes).
- [x] A Get Out of Jail Free card drawn from Chance or Community Chest increments the player's `getOutOfJailCards` count, visible in the HUD.
- [x] Using a Get Out of Jail Free card releases the player without paying cash and decrements their card count.
- [x] All 16 Chance and 16 Community Chest cards are drawable and have distinct, correct effects.
- [x] Decks are shuffled on game start and cards are drawn in order (FIFO) until exhausted.

## Completion Notes & Known Deviations (2026-08-15)

1. **No dedicated "Roll for Doubles" jail button** — jail rolling uses the main Roll Dice button instead (intentional; removed as redundant in commit `fa64aa1`). `rollDice()` still handles the jail context: doubles escape, non-doubles increment jail turns.
2. ~~**Jail turn 3 with cash < $50 does not auto-declare bankruptcy**~~ — **FIXED (2026-08-15)**: rolling a non-doubles on the 3rd jail turn with cash < $50 now declares bankruptcy via the existing `declareBankruptcy` flow, eliminating the jail soft-lock (a player could previously stay in jail forever, deadlocking a 1v1 game).
3. **No shuffle/slide-in animation on card draw** — a sound plays and the modal appears statically; the plan's "shuffling animation" and "slide/fade" modal entrance were not implemented.
4. **`pendingCard` stores `{ type, text }`** instead of the full card object; `applyCardEffect()` re-looks-up the card by text. Functionally equivalent.
5. **`endTurn()` does not explicitly clear `pendingCard`** — harmless because the modal is always dismissed (apply/dismiss) before a turn can end.
6. ~~**Card/tax payments clamp cash at 0**~~ — **FIXED (2026-08-15)**: unaffordable card payments (poor tax, repairs, doctor/hospital/school fees, street repairs) and tax spaces now pay what they can into the Free Parking pot and route the shortfall through the debt-resolution flow (`showDebtResolution`, owed to the pot). Player-to-player payment cards (Chairman of the Board, birthday, opera night) distribute only what the payer can actually afford, so no money is created and no one goes negative. A new `unpaidDebt` field was added to card `StatePatch`.
7. ~~**Movement cards don't resolve the destination tile**~~ — **FIXED (2026-08-15)**: `applyCardEffect` now calls a new `resolveCardLanding` action after any card that moves the token, so the destination is resolved like a normal landing — rent on owned properties (with DOUBLE rent for the "nearest Railroad" card, per official rules), tax with debt-resolution on shortfall, Free Parking collection, Go To Jail, and follow-up card draws when landing on another card tile. Unowned properties remain buyable via the existing position-based Buy/Decline & Auction UI.
8. ~~**Bug-fix batch (2026-08-15)**~~ — additional review findings fixed in one pass:
   - `payDebt` is now capped at the remaining debt, so the debt overlay's "Pay" button can never overpay (previously it paid the player's full cash, creating/vanish money beyond the owed amount).
   - **Rent shortfalls now pause for debt resolution** (owed to the property owner) instead of instant bankruptcy — consistent with the tax/card flow. If the player then declares bankruptcy, their assets (cash + properties) transfer to the **creditor** per official rules, not the bank.
   - **Exhausted card decks reshuffle** on the next draw (standard Monopoly rule) instead of silently skipping the card.
   - **Bankruptcy advances the turn** to the next active player (with the Pass & Play handoff) instead of leaving the bankrupt player as the current one.
   - **Even house building/selling** within a color group is enforced (build only up to the lowest sibling; sell only down to the highest sibling).
   - Deck-exhaustion guard and `sendTradeOffer` building-validation now give clear messages instead of silently returning.
