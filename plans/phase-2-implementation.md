# Phase 2: Property System & Economy - Implementation Plan

## Overview
Phase 2 builds out the complete property economy for [`Monopoly`](plans/monopoly-architecture.md:1), including property ownership tracking, purchasing mechanics, automated rent calculation (including monopolies, houses, hotels, and utilities/railroads), house/hotel construction, house selling, mortgage/unmortgage actions, and jail rent collection rules.

---

## Detailed Clarifications & Rules Addressed
1. **Hotels Representation**: `houses: number` where values 1-4 represent houses and 5 represents 1 Hotel.
2. **Mortgage & Buildings Rule**: A property cannot be mortgaged if there are houses/hotels on any property in its color group. Players must sell houses first via `sellHouse` (at half cost).
3. **Owner in Jail Rule**: Owners collect rent even when they are in jail, provided the property is not mortgaged.
4. **Tile UI Design**: Owner indicator color/badge, house/hotel icons, and mortgage status banner are placed **outside** the tile bounds (positioned on the outer edges/badges) to prevent crowding inside the tile content.

---

## Detailed Task Breakdown

### 1. State Store Extensions (`[`gameStore.ts`](src/store/gameStore.ts:1)`)
- Add property state management:
  - `properties`: Record<number, { owner: string | null; houses: number; isMortgaged: boolean }> keyed by tile ID.
- Add actions:
  - `buyProperty(tileId: number)`: Deducts cash from player, assigns property owner.
  - `payRent(tileId: number, amount: number)`: Transfers rent cash between players.
  - `buildHouse(tileId: number)`: Verifies color group monopoly, evenly builds houses up to 5 (hotel).
  - `sellHouse(tileId: number)`: Sells a house/hotel back to bank for half cost.
  - `mortgageProperty(tileId: number)`: Verifies 0 houses across color group, mortgages property for half cost.
  - `unmortgageProperty(tileId: number)`: Unmortgages property, charging cost + 10% interest.

### 2. Rent Calculation Logic (`[`gameLogic.ts`](src/engine/gameLogic.ts:1)`)
- Implement comprehensive rent rules:
  - Base rent for standard properties.
  - Double rent if owner owns all properties in color group and no houses are built.
  - Scaled rent based on house count (1-4 houses, 5 for hotel).
  - Railroad rent based on number of railroads owned (25, 50, 100, 200).
  - Utility rent based on dice roll multiplier (4x or 10x) depending on utilities owned.
  - Check if property is mortgaged (0 rent) or owner is in jail (rent still collected).

### 3. UI Enhancements & Action Panels (`[`ActionPanel.tsx`](src/components/controls/ActionPanel.tsx:1)` & [`Tile.tsx`](src/components/board/Tile.tsx:1)`)
- **Tile Component**: Display owner indicator color/badge, house/hotel icons, and mortgage status banner **outside** the tile container.
- **Action Panel**:
  - Buy Property button when landing on unowned property with sufficient cash.
  - Property Portfolio view / management drawer for building/selling houses and mortgaging properties.

---

## Acceptance Criteria

> **Status: ✅ Complete** (verified against the codebase on 2026-08-15)
> Includes Phase 2 post-implementation feedback: buy-after-doubles rule, center-board floating money popups, prominent property management buttons, debt-resolution pause (mortgage / bankruptcy / forced bankruptcy), and winner detection with celebration modal.

- [x] Players can purchase unowned properties when landing on them if they have enough cash.
- [x] Landing on another player's property automatically deducts rent and credits the owner (owners collect rent even if in jail).
- [x] Players can build and sell houses/hotels on completed color groups with proper rent scaling.
- [x] Mortgaging is blocked if any property in the color group has houses, and requires selling houses first.
- [x] Tile UI cleanly renders external badges for owner colors, houses/hotels, and mortgaged status without clutter.
