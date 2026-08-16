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

export interface CommunityChestCard {
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

export const COMMUNITY_CHEST_CARDS: CommunityChestCard[] = [
  {
    id: 1,
    text: 'Advance to Go (Collect $200)',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const passedGo = 0 < player.position;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + (passedGo ? 200 : 0), position: 0 } : p,
      ) as StatePatch['players'];
      return { players: updated, message: `${player.name} advanced to GO!` };
    },
  },
  {
    id: 2,
    text: 'Bank error in your favor — {Collect $200}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 200 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} collected $200 from a bank error!` };
    },
  },
  {
    id: 3,
    text: "Doctor's fee — {Pay $50}",
    getStatePatch: (playerId, players, _props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const paid = Math.min(player.cash, 50);
      const unpaid = 50 - paid;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - paid } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        freeParkingPot: pot + paid,
        unpaidDebt: unpaid,
        message:
          unpaid > 0
            ? `${player.name} could only pay $${paid} of the $50 doctor's fee - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid a $50 doctor's fee.`,
      };
    },
  },
  {
    id: 4,
    text: 'It is your birthday — {Collect $10 from each player}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const others = players.filter((p) => p.id !== playerId && !p.isBankrupt);
      const snapshot: Array<{ id: string; name: string; token: string; cash: number; position: number; inJail: boolean; jailTurns: number; isBankrupt: boolean; properties: number[]; getOutOfJailCards: number }> = [...players];
      const myIdx = snapshot.findIndex((p) => p.id === playerId);
      let collected = 0;
      if (myIdx !== -1) {
        // Collect $10 from each other player, limited to what each can
        // actually afford - no money is created, nobody goes negative.
        for (const other of others) {
          const idx = snapshot.findIndex((p) => p.id === other.id);
          if (idx === -1) continue;
          const contribution = Math.min(snapshot[idx]!.cash, 10);
          if (contribution > 0) {
            snapshot[idx] = {
              ...snapshot[idx]!,
              cash: snapshot[idx]!.cash - contribution,
            };
            collected += contribution;
          }
        }
        snapshot[myIdx] = {
          ...snapshot[myIdx]!,
          cash: snapshot[myIdx]!.cash + collected,
        };
      }
      return {
        players: snapshot,
        message:
          collected > 0
            ? `${player.name} collected $${collected} for their birthday!`
            : `${player.name}'s birthday - but no one could contribute!`,
      };
    },
  },
  {
    id: 5,
    text: 'Grand Opera Night — {Collect $50 from every player for a concert ticket}',
    getStatePatch: (playerId, players) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const others = players.filter((p) => p.id !== playerId && !p.isBankrupt);
      const snapshot: Array<{ id: string; name: string; token: string; cash: number; position: number; inJail: boolean; jailTurns: number; isBankrupt: boolean; properties: number[]; getOutOfJailCards: number }> = [...players];
      const myIdx = snapshot.findIndex((p) => p.id === playerId);
      let collected = 0;
      if (myIdx !== -1) {
        // Collect $50 from each other player, limited to what each can
        // actually afford - no money is created, nobody goes negative.
        for (const other of others) {
          const idx = snapshot.findIndex((p) => p.id === other.id);
          if (idx === -1) continue;
          const contribution = Math.min(snapshot[idx]!.cash, 50);
          if (contribution > 0) {
            snapshot[idx] = {
              ...snapshot[idx]!,
              cash: snapshot[idx]!.cash - contribution,
            };
            collected += contribution;
          }
        }
        snapshot[myIdx] = {
          ...snapshot[myIdx]!,
          cash: snapshot[myIdx]!.cash + collected,
        };
      }
      return {
        players: snapshot,
        message:
          collected > 0
            ? `${player.name} collected $${collected} for an opera night!`
            : `${player.name}'s opera night - but no one could contribute!`,
      };
    },
  },
  {
    id: 6,
    text: 'Income Tax refund — {Collect $20}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 20 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} received a $20 income tax refund!` };
    },
  },
  {
    id: 7,
    text: 'Life insurance matures — {Collect $100}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 100 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name}'s life insurance matured — collected $100!` };
    },
  },
  {
    id: 8,
    text: 'Pay hospital fees of $100',
    getStatePatch: (playerId, players, _props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const paid = Math.min(player.cash, 100);
      const unpaid = 100 - paid;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - paid } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        freeParkingPot: pot + paid,
        unpaidDebt: unpaid,
        message:
          unpaid > 0
            ? `${player.name} could only pay $${paid} of the $100 in hospital fees - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid $100 in hospital fees.`,
      };
    },
  },
  {
    id: 9,
    text: 'Pay school fees of $150',
    getStatePatch: (playerId, players, _props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      const paid = Math.min(player.cash, 150);
      const unpaid = 150 - paid;
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - paid } : p,
      ) as StatePatch['players'];
      return {
        players: updated,
        freeParkingPot: pot + paid,
        unpaidDebt: unpaid,
        message:
          unpaid > 0
            ? `${player.name} could only pay $${paid} of the $150 in school fees - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid $150 in school fees.`,
      };
    },
  },
  {
    id: 10,
    text: 'You have won second prize in a beauty contest — {Collect $10}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 10 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} won $10 in a beauty contest!` };
    },
  },
  {
    id: 11,
    text: 'You inherit $100',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 100 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} inherited $100!` };
    },
  },
  {
    id: 12,
    text: 'You have been awarded a Get Out of Jail Free card!',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, getOutOfJailCards: (p.getOutOfJailCards || 0) + 1 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} received a Get Out of Jail Free card!` };
    },
  },
  {
    id: 13,
    text: 'Go directly to Jail — {Do not pass GO, do not collect $200}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name} was sent directly to Jail!` };
    },
  },
  {
    id: 14,
    text: 'Holiday fund matures — {Collect $100}',
    getStatePatch: (playerId, players) => {
      const updated = players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + 100 } : p,
      ) as StatePatch['players'];
      const player = players.find((p) => p.id === playerId);
      return { players: updated, message: `${player?.name}'s holiday fund matured — collected $100!` };
    },
  },
  {
    id: 15,
    text: 'Pay street repairs — {For each house pay $40, for each hotel pay $115}',
    getStatePatch: (playerId, players, props, pot) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return {};
      let total = 0;
      for (const tileId of player.properties) {
        const prop = props[tileId];
        if (!prop) continue;
        total += prop.houses === 5 ? 115 : prop.houses * 40;
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
            ? `${player.name} could only pay $${paid} of the $${total} in street repairs - $${unpaid} is owed to the Free Parking pot.`
            : `${player.name} paid $${total} in street repairs.`,
      };
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
      return { players: updated, message: `${player?.name} won a crossword competition (+$100)!` };
    },
  },
];

export function shuffleCommunityChestDeck(): CommunityChestCard[] {
  const deck = [...COMMUNITY_CHEST_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
