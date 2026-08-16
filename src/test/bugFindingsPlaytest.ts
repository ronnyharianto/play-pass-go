// Module marker so this file is typechecked as a module, not a global script.
export {};

/**
 * Store-level verification of suspected bugs found in code review.
 * Run with: npx tsx src/test/bugFindingsPlaytest.ts
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
  const { CHANCE_CARDS } = await import('../engine/chanceCards');
  const get = () => useGameStore.getState();
  // Use the EXACT card text from the module to avoid encoding mismatches.
  const boardwalkCardText =
    CHANCE_CARDS.find((c) => c.text.includes('Midnight'))?.text ?? '';

  // ---------------------------------------------------------------
  console.log('\n[1] Card movement does NOT resolve the destination tile');
  // P1 owns Boardwalk (tile 39) with a hotel. P2 draws "Take a walk on the
  // Boardwalk". Expected (real Monopoly): P2 must pay rent for landing there.
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1, // make P2 the current player so the card applies to them
    players: s.players.map((p, i) =>
      i === 0
        ? { ...p, cash: 5000, properties: [39] }
        : { ...p, cash: 5000, position: 30 }
    ),
    properties: { 39: { owner: s.players[0].id, houses: 5, isMortgaged: false } },
  }));
  const p2CashBefore = get().players[1].cash;
  useGameStore.setState({ pendingCard: { type: 'chance', text: boardwalkCardText } });
  get().applyCardEffect();
  const p2 = get().players[1];
  console.log(`  (P2 moved to ${p2.position}, cash ${p2.cash} vs ${p2CashBefore} before)`);
  assert(p2.position === 39, 'P2 advanced to Boardwalk');
  assert(
    p2.cash < p2CashBefore,
    `P2 paid rent for landing on owned Boardwalk hotel (got cash ${p2.cash})`
  );

  // Official rule: the "nearest Railroad" card charges DOUBLE rent.
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  const rrCardText =
    CHANCE_CARDS.find((c) => c.text.includes('nearest Railroad'))?.text ?? '';
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1,
    players: s.players.map((p, i) =>
      i === 0
        ? { ...p, cash: 5000, properties: [5, 15, 25, 35] }
        : { ...p, cash: 5000, position: 20 }
    ),
    properties: {
      5: { owner: s.players[0].id, houses: 0, isMortgaged: false },
      15: { owner: s.players[0].id, houses: 0, isMortgaged: false },
      25: { owner: s.players[0].id, houses: 0, isMortgaged: false },
      35: { owner: s.players[0].id, houses: 0, isMortgaged: false },
    },
  }));
  const rrCashBefore = get().players[1].cash;
  useGameStore.setState({ pendingCard: { type: 'chance', text: rrCardText } });
  get().applyCardEffect();
  const rrPlayer = get().players[1];
  console.log(`  (RR card: P2 moved to ${rrPlayer.position}, paid $${rrCashBefore - rrPlayer.cash})`);
  assert(rrPlayer.position === 25, 'P2 advanced to the nearest Railroad (25)');
  assert(
    rrCashBefore - rrPlayer.cash === 400,
    `nearest-Railroad card charged DOUBLE rent ($400 for 4 railroads, got $${rrCashBefore - rrPlayer.cash})`
  );

  // Follow-up resolutions: Free Parking collect, card-to-card chain, Go To Jail.
  const back3Text =
    CHANCE_CARDS.find((c) => c.text.includes('Go back 3 spaces'))?.text ?? '';

  // Go back 3 spaces from 23 -> Free Parking (20): collect the pot.
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1,
    players: s.players.map((p, i) => (i === 1 ? { ...p, position: 23 } : p)),
    freeParkingPot: 150,
  }));
  const fpCashBefore = get().players[1].cash;
  useGameStore.setState({ pendingCard: { type: 'chance', text: back3Text } });
  get().applyCardEffect();
  const fpState = get();
  console.log(`  (Go back 3: P2 to ${fpState.players[1].position}, pot ${fpState.freeParkingPot})`);
  assert(fpState.players[1].position === 20, 'Go back 3 lands on Free Parking (20)');
  assert(
    fpState.players[1].cash === fpCashBefore + 150 && fpState.freeParkingPot === 0,
    'Free Parking pot was collected after the card move'
  );

  // Go back 3 spaces from 39 -> Chance (36): a follow-up card is drawn.
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1,
    players: s.players.map((p, i) => (i === 1 ? { ...p, position: 39 } : p)),
    chanceDeck: s.chanceDeck.length > 0 ? s.chanceDeck : [s.chanceDeck[0] ?? { id: 1, text: 'x', getStatePatch: () => ({}) }],
    freeParkingPot: 0,
  }));
  useGameStore.setState({ pendingCard: { type: 'chance', text: back3Text } });
  get().applyCardEffect();
  console.log(`  (Go back 3 from 39: P2 to ${get().players[1].position}, new card: ${get().pendingCard?.type ?? 'NONE'})`);
  assert(get().players[1].position === 36, 'Go back 3 from 39 lands on Chance (36)');
  assert(
    get().pendingCard?.type === 'chance',
    'landing on a card tile via card move draws a follow-up card'
  );
  useGameStore.setState({ pendingCard: null });

  // Go back 3 spaces from 33 -> Go To Jail (30): sent to jail, turn ends.
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1,
    players: s.players.map((p, i) => (i === 1 ? { ...p, position: 33 } : p)),
  }));
  useGameStore.setState({ pendingCard: { type: 'chance', text: back3Text } });
  get().applyCardEffect();
  const jailState = get();
  console.log(`  (Go back 3 from 33: P2 at ${jailState.players[1].position}, inJail: ${jailState.players[1].inJail}, hasRolled: ${jailState.hasRolled})`);
  assert(jailState.players[1].position === 10, 'Go back 3 from 33 lands on Go To Jail (30)');
  assert(jailState.players[1].inJail, 'player is sent to jail after the card move');
  assert(jailState.hasRolled === true, 'turn ends when sent to jail via card move');

  // ---------------------------------------------------------------
  console.log('\n[2] payDebt is capped at the remaining debt');
  // P1 owes $200 with $400 cash: "Pay All Cash" must pay exactly $200,
  // credit the pot exactly $200, and keep the $200 excess.
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, cash: 400, properties: [1] } : p
    ),
    properties: { 1: { owner: s.players[0].id, houses: 0, isMortgaged: false } },
    showDebtResolution: true,
    debtAmount: 200,
    debtOwedTo: 'pot',
  }));
  const potBefore = get().freeParkingPot;
  get().payDebt(get().players[0].cash); // UI passes the full cash amount
  const after = get();
  console.log(`  (P1 cash ${after.players[0].cash}, pot +${after.freeParkingPot - potBefore}, debt ${after.debtAmount})`);
  assert(
    after.freeParkingPot - potBefore === 200 && after.debtAmount === 0,
    'pot credited exactly the debt ($200), debt cleared'
  );
  assert(
    after.players[0].cash === 200,
    'excess cash is kept by the payer (no money created/vanish)'
  );

  // Partial payment leaves the remainder owed to the pot.
  useGameStore.setState({ showDebtResolution: true, debtAmount: 150, players: after.players.map((p, i) => (i === 0 ? { ...p, cash: 50 } : p)) });
  get().payDebt(50);
  const partial = get();
  assert(partial.debtAmount === 100, 'partial payment leaves $100 owed');
  assert(partial.showDebtResolution === true, 'debt overlay stays while debt remains');

  // ---------------------------------------------------------------
  console.log('\n[3] Exhausted card decks reshuffle instead of vanishing');
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState({ chanceDeck: [] });
  get().drawChanceCard();
  console.log(`  (pendingCard after draw from empty deck: ${JSON.stringify(get().pendingCard)})`);
  assert(
    get().pendingCard !== null,
    'drawing from an exhausted deck reshuffles and still produces a card'
  );
  assert(
    get().chanceDeck.length === 15,
    'deck was reshuffled (16 cards, 1 drawn)'
  );

  // ---------------------------------------------------------------
  console.log('\n[4] Rent shortfall pauses for debt resolution, assets go to the creditor');
  // P2 lands on P1's Boardwalk hotel ($2000 rent) with only $10 cash.
  // Expected: pay what you can, pause for debt resolution owed to P1, and on
  // bankruptcy transfer P2's assets to the creditor P1.
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    currentPlayerIndex: 1,
    players: s.players.map((p, i) =>
      i === 0
        ? { ...p, cash: 5000, properties: [39] }
        : { ...p, cash: 10, position: 38, properties: [3] }
    ),
    properties: {
      39: { owner: s.players[0].id, houses: 5, isMortgaged: false },
      3: { owner: s.players[1].id, houses: 0, isMortgaged: false },
    },
  }));
  get().processRentPayment(get().players[1], 1, get().players[0].id, 2000, 'Midnight', get().properties, 39);
  const s4 = get();
  console.log(`  (P2 bankrupt: ${s4.players[1].isBankrupt}, debt shown: ${s4.showDebtResolution}, owes $${s4.debtAmount} to ${s4.debtOwedTo === s4.players[0].id ? 'P1' : '?'}, P2 cash ${s4.players[1].cash}, P1 cash ${s4.players[0].cash})`);
  assert(s4.players[1].isBankrupt === false, 'no instant bankruptcy — debt resolution is offered first');
  assert(s4.showDebtResolution === true, 'debt-resolution overlay is shown');
  assert(s4.debtAmount === 1990, 'shortfall ($1990) recorded as the debt');
  assert(s4.debtOwedTo === s4.players[0].id, 'debt is owed to the creditor (P1)');
  assert(s4.players[1].cash === 0, 'P2 paid all available cash ($10)');
  assert(s4.players[0].cash === 5010, 'creditor received the partial payment');

  // P2 declares bankruptcy: P1 (creditor) receives P2's tile 3, and the game
  // ends with P1 as the winner (only active player left).
  get().declareBankruptcy();
  const s4b = get();
  console.log(`  (after bankruptcy: P2 bankrupt ${s4b.players[1].isBankrupt}, tile 3 owner ${s4b.properties[3].owner === s4b.players[0].id ? 'P1' : 'OTHER'}, phase ${s4b.gamePhase})`);
  assert(s4b.players[1].isBankrupt === true, 'P2 is bankrupt');
  assert(
    s4b.properties[3].owner === s4b.players[0].id,
    'creditor (P1) received the bankrupt player\'s property'
  );
  assert(s4b.gamePhase === 'ended', 'game ends when only one player remains');
  assert(s4b.winner?.winnerId === s4b.players[0].id, 'creditor is declared the winner');

  // ---------------------------------------------------------------
  console.log('\n[5] Even house building/selling within a color group');
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  useGameStore.setState((s) => ({
    players: s.players.map((p, i) =>
      i === 0 ? { ...p, cash: 5000, properties: [1, 3] } : p
    ),
    properties: {
      1: { owner: s.players[0].id, houses: 0, isMortgaged: false },
      3: { owner: s.players[0].id, houses: 0, isMortgaged: false },
    },
  }));
  get().buildHouse(1); // 1/1
  assert(get().properties[1].houses === 1, 'first house builds (even)');
  get().buildHouse(1); // would make 2 vs 0 -> blocked
  assert(get().properties[1].houses === 1, 'second house on the same property is blocked (uneven)');
  get().buildHouse(3); // 1/1
  assert(get().properties[3].houses === 1, 'partner property builds to match');
  get().sellHouse(3); // 0/1
  assert(get().properties[3].houses === 0, 'selling the higher property is allowed');
  get().sellHouse(3); // would make 0 vs 1 -> blocked
  assert(get().properties[3].houses === 0, 'selling below the partner is blocked (uneven)');

  // ---------------------------------------------------------------
  console.log('\n[6] Declined tile blocks buy-back after a no-sale auction');
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().startGame();
  assert(get().declinedTile === null, 'declinedTile starts null');
  get().startAuction(1);
  assert(get().declinedTile === 1, 'startAuction records the declined tile');
  // Simulate a no-sale auction (everyone passes).
  get().passAuction();
  get().passAuction();
  assert(get().auction === null, 'auction closed without a sale');
  assert(get().declinedTile === 1, 'declinedTile persists after the no-sale auction');
  get().endTurn();
  assert(get().declinedTile === null, 'endTurn clears the declined tile for the next turn');
  get().resetGame();
  assert(get().declinedTile === null, 'resetGame clears declinedTile');

  // ---------------------------------------------------------------
  console.log('\n[7] Bankruptcy advances the turn to the next active player');
  get().resetGame();
  get().addPlayer('P1', '🐶');
  get().addPlayer('P2', '🎩');
  get().addPlayer('P3', '🚗');
  get().startGame();
  useGameStore.setState({ currentPlayerIndex: 1 }); // P2 is current
  get().declareBankruptcy();
  const s7 = get();
  console.log(`  (P2 bankrupt ${s7.players[1].isBankrupt}, next index ${s7.currentPlayerIndex}, handoff: ${s7.handoff?.playerName ?? 'none'})`);
  assert(s7.players[1].isBankrupt === true, 'P2 is bankrupt');
  assert(s7.currentPlayerIndex === 2, 'turn advanced to P3 (next active player)');
  assert(s7.handoff?.playerName === 'P3', 'handoff names the next player');
  assert(s7.hasRolled === false, 'next player starts unrolled');
  assert(s7.gamePhase === 'playing', 'game continues with 2 players left');

  console.log(failures === 0 ? '\nAll bug-fix checks passed ✅' : `\n${failures} check(s) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
