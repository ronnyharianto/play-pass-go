// Module marker so this file is typechecked as a module, not a global script.
export {};

/**
 * Persistence playtest for the Game Settings feature — simulates a page refresh
 * (zustand persist rehydration) and the two saves that can exist in the wild:
 *
 *  1. a save written BEFORE the feature existed (no `settings` key), and
 *  2. a save with optional features turned off.
 *
 * Run with: npx tsx src/test/settingsPersistencePlaytest.ts
 */
// zustand's default persist storage is createJSONStorage(() => window.localStorage),
// so the shim must provide window.localStorage (not just localStorage) for
// rehydration to run at all.
let savedState: Record<string, unknown> = {};

const fakeLocalStorage = {
  getItem: (key: string) =>
    key.includes('monopoly')
      ? JSON.stringify({ state: savedState, version: 0 })
      : null,
  setItem: () => {},
  removeItem: () => {},
};

(globalThis as Record<string, unknown>).window = {
  localStorage: fakeLocalStorage,
};
(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage;

let failures = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

/**
 * A stored game state, plus whatever `settings` (lobby choice) and
 * `activeRules` (rules the running game froze) the scenario needs.
 */
function buildSave(
  settings?: Record<string, boolean>,
  activeRules?: Record<string, boolean>
): Record<string, unknown> {
  return {
    gamePhase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    dice: [1, 1],
    hasRolled: false,
    consecutiveDoubles: 0,
    message: 'HYDRATED FROM STORAGE',
    properties: {},
    transactionPopup: null,
    winner: null,
    showDebtResolution: false,
    debtAmount: 0,
    debtOwedTo: null,
    chanceDeck: [],
    communityChestDeck: [],
    pendingCard: null,
    freeParkingPot: 0,
    trade: null,
    auction: null,
    handoff: null,
    declinedTile: null,
    ...(settings ? { settings } : {}),
    ...(activeRules ? { activeRules } : {}),
  };
}

async function main(): Promise<void> {
  // Start with a save from before the settings feature existed.
  savedState = buildSave();

  const { useGameStore } = await import('../store/gameStore');
  const get = () => useGameStore.getState();

  console.log('\n[1] A pre-settings save hydrates to classic rules');
  assert(
    get().message === 'HYDRATED FROM STORAGE',
    'the saved game was actually rehydrated (message came from storage)'
  );
  assert(
    get().settings.auctions === true &&
      get().settings.trading === true &&
      get().settings.freeParking === true &&
      get().settings.jailFreeCards === true,
    'a save with no settings key falls back to classic defaults (no migration needed)'
  );
  assert(
    get().activeRules.auctions === true &&
      get().activeRules.trading === true &&
      get().activeRules.freeParking === true &&
      get().activeRules.jailFreeCards === true,
    'the running game\'s frozen rules also default to classic'
  );

  console.log('\n[2] Disabled features survive a refresh');
  // Simulate a reload with all four features turned off.
  const allOff = {
    auctions: false,
    trading: false,
    freeParking: false,
    jailFreeCards: false,
  };
  savedState = buildSave(allOff, allOff);
  await useGameStore.persist.rehydrate();

  assert(
    get().settings.auctions === false &&
      get().settings.trading === false &&
      get().settings.freeParking === false &&
      get().settings.jailFreeCards === false,
    'the stored settings are restored on refresh (rules stay off)'
  );
  assert(
    get().activeRules.auctions === false &&
      get().activeRules.trading === false &&
      get().activeRules.freeParking === false &&
      get().activeRules.jailFreeCards === false,
    'the running game still plays by the rules it was started with'
  );

  console.log('\n[3] Partial saves merge with defaults');
  // A save that stores only one key still gets the remaining defaults. This is
  // what a save written before a NEW toggle is added looks like.
  savedState = buildSave({ auctions: false }, { trading: false });
  await useGameStore.persist.rehydrate();

  assert(
    get().settings.auctions === false &&
      get().settings.trading === true &&
      get().settings.freeParking === true &&
      get().settings.jailFreeCards === true,
    'a partial settings object restores the saved key and defaults the rest'
  );
  assert(
    get().activeRules.trading === false &&
      get().activeRules.auctions === true &&
      get().activeRules.freeParking === true &&
      get().activeRules.jailFreeCards === true,
    'a partial activeRules object restores the saved key and defaults the rest'
  );

  console.log(
    failures === 0
      ? '\nAll persistence checks passed ✅'
      : `\n${failures} check(s) FAILED ❌`
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
