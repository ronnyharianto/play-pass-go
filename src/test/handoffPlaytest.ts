// Module marker so this file is typechecked as a module, not a global script.
export {};

/**
 * Store-level playtest for the Pass & Play handoff flow.
 * Run with: npx tsx src/test/handoffPlaytest.ts
 */
// Shim localStorage BEFORE loading the store (zustand persist reads it).
(globalThis as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

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
  const get = () => useGameStore.getState();

  function freshGame(playerCount = 2): void {
    get().resetGame();
    for (let i = 0; i < playerCount; i++) {
      get().addPlayer(`P${i + 1}`, `T${i + 1}`);
    }
    get().startGame();
  }

  console.log('\n[1] Game start — no handoff overlay');
  freshGame(2);
  assert(get().gamePhase === 'playing', 'game is playing');
  assert(get().handoff === null, 'startGame leaves handoff null');
  assert(get().currentPlayerIndex === 0, 'game starts with player 0');

  console.log('\n[2] endTurn sets the handoff for the next player');
  get().endTurn();
  let s = get();
  assert(s.currentPlayerIndex === 1, 'turn advanced to player 1');
  assert(s.handoff !== null, 'handoff is set after endTurn');
  assert(s.handoff?.playerName === 'P2', `handoff names next player (got ${s.handoff?.playerName})`);
  assert(s.handoff?.playerId === s.players[1].id, 'handoff playerId matches next player');
  assert(s.hasRolled === false, 'next player has not rolled yet');
  assert(
    s.message.includes('P2') && s.message.includes('Roll'),
    `message invites P2 to roll (got "${s.message}")`
  );

  console.log('\n[3] Game is paused while the handoff is showing');
  s.rollDice();
  assert(get().isRolling === false, 'rollDice is blocked during handoff');
  get().startTrade();
  assert(get().trade === null, 'startTrade is blocked during handoff');
  get().startAuction(1);
  assert(get().auction === null, 'startAuction is blocked during handoff');
  get().endTurn();
  assert(get().currentPlayerIndex === 1, 'second endTurn is a no-op during handoff');

  console.log('\n[4] confirmHandoff dismisses the overlay and play resumes');
  get().confirmHandoff();
  assert(get().handoff === null, 'confirmHandoff clears the handoff');
  get().rollDice();
  assert(get().isRolling === true, 'rollDice works again after confirmHandoff');

  console.log('\n[5] Turn wraps around to player 0 with a fresh handoff');
  get().endTurn();
  s = get();
  assert(s.currentPlayerIndex === 0, 'turn wrapped back to player 0');
  assert(s.handoff?.playerName === 'P1', `handoff shows P1 again (got ${s.handoff?.playerName})`);
  get().confirmHandoff();

  console.log('\n[6] Bankrupt players are skipped when advancing turns');
  freshGame(3);
  // Mark P2 (index 1) bankrupt directly.
  useGameStore.setState((st) => ({
    players: st.players.map((p) =>
      p.id === st.players[1].id ? { ...p, isBankrupt: true } : p
    ),
  }));
  get().endTurn(); // P1 (idx 0) -> should skip bankrupt P2 -> P3 (idx 2)
  s = get();
  assert(s.currentPlayerIndex === 2, `endTurn skipped the bankrupt player (index ${s.currentPlayerIndex})`);
  assert(s.handoff?.playerName === 'P3', `handoff shows the active player (got ${s.handoff?.playerName})`);
  get().confirmHandoff();

  console.log('\n[7] resetGame clears the handoff');
  get().endTurn();
  assert(get().handoff !== null, 'handoff set before reset');
  get().resetGame();
  assert(get().handoff === null, 'resetGame clears handoff');
  assert(get().gamePhase === 'setup', 'game back to setup');

  console.log(failures === 0 ? '\nAll handoff tests passed ✅' : `\n${failures} test(s) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
