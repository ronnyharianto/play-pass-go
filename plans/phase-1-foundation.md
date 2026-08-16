# Phase 1: Core Foundation & Board UI - Implementation Plan

## Overview
Phase 1 establishes the foundational project infrastructure, Next.js application setup, global state store with Zustand, the standard 40-space Monopoly board layout using CSS Grid, player setup and token selection, and basic dice roll & token movement mechanics.

---

## Detailed Task Breakdown

### 1. Project Initialization & Dependencies
- Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
- Install essential packages: `lucide-react`, `zustand`, `framer-motion`, `clsx`, `tailwind-merge`.
- Configure Tailwind CSS custom styles for Monopoly property color groups (Brown, Light Blue, Pink, Orange, Red, Yellow, Green, Dark Blue, Railroad, Utility).

### 2. Game Data & Board Definition (`src/engine/boardData.ts`)
- Define the 40 standard US Monopoly board spaces in exact order (0 = GO, 1 = Mediterranean Ave, ..., 39 = Boardwalk).
- Each tile object includes: `id`, `name`, `type` (property, railroad, utility, tax, chance, community_chest, jail, go_to_jail, free_parking, go), `cost`, `rent`, `colorGroup`.

### 3. Global State Store (`src/store/gameStore.ts`)
- Zustand store holding:
  - `players`: Array of players (`id`, `name`, `token`, `cash`, `position`, `inJail`, `jailTurns`, `getOutOfJailCards`, `isBankrupt`).
  - `currentPlayerIndex`: Active player turn tracker.
  - `dice`: `{ die1, die2, isRolling }`.
  - `gamePhase`: `'setup' | 'playing' | 'ended'`.
- Actions: `addPlayer`, `startGame`, `rollDice`, `movePlayer`, `nextTurn`.

### 4. Player Setup & Lobby UI (`src/app/page.tsx`)
- Clean, responsive lobby screen for 2-4 players.
- Input fields for player names and token selection (Car, Hat, Dog, Thimble, Boot, Battleship, Cat, Dinosaur).
- Start Game button validating minimum 2 players.

### 5. Game Board & Controls UI (`src/app/game/page.tsx`, `src/components/board/`)
- **Board Component**: CSS Grid layout (11x11 grid) rendering corner spaces and perimeter tiles correctly.
- **Tile Component**: Displays tile name, cost, color banner, and player tokens currently on that space.
- **Player HUD & Controls**: Shows current player cash, properties, dice rolling controls, and "End Turn" button.

---

## Acceptance Criteria

> **Status: ✅ Complete** (verified against the codebase on 2026-08-15)

- [x] Next.js app runs successfully and renders player setup screen.
- [x] Users can add 2-4 players with distinct tokens and names.
- [x] Clicking "Start Game" transitions to the 40-space Monopoly board.
- [x] Board accurately renders all 40 standard spaces in a classic ring layout.
- [x] Players can roll dice and tokens move across the board spaces accordingly.
- [x] Turn passes correctly between players.
