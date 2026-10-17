// Module marker so this file is typechecked as a module, not a global script.
export {};

/**
 * Store-level playtest for the landing-page Game Settings feature.
 * Run with: npx tsx src/test/settingsPlaytest.ts
 */
// Shim localStorage BEFORE loading the store (zustand persist reads it).
(globalThis as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

import type { GameSettings } from '../engine/gameSettings';

let failures = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

async function main(): Promise<void> {
  const { useGameStore } = await import('../store/gameStore');
  const { CHANCE_CARDS } = await import('../engine/chanceCards');
  const { DEFAULT_GAME_SETTINGS, isDefaultGameSettings } = await import(
    '../engine/gameSettings'
  );
  const get = () => useGameStore.getState();

  /**
   * Applies rules to a game that is already running. startGame normally freezes
   * the lobby choice into `activeRules`; tests that need a rule to differ on an
   * in-progress game write that frozen shape directly. The lobby choice is kept
   * in sync so follow-up games behave identically.
   */
  const setSettings = (patch: Partial<GameSettings>): void => {
    useGameStore.setState((s) => ({
      settings: { ...s.settings, ...patch },
      activeRules: { ...s.activeRules, ...patch },
    }));
  };

  /** Writes ONLY the landing-page choice — what the settings panel edits. */
  const setLobbyChoice = (patch: Partial<GameSettings>): void => {
    useGameStore.setState((s) => ({ settings: { ...s.settings, ...patch } }));
  };

  /** Fresh 2-player game with the board parked in a known, quiet state. */
  const startPlayable = (): void => {
    get().resetGame();
    get().addPlayer('P1', '🚗');
    get().addPlayer('P2', '🎩');
    get().startGame();
    useGameStore.setState((s) => ({
      currentPlayerIndex: 0,
      handoff: null,
      trade: null,
      auction: null,
      declinedTile: null,
      showDebtResolution: false,
      debtAmount: 0,
      debtOwedTo: null,
      pendingCard: null,
      freeParkingPot: 0,
      properties: {},
      players: s.players.map((p) => ({
        ...p,
        position: 0,
        cash: 1500,
        properties: [],
        inJail: false,
        getOutOfJailCards: 0,
        isBankrupt: false,
      })),
    }));
  };

  // ---------------------------------------------------------------
  console.log('\n[1] Defaults, reset and the per-game rule snapshot');
  get().resetGame();
  assert(
    isDefaultGameSettings(get().settings),
    'a fresh session starts on classic rules (all features on)'
  );
  get().setSetting('auctions', false);
  assert(
    get().settings.auctions === false,
    'setSetting works on the landing page'
  );
  get().resetGame();
  assert(
    get().settings.auctions === false,
    'resetGame keeps the chosen settings for the next game'
  );
  get().resetSettings();
  assert(
    isDefaultGameSettings(get().settings),
    'resetSettings restores classic rules'
  );

  // The lobby choice is frozen into the game it starts, so the switches never
  // need to be locked: they always describe the NEXT game.
  get().resetGame();
  get().addPlayer('P1', '🚗');
  get().addPlayer('P2', '🎩');
  get().setSetting('trading', false);
  get().startGame();
  assert(get().gamePhase === 'playing', 'game is playing');
  assert(
    get().activeRules.trading === false,
    'the game runs with the rules chosen on the landing page'
  );
  get().setSetting('trading', true);
  assert(
    get().settings.trading === true,
    'the landing-page toggles stay editable while a game is running'
  );
  assert(
    get().activeRules.trading === false,
    'a running game keeps the rules it started with'
  );
  // Starting the next game picks the new choices up.
  get().resetGame();
  get().addPlayer('P1', '🚗');
  get().addPlayer('P2', '🎩');
  get().startGame();
  assert(
    get().activeRules.trading === true,
    'a new game uses the updated landing-page choices'
  );
  get().resetGame();
  get().resetSettings();
  assert(
    get().settings.trading === true &&
      get().activeRules.trading === true,
    'resetSettings and resetGame leave classic rules everywhere'
  );

  // ---------------------------------------------------------------
  console.log('\n[2] Auctions can be turned off');
  get().resetGame();
  get().setSetting('auctions', false);
  get().addPlayer('P1', '🚗');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    currentPlayerIndex: 0,
    hasRolled: true,
    declinedTile: null,
    properties: {},
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, position: 1, properties: [] } : p
    ),
  }));
  get().endTurn();
  assert(get().auction === null, 'auctions off: End Turn does not start an auction');
  assert(
    get().currentPlayerIndex === 1,
    'auctions off: the turn simply passes to the next player'
  );
  assert(
    get().handoff?.playerId === get().players[1].id,
    'auctions off: the normal Pass & Play handoff still happens'
  );

  // Control: with auctions on, the same position does start the auction.
  startPlayable();
  setSettings({ auctions: true });
  useGameStore.setState((s) => ({
    currentPlayerIndex: 0,
    handoff: null,
    hasRolled: true,
    declinedTile: null,
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, position: 1, properties: [] } : p
    ),
  }));
  get().endTurn();
  assert(get().auction !== null, 'auctions on: End Turn starts the auction (control)');
  assert(get().declinedTile === 1, 'auctions on: the declined tile is recorded');
  get().closeAuction();

  // Direct calls must be blocked too, not just the End Turn shortcut.
  useGameStore.setState({ handoff: null, declinedTile: null, auction: null });
  setSettings({ auctions: false });
  get().startAuction(1);
  assert(get().auction === null, 'auctions off: startAuction is a no-op');
  setSettings({ auctions: true });
  get().startAuction(1);
  assert(get().auction !== null, 'auctions on: startAuction still works (control)');
  get().closeAuction();

  // ---------------------------------------------------------------
  console.log('\n[3] Trading can be turned off');
  startPlayable();
  setSettings({ trading: false });
  get().startTrade();
  assert(get().trade === null, 'trading off: startTrade is a no-op');
  setSettings({ trading: true });
  get().startTrade();
  assert(get().trade !== null, 'trading on: startTrade still works (control)');
  get().closeTrade();

  // ---------------------------------------------------------------
  console.log('\n[4] Free Parking pot can be turned off');
  // Turning the rule off also clears any pot left over from a previous game.
  get().resetGame();
  useGameStore.setState({ freeParkingPot: 150 });
  get().setSetting('freeParking', false);
  assert(
    get().freeParkingPot === 0,
    'turning the pot off clears an existing pot'
  );

  // ...but a game already in progress keeps its pot and its rule.
  setLobbyChoice({ freeParking: true });
  startPlayable();
  useGameStore.setState({ freeParkingPot: 200 });
  setLobbyChoice({ freeParking: false });
  assert(
    get().freeParkingPot === 200 && get().activeRules.freeParking === true,
    'toggling the pot off mid-game leaves the running game (and its pot) alone'
  );

  // Tax: the paid amount never reaches the pot.
  startPlayable();
  setSettings({ freeParking: false });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, position: 4, cash: 1000 } : p
    ),
  }));
  get().resolveCardLanding(0);
  assert(get().players[0].cash === 800, 'pot off: Income Tax still costs $200');
  assert(get().freeParkingPot === 0, 'pot off: tax does not collect into the pot');

  // Control: with the pot on, the same tax feeds the pot.
  startPlayable();
  setSettings({ freeParking: true });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, position: 4, cash: 1000 } : p
    ),
  }));
  get().resolveCardLanding(0);
  assert(get().freeParkingPot === 200, 'pot on: tax collects $200 (control)');

  // Landing on Free Parking pays nothing while the rule is off.
  startPlayable();
  setSettings({ freeParking: false });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, position: 20, cash: 1000 } : p
    ),
  }));
  get().resolveCardLanding(0);
  assert(
    get().players[0].cash === 1000,
    'pot off: landing on Free Parking pays nothing'
  );

  // Card fees: the card's pot credit is ignored, and a shortfall is owed to
  // the bank rather than to a pot that no longer exists.
  const poorTaxText =
    CHANCE_CARDS.find((c) => c.text.includes('poor tax'))?.text ?? '';
  startPlayable();
  setSettings({ freeParking: false });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 1000 } : p)),
  }));
  useGameStore.setState({ pendingCard: { type: 'chance', text: poorTaxText } });
  get().applyCardEffect();
  assert(get().freeParkingPot === 0, 'pot off: card fees do not collect into the pot');
  assert(get().players[0].cash === 985, 'pot off: the $15 poor tax is still paid');

  startPlayable();
  setSettings({ freeParking: true });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 1000 } : p)),
  }));
  useGameStore.setState({ pendingCard: { type: 'chance', text: poorTaxText } });
  get().applyCardEffect();
  assert(get().freeParkingPot === 15, 'pot on: the $15 poor tax feeds the pot (control)');

  useGameStore.setState({ showDebtResolution: false, debtAmount: 0, debtOwedTo: null });
  startPlayable();
  setSettings({ freeParking: false });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 0 } : p)),
  }));
  useGameStore.setState({ pendingCard: { type: 'chance', text: poorTaxText } });
  get().applyCardEffect();
  const debtState = get();
  assert(debtState.showDebtResolution, 'pot off: an unaffordable card fee still pauses for debt');
  assert(
    (debtState.message.includes('the bank') &&
      !debtState.message.includes('Free Parking pot')) === true,
    `pot off: card debt is owed to the bank (message: ${debtState.message})`
  );
  assert(debtState.freeParkingPot === 0, 'pot off: a card shortfall does not appear in the pot');

  // Debt payments go to the bank instead of reviving the pot.
  useGameStore.setState({ showDebtResolution: false, debtAmount: 0, debtOwedTo: null });
  startPlayable();
  setSettings({ freeParking: false });
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) => (i === 0 ? { ...p, cash: 500 } : p)),
    showDebtResolution: true,
    debtAmount: 50,
    debtOwedTo: 'pot',
    freeParkingPot: 0,
  }));
  get().payDebt(50);
  assert(get().freeParkingPot === 0, 'pot off: paying pot debt does not credit the pot');
  assert(get().players[0].cash === 450, 'pot off: the debt payment still leaves the payer');
  assert(get().debtAmount === 0, 'pot off: the debt is cleared');

  // ---------------------------------------------------------------
  console.log('\n[5] Get Out of Jail Free cards can be turned off');
  get().resetGame();
  get().setSetting('jailFreeCards', false);
  get().addPlayer('P1', '🚗');
  get().addPlayer('P2', '🎩');
  get().startGame();
  assert(
    get().chanceDeck.length === 15 &&
      get().chanceDeck.every((c) => !c.grantsJailFreeCard),
    'jail-free off: the Chance deck ships without the jail-free card'
  );
  assert(
    get().communityChestDeck.length === 15 &&
      get().communityChestDeck.every((c) => !c.grantsJailFreeCard),
    'jail-free off: the Community Chest deck ships without the jail-free card'
  );

  // Reshuffling an empty deck must not sneak the card back in.
  useGameStore.setState({ chanceDeck: [] });
  get().drawChanceCard();
  assert(
    !get().pendingCard?.text.includes('Get Out of Jail Free') &&
      get().chanceDeck.every((c) => !c.grantsJailFreeCard),
    'jail-free off: a reshuffle still excludes the jail-free card'
  );
  useGameStore.setState({ pendingCard: null });

  // A stale save holding a card cannot spend it.
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, inJail: true, jailTurns: 1, getOutOfJailCards: 1 } : p
    ),
  }));
  get().useGetOutOfJailCard();
  assert(
    get().players[0].inJail && get().players[0].getOutOfJailCards === 1,
    'jail-free off: using a jail-free card is a no-op'
  );

  // Control: with the feature on, both decks hold exactly one such card and it
  // can be spent. (Settings must be on before the decks are built.)
  setSettings({ jailFreeCards: true });
  startPlayable();
  assert(
    get().chanceDeck.length === 16 &&
      get().chanceDeck.filter((c) => c.grantsJailFreeCard).length === 1 &&
      get().communityChestDeck.filter((c) => c.grantsJailFreeCard).length === 1,
    'jail-free on: each deck holds exactly one jail-free card (control)'
  );
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, inJail: true, jailTurns: 1, getOutOfJailCards: 1 } : p
    ),
  }));
  get().useGetOutOfJailCard();
  assert(
    !get().players[0].inJail && get().players[0].getOutOfJailCards === 0,
    'jail-free on: the card still frees the player (control)'
  );

  // ---------------------------------------------------------------
  console.log('\n[6] Core rules are not gated by settings');
  get().resetGame();
  get().resetSettings();
  assert(
    Object.keys(get().settings).length ===
      Object.keys(DEFAULT_GAME_SETTINGS).length &&
      !('buildings' in get().settings) &&
      !('mortgages' in get().settings),
    'settings only cover auctions, trading, Free Parking and jail-free cards'
  );

  console.log(
    failures === 0
      ? '\nAll settings checks passed ✅'
      : `\n${failures} check(s) FAILED ❌`
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
