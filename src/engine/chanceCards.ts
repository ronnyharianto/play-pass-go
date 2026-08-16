import { BOARD_SPACES } from './boardData';

export interface PlayerPatch {
  cash?: number;
  position?: number;
  inJail?: boolean;
  jailTurns?: number;
  getOutOfJailCards?: number;
}

export interface StatePatch {
  players?: Array<{
    id: string;
    name: string;
    token: string;
    cash: number;
    position: number;
    inJail: boolean;
    jailTurns: number;
    isBankrupt: boolean;
    properties: number[];
    getOutOfJailCards: number;
  }>;
  properties?: Record<number, { owner: string | null; houses: number; isMortgaged: boolean }>;
  message?: string;
  freeParkingPot?: number;
  // Shortfall when a card's payment exceeds the player's cash. Non-zero
  // values trigger the debt-resolution flow (owed to the Free Parking pot).
  unpaidDebt?: number;
}

export interface ChanceCard {
  id: number;
  text: string;
  getStatePatch: (
    playerId: string,
    players: Array<{
      id: string;
      name: string;
      token: string;
      cash: number;
      position: number;
      inJail: boolean;
      jailTurns: number;
      isBankrupt: boolean;
      properties: number[];
      getOutOfJailCards: number;
    }>,
    props: Record<number, { owner: string | null; houses: number; isMortgaged: boolean }>,
    freeParkingPot: number,
  ) => StatePatch;
}

export const CHANCE_CARDS: ChanceCard[] = [
  {
    id: 1,
    text: 'Advance to Go (Collect $200)',
    getStatePatch: (playerId, players, _props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const passedGo = 0 < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: 0 }
          : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} advanced to GO${passedGo ? ' (+$200)' : ''}!`,
        freeParkingPot: pot,
      };
    },
  },
  {
    id: 2,
    text: 'Advance to Raspberry Row — {If you pass Go, collect $200}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const newPos = 24;
      const passedGo = newPos < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: newPos }
          : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} advanced to Raspberry Row${passedGo ? ' (passed GO!)' : ''}.`,
      };
    },
  },
  {
    id: 3,
    text: 'Advance to Cotton Candy — {If you pass Go, collect $200}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const newPos = 11;
      const passedGo = newPos < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: newPos }
          : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} advanced to Cotton Candy${passedGo ? ' (passed GO!)' : ''}.`,
      };
    },
  },
  {
    id: 4,
    text: 'Advance token to nearest Railroad — {If you pass Go, collect $200}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const railroadIds = BOARD_SPACES.filter((t) => t.type === 'railroad').map((t) => t.id);
      let nearest = railroadIds.find((r) => r > player.position);
      if (nearest === undefined) nearest = railroadIds[0];
      const passedGo = nearest < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: nearest }
          : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} advanced to nearest Railroad.`,
      };
    },
  },
  {
    id: 5,
    text: 'Advance token to nearest Utility — {If you pass Go, collect $200}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const utilityIds = BOARD_SPACES.filter((t) => t.type === 'utility').map((t) => t.id);
      let nearest = utilityIds.find((u) => u > player.position);
      if (nearest === undefined) nearest = utilityIds[0];
      const passedGo = nearest < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: nearest }
          : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} advanced to nearest Utility.`,
      };
    },
  },
  {
    id: 6,
    text: 'Bank pays you dividend of $50',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 50 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name ?? 'Player'} received a $50 dividend from the bank!` };
    },
  },
  {
    id: 7,
    text: 'You have been awarded a Get Out of Jail Free card!',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, getOutOfJailCards: (p.getOutOfJailCards || 0) + 1 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name ?? 'Player'} received a Get Out of Jail Free card!` };
    },
  },
  {
    id: 8,
    text: 'Go back 3 spaces',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const newPos = (player.position - 3 + 40) % 40;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, position: newPos } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        message: `${player.name} went back 3 spaces to ${BOARD_SPACES[newPos].name}.`,
      };
    },
  },
  {
    id: 9,
    text: 'Go to Jail! Do not pass GO, do not collect $200.',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p,
      ) as StatePatch['players'];
      return { players: updated, message: `${player.name} was sent to Jail!` };
    },
  },
  {
    id: 10,
    text: 'Make general repairs on all your property — {Pay $25 per house, $100 per hotel}',
    getStatePatch: (playerId, players, props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      let total = 0;
      for (const tileId of player.properties) {
        const prop = props[tileId];
        if (!prop) continue;
        total += prop.houses === 5 ? 100 : prop.houses * 25;
      }
      const paid = Math.min(player.cash, total);
      const unpaid = total - paid;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - paid } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        freeParkingPot: pot + paid,
        unpaidDebt: unpaid,
        message:
          unpaid > 0
            ? `${player.name} could only pay $${paid} of the $${total} in general repairs - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid $${total} in general repairs.`,
      };
    },
  },
  {
    id: 11,
    text: 'Pay poor tax of $15',
    getStatePatch: (playerId, players, _props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const paid = Math.min(player.cash, 15);
      const unpaid = 15 - paid;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - paid } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        freeParkingPot: pot + paid,
        unpaidDebt: unpaid,
        message:
          unpaid > 0
            ? `${player.name} could only pay $${paid} of the $15 poor tax - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid $15 in poor tax.`,
      };
    },
  },
  {
    id: 12,
    text: 'Take a trip to Candy Express — {If you pass GO, collect $200}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const newPos = 5;
      const passedGo = newPos < player.position;
      const updated = players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: newPos }
          : p,
      ) as StatePatch['players'];
      return { players: updated, message: `${player.name} traveled to Candy Express.` };
    },
  },
  {
    id: 13,
    text: 'Take a stroll on Midnight — {Advance to Midnight}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, position: 39 } : p,
      ) as StatePatch['players'];
      return { players: updated, message: `${player.name} strolled to Midnight!` };
    },
  },
  {
    id: 14,
    text: 'You have been elected Chairman of the Board — {Pay each player $50}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const others = players.filter((p) => p.id !== playerId && !p.isBankrupt);
      const snapshot: Array<{ id: string; name: string; token: string; cash: number; position: number; inJail: boolean; jailTurns: number; isBankrupt: boolean; properties: number[]; getOutOfJailCards: number }> = [...players];
      const myIdx = snapshot.findIndex((p) => p.id === playerId);
      const totalOwed = others.length * 50;
      const paid = Math.min(player.cash, totalOwed);
      if (myIdx !== -1 && totalOwed > 0) {
        snapshot[myIdx] = {
          ...snapshot[myIdx]!,
          cash: snapshot[myIdx]!.cash - paid,
        };
        // Distribute whatever was actually paid as evenly as possible -
        // no money is created when the payer cannot afford the full amount.
        const perPlayer = Math.floor(paid / others.length);
        let remainder = paid % others.length;
        for (const other of others) {
          const idx = snapshot.findIndex((p) => p.id === other.id);
          if (idx === -1) continue;
          const share = perPlayer + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          snapshot[idx] = {
            ...snapshot[idx]!,
            cash: snapshot[idx]!.cash + share,
          };
        }
      }
      return {
        players: snapshot,
        message:
          paid < totalOwed
            ? `${player.name} paid $${paid} of the $${totalOwed} owed as Chairman of the Board.`
            : `${player.name} paid $50 to each player as Chairman of the Board.`,
      };
    },
  },
  {
    id: 15,
    text: 'Your building loan matures — {Collect $150}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 150 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name ?? 'Player'}'s building loan matured (+$150)!` };
    },
  },
  {
    id: 16,
    text: 'You have won a crossword competition — {Collect $100}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 100 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name ?? 'Player'} won a crossword competition (+$100)!` };
    },
  },
];

export function shuffleChanceDeck(): ChanceCard[] {
  const deck = [...CHANCE_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
