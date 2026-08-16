import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BOARD_SPACES } from '../engine/boardData';
import {
  PropertiesMap,
  calculateRent,
  hasCompleteColorGroup,
  colorGroupHasBuildings,
} from '../engine/gameLogic';
import {
  CHANCE_CARDS,
  shuffleChanceDeck,
  StatePatch as ChanceStatePatch,
} from '../engine/chanceCards';
import {
  COMMUNITY_CHEST_CARDS,
  shuffleCommunityChestDeck,
  StatePatch as ChestStatePatch,
} from '../engine/communityChestCards';
import { playSound, initSounds } from '../utils/sounds';

initSounds();

export interface Player {
  id: string;
  name: string;
  token: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  isBankrupt: boolean;
  properties: number[]; // tile IDs owned
  getOutOfJailCards: number;
}

export interface TransactionPopup {
  id: number;
  text: string;
  type: 'gain' | 'lose';
}

export interface GameWinner {
  winnerId: string;
  winnerName: string;
  winnerToken: string;
  reason: string;
}

export interface TradeState {
  phase: 'proposing' | 'review';
  fromId: string; // proposer (must be the current player)
  toId: string | null; // target player (chosen during proposing)
  offerProps: number[]; // tile ids the proposer gives away
  requestProps: number[]; // tile ids the proposer receives
  offerCash: number; // cash the proposer gives
  requestCash: number; // cash the proposer receives
}

export interface AuctionState {
  tileId: number;
  currentBid: number;
  highestBidderId: string | null;
  activeBidders: string[]; // player ids still in the auction
  passedBidders: string[]; // player ids that passed
  currentBidderIndex: number;
  phase: 'bidding' | 'won';
  winnerId: string | null;
  finalBid: number;
}

interface GameState {
  gamePhase: 'setup' | 'playing' | 'ended';
  players: Player[];
  currentPlayerIndex: number;
  dice: [number, number];
  // Dev-only: when set, the next rollDice uses these values instead of random.
  manualDice: [number, number] | null;
  isRolling: boolean;
  isMoving: boolean;
  movingPlayerId: string | null;
  movingStep: number;
  hasRolled: boolean;
  consecutiveDoubles: number;
  message: string;
  properties: PropertiesMap;
  transactionPopup: TransactionPopup | null;
  winner: GameWinner | null;
  showDebtResolution: boolean;
  debtAmount: number;
  debtOwedTo: string | null; // owner player id

  // Card system
  chanceDeck: typeof CHANCE_CARDS;
  communityChestDeck: typeof COMMUNITY_CHEST_CARDS;
  pendingCard: { type: 'chance' | 'community_chest'; text: string } | null;
  freeParkingPot: number;

  // Trading & Auction
  trade: TradeState | null;
  auction: AuctionState | null;

  // Pass & Play handoff (full-screen overlay that hides the board between turns)
  handoff: { playerId: string; playerName: string; token: string } | null;

  // Tile the current player declined to buy this turn (auctioned, no sale).
  // Blocks the Buy / Decline & Auction buttons until the next roll or turn.
  declinedTile: number | null;

  // Actions
  addPlayer: (name: string, token: string) => void;
  removePlayer: (id: string) => void;
  startGame: () => void;
  rollDice: () => void;
  setManualDice: (dice: [number, number] | null) => void;
  endTurn: () => void;
  resetGame: () => void;
  buyProperty: (tileId: number) => void;
  buildHouse: (tileId: number) => void;
  sellHouse: (tileId: number) => void;
  mortgageProperty: (tileId: number) => void;
  unmortgageProperty: (tileId: number) => void;
  triggerPopup: (text: string, type: 'gain' | 'lose') => void;
  declareBankruptcy: () => void;
  payDebt: (amount: number) => void;
  drawChanceCard: () => void;
  drawCommunityChestCard: () => void;
  applyCardEffect: () => void;
  useGetOutOfJailCard: () => void;
  payBail: () => void;
  processRentPayment: (
    payer: Player,
    payerIndex: number,
    ownerId: string,
    rent: number,
    tileName: string,
    currentProps: PropertiesMap,
    payerPosition?: number
  ) => void;
  startTrade: () => void;
  sendTradeOffer: (offer: {
    toId: string;
    offerProps: number[];
    requestProps: number[];
    offerCash: number;
    requestCash: number;
  }) => void;
  acceptTrade: () => void;
  declineTrade: () => void;
  closeTrade: () => void;
  startAuction: (tileId: number) => void;
  submitBid: (amount: number) => void;
  passAuction: () => void;
  closeAuction: () => void;
  confirmHandoff: () => void;
  resolveCardLanding: (playerIndex: number, doubleRailroadRent?: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
    gamePhase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    dice: [1, 1],
    manualDice: null,
    isRolling: false,
    isMoving: false,
    movingPlayerId: null,
    movingStep: 0,
    hasRolled: false,
    consecutiveDoubles: 0,
    message: 'Welcome to Play, Pass & Go! Setup players to begin.',
    properties: {},
    transactionPopup: null,
    winner: null,
    showDebtResolution: false,
    debtAmount: 0,
    debtOwedTo: null,
    chanceDeck: [] as typeof CHANCE_CARDS,
    communityChestDeck: [] as typeof COMMUNITY_CHEST_CARDS,
    pendingCard: null as { type: 'chance' | 'community_chest'; text: string } | null,
    freeParkingPot: 0,
    trade: null,
    auction: null,
    handoff: null,
    declinedTile: null,
  
    triggerPopup: (text, type) => {
        set({ transactionPopup: { id: Date.now(), text, type } });
        setTimeout(() => {
          if (get().transactionPopup?.id) {
            set({ transactionPopup: null });
          }
        }, 2500);
      },

      addPlayer: (name, token) => {
        const { players } = get();
        if (players.length >= 4) return;
        if (players.some((p) => p.token === token)) return;
        set({
          players: [
            ...players,
            {
              id: Math.random().toString(36).substring(2, 9),
              // Cap at 12 chars so names fit the board owner badges.
              name: (name.trim() || `Player ${players.length + 1}`).slice(0, 12),
              token,
              cash: 1500,
              position: 0,
              inJail: false,
              jailTurns: 0,
              isBankrupt: false,
              properties: [],
              getOutOfJailCards: 0,
            },
          ],
        });
      },

      removePlayer: (id) => {
        set({ players: get().players.filter((p) => p.id !== id) });
      },

      startGame: () => {
        const { players } = get();
        if (players.length < 2) return;
        // Save players to preserve them after reset
        const savedPlayers = players.map((player) => ({
          ...player,
          cash: 1500,
          position: 0,
          inJail: false,
          jailTurns: 0,
          isBankrupt: false,
          properties: [],
          getOutOfJailCards: 0,
        }));
        get().resetGame();
        playSound('start');
        set({
          gamePhase: 'playing',
          players: savedPlayers,
          currentPlayerIndex: 0,
          hasRolled: false,
          chanceDeck: shuffleChanceDeck(),
          communityChestDeck: shuffleCommunityChestDeck(),
          pendingCard: null,
          freeParkingPot: 0,
          trade: null,
          auction: null,
          handoff: null,
          declinedTile: null,
          consecutiveDoubles: 0,
          message: `${savedPlayers[0].name}'s turn. Roll the dice!`,
          properties: {},
          transactionPopup: null,
          winner: null,
          showDebtResolution: false,
          debtAmount: 0,
          debtOwedTo: null,
        });
      },

      processRentPayment: (
        payer,
        payerIndex,
        ownerId,
        rent,
        tileName,
        currentProps,
        payerPosition
      ) => {
        const { players } = get();
        const updatedPlayers = [...players];
        const ownerIndex = updatedPlayers.findIndex((p) => p.id === ownerId);
        const ownerName =
          ownerIndex !== -1 ? updatedPlayers[ownerIndex].name : 'the bank';

        const payerCash = updatedPlayers[payerIndex].cash;
        const paid = Math.min(payerCash, rent);
        const unpaid = rent - paid;
        updatedPlayers[payerIndex] = {
          ...updatedPlayers[payerIndex],
          cash: payerCash - paid,
          position:
            payerPosition !== undefined
              ? payerPosition
              : updatedPlayers[payerIndex].position,
        };

        if (ownerIndex !== -1 && paid > 0) {
          updatedPlayers[ownerIndex] = {
            ...updatedPlayers[ownerIndex],
            cash: updatedPlayers[ownerIndex].cash + paid,
          };
        }

        get().triggerPopup(`-$${paid} Rent`, 'lose');
        playSound('pay');

        if (unpaid > 0) {
          // The payer cannot afford the full rent — pause for debt resolution
          // (mortgage / sell / declare bankruptcy) instead of forcing instant
          // bankruptcy. The shortfall is owed to the property owner (creditor).
          set({
            players: updatedPlayers,
            showDebtResolution: true,
            debtAmount: unpaid,
            debtOwedTo: ownerId,
            message: `${payer.name} could not afford the full $${rent} rent on ${tileName} - $${unpaid} is still owed to ${ownerName}.`,
          });
          return;
        }

        set({
          players: updatedPlayers,
          message: `${payer.name} landed on ${tileName} owned by ${ownerName} and paid $${rent} rent.`,
        });
      },

      rollDice: () => {
        const {
          isRolling,
          isMoving,
          hasRolled,
          players,
          currentPlayerIndex,
          consecutiveDoubles,
          showDebtResolution,
          trade,
          auction,
          handoff,
        } = get();
        if (isRolling || isMoving || hasRolled) return;
        if (showDebtResolution) return;
        if (trade || auction || handoff) return;

        const player = players[currentPlayerIndex];
        if (player.isBankrupt) {
          get().endTurn();
          return;
        }

        playSound('dice');
        // A new roll means a fresh landing — the declined tile (if any) no
        // longer blocks buying/auctioning.
        set({ isRolling: true, declinedTile: null });

        setTimeout(() => {
          // Dev-only manual dice override (consumed on this roll, then reset).
          const manual = get().manualDice;
          let d1: number;
          let d2: number;
          if (manual) {
            [d1, d2] = manual;
            set({ manualDice: null });
          } else {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
          }
          const total = d1 + d2;
          const isDoubles = d1 === d2;

          const newDoubles = isDoubles ? consecutiveDoubles + 1 : 0;

          if (player.inJail) {
            if (isDoubles) {
              const updatedPlayers = [...players];
              updatedPlayers[currentPlayerIndex] = {
                ...player,
                inJail: false,
                jailTurns: 0,
              };
              playSound('gain');
              set({
                dice: [d1, d2],
                isRolling: false,
                hasRolled: false,
                players: updatedPlayers,
                message: `${player.name} rolled doubles (${d1}, ${d2}) and escaped from Jail! Roll again or take actions.`,
              });
              return;
            } else {
              const newJailTurns = player.jailTurns + 1;
              if (newJailTurns >= 3 && player.cash >= 50) {
                const updatedPlayers = [...players];
                updatedPlayers[currentPlayerIndex] = {
                  ...player,
                  cash: player.cash - 50,
                  inJail: false,
                  jailTurns: 0,
                };
                get().triggerPopup('-$50 Bail', 'lose');
                playSound('bail');
                set({
                  dice: [d1, d2],
                  isRolling: false,
                  hasRolled: true,
                  players: updatedPlayers,
                  message: `${player.name} paid $50 bail after 3 turns and stays in place.`,
                });
                return;
              }
              if (newJailTurns >= 3) {
                // Forced bail on the 3rd jail turn, but the player cannot
                // afford it (cash < $50) -> declare bankruptcy instead of
                // leaving them soft-locked in jail forever. declareBankruptcy
                // advances the turn to the next active player (with handoff).
                get().declareBankruptcy();
                set({
                  dice: [d1, d2],
                  isRolling: false,
                  message: `${player.name} could not afford the $50 bail and has been declared bankrupt!`,
                });
                return;
              }
              const updatedPlayers = [...players];
              updatedPlayers[currentPlayerIndex] = {
                ...player,
                jailTurns: newJailTurns,
              };
              set({
                dice: [d1, d2],
                isRolling: false,
                hasRolled: true,
                players: updatedPlayers,
                message: `${player.name} remains in Jail (${newJailTurns}/3).`,
              });
              return;
            }
          }

          if (newDoubles === 3) {
            const updatedPlayers = [...players];
            updatedPlayers[currentPlayerIndex] = {
              ...player,
              position: 10,
              inJail: true,
            };
            playSound('jail');
            set({
              dice: [d1, d2],
              isRolling: false,
              hasRolled: true,
              consecutiveDoubles: 0,
              players: updatedPlayers,
              message: `${player.name} rolled 3 doubles in a row and went straight to Jail!`,
            });
            return;
          }

          const startPos = player.position;
          set({
            dice: [d1, d2],
            isRolling: false,
            isMoving: true,
          });

          let step = 0;
          const stepInterval = 220;

          set({
            isMoving: true,
            movingPlayerId: player.id,
            movingStep: 0,
          });

          const advance = () => {
            step += 1;
            const nextPos = (startPos + step) % 40;
            const current = get().players;
            const updated = [...current];
            updated[currentPlayerIndex] = {
              ...current[currentPlayerIndex],
              position: nextPos,
            };

            if (nextPos === 0) {
              updated[currentPlayerIndex] = {
                ...updated[currentPlayerIndex],
                cash: updated[currentPlayerIndex].cash + 200,
              };
              get().triggerPopup('+$200 Pass GO', 'gain');
              playSound('gain');
            }

            if (step < total) {
              set({ players: updated, movingStep: step });
              setTimeout(advance, stepInterval);
            } else {
              const landedTile = BOARD_SPACES[nextPos];
              const currentProps = get().properties;
              let updatedMessage = `${player.name} rolled ${d1} & ${d2} (${total}) and landed on ${landedTile.name}.`;
              let sentToJail = false;

              if (landedTile.type === 'goto_jail') {
                updated[currentPlayerIndex] = {
                  ...updated[currentPlayerIndex],
                  position: 10,
                  inJail: true,
                };
                sentToJail = true;
                updatedMessage = `${player.name} landed on Go To Jail and was sent to Jail!`;
                playSound('jail');
              } else if (landedTile.type === 'tax') {
                const taxAmount = landedTile.name.includes('Income')
                  ? 200
                  : 100;
                const currentCash = updated[currentPlayerIndex].cash;
                const paid = Math.min(currentCash, taxAmount);
                const unpaid = taxAmount - paid;
                updated[currentPlayerIndex] = {
                  ...updated[currentPlayerIndex],
                  cash: currentCash - paid,
                };
                // Only the actually-paid portion goes into the Free Parking pot
                set((s) => ({ freeParkingPot: s.freeParkingPot + paid }));
                if (paid > 0) {
                  get().triggerPopup(`-$${paid} Tax`, 'lose');
                  playSound('pay');
                }
                if (unpaid > 0) {
                  // Cannot afford the full tax - pause for debt resolution
                  // instead of silently clamping cash to 0.
                  set({
                    players: updated,
                    isMoving: false,
                    movingPlayerId: null,
                    movingStep: step,
                    hasRolled: !isDoubles,
                    consecutiveDoubles: isDoubles ? newDoubles : 0,
                    showDebtResolution: true,
                    debtAmount: unpaid,
                    debtOwedTo: 'pot',
                    message: `${player.name} could not afford the full ${landedTile.name} - $${unpaid} is still owed to the Free Parking pot.`,
                  });
                  return;
                }
                updatedMessage = `${player.name} paid $${paid} in ${landedTile.name}.`;
              } else if (landedTile.type === 'freeparking') {
                const currentPot = get().freeParkingPot;
                if (currentPot > 0) {
                  updated[currentPlayerIndex] = {
                    ...updated[currentPlayerIndex],
                    cash: updated[currentPlayerIndex].cash + currentPot,
                  };
                  get().triggerPopup(`+$${currentPot} Free Parking`, 'gain');
                  playSound('gain');
                  updatedMessage = `${player.name} collected $${currentPot} from Free Parking!`;
                  set({ freeParkingPot: 0 });
                } else {
                  updatedMessage = `${player.name} landed on Free Parking (pot is empty).`;
                }
              } else if (landedTile.type === 'chance') {
                playSound('card');
                get().drawChanceCard();
                // Pause — do not end turn; wait for applyCardEffect
                set({
                  players: updated,
                  isMoving: false,
                  movingPlayerId: null,
                  movingStep: step,
                  hasRolled: !isDoubles,
                  consecutiveDoubles: isDoubles ? newDoubles : 0,
                  message: `${player.name} drew a Chance card. Read it and click Confirm!`,
                });
                return;
              } else if (landedTile.type === 'community_chest') {
                playSound('card');
                get().drawCommunityChestCard();
                set({
                  players: updated,
                  isMoving: false,
                  movingPlayerId: null,
                  movingStep: step,
                  hasRolled: !isDoubles,
                  consecutiveDoubles: isDoubles ? newDoubles : 0,
                  message: `${player.name} drew a Community Chest card. Read it and click Confirm!`,
                });
                return;
              } else if (
                ['property', 'railroad', 'utility'].includes(landedTile.type)
              ) {
                const prop = currentProps[landedTile.id];
                if (prop && prop.owner && prop.owner !== player.id) {
                  const rent = calculateRent(landedTile, currentProps, total);
                  if (rent > 0) {
                    const ownerIndex = updated.findIndex(
                      (p) => p.id === prop.owner
                    );
                    if (ownerIndex !== -1 && !prop.isMortgaged) {
                      get().processRentPayment(
                        player,
                        currentPlayerIndex,
                        prop.owner,
                        rent,
                        landedTile.name,
                        currentProps,
                        nextPos
                      );
                      // processRentPayment handles its own state updates
                      if (isDoubles) updatedMessage += ' Rolled DOUBLES!';
                      set({
                        isMoving: false,
                        movingPlayerId: null,
                        movingStep: step,
                        hasRolled: !isDoubles,
                        consecutiveDoubles: isDoubles ? newDoubles : 0,
                      });
                      return; // Skip the normal set() below since processRentPayment handled it
                    }
                  }
                }
              }

              if (isDoubles) updatedMessage += ' Rolled DOUBLES!';

              // Being sent to jail ends the turn immediately — bail/card
              // options only unlock on the player's next turn.
              set({
                players: updated,
                isMoving: false,
                movingPlayerId: null,
                movingStep: step,
                hasRolled: sentToJail ? true : !isDoubles,
                consecutiveDoubles: isDoubles ? newDoubles : 0,
                message: updatedMessage,
              });
            }
          };

          setTimeout(advance, stepInterval);
        }, 600);
      },

      setManualDice: (dice) => {
        // Dev-only: the input UI is only rendered in development builds, but
        // guard the store too so production can never be steered through this
        // path even if something calls it.
        if (process.env.NODE_ENV !== 'development') return;
        set({ manualDice: dice });
      },

      declareBankruptcy: () => {
        const { players, currentPlayerIndex, properties, debtOwedTo } = get();
        const player = players[currentPlayerIndex];
        if (player.isBankrupt) return;

        const updatedPlayers = players.map((p) => ({ ...p }));
        const creditorIndex =
          debtOwedTo && debtOwedTo !== 'pot'
            ? updatedPlayers.findIndex((p) => p.id === debtOwedTo)
            : -1;

        // In real Monopoly the bankrupt player's assets go to their creditor
        // (the rent owner); otherwise they return to the bank.
        const updatedProperties = { ...properties };
        player.properties.forEach((tileId) => {
          const prop = updatedProperties[tileId];
          if (prop && prop.owner === player.id) {
            if (creditorIndex !== -1) {
              updatedProperties[tileId] = { ...prop, owner: debtOwedTo };
              updatedPlayers[creditorIndex] = {
                ...updatedPlayers[creditorIndex],
                properties: [
                  ...updatedPlayers[creditorIndex].properties,
                  tileId,
                ],
              };
            } else {
              updatedProperties[tileId] = {
                owner: null,
                houses: 0,
                isMortgaged: false,
              };
            }
          }
        });

        if (creditorIndex !== -1) {
          updatedPlayers[creditorIndex] = {
            ...updatedPlayers[creditorIndex],
            cash: updatedPlayers[creditorIndex].cash + player.cash,
          };
        }

        updatedPlayers[currentPlayerIndex] = {
          ...player,
          isBankrupt: true,
          cash: 0,
          properties: [],
        };

        const nonBankruptPlayers = updatedPlayers.filter((p) => !p.isBankrupt);
        let newMessage =
          creditorIndex !== -1
            ? `${player.name} has gone bankrupt! All assets transferred to ${updatedPlayers[creditorIndex].name}.`
            : `${player.name} has gone bankrupt! All properties returned to the bank.`;
        let newPhase: 'setup' | 'playing' | 'ended' = 'playing';
        let newWinner = null;

        if (nonBankruptPlayers.length === 1) {
          const winner = nonBankruptPlayers[0];
          newPhase = 'ended';
          newWinner = {
            winnerId: winner.id,
            winnerName: winner.name,
            winnerToken: winner.token,
            reason: 'All other players have gone bankrupt',
          };
          newMessage = `🎉 ${winner.name} wins the game! All other players have gone bankrupt!`;
        }

        playSound('bankrupt');
        if (newPhase === 'ended') playSound('win');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: newMessage,
          gamePhase: newPhase,
          winner: newWinner,
          showDebtResolution: false,
          debtAmount: 0,
          debtOwedTo: null,
          declinedTile: null,
        });

        // If the game continues, pass the turn to the next active player (with
        // a Pass & Play handoff) instead of leaving the bankrupt player as the
        // current one.
        if (newPhase === 'playing') {
          let nextIndex = (currentPlayerIndex + 1) % players.length;
          let guard = 0;
          while (
            updatedPlayers[nextIndex].isBankrupt &&
            guard < players.length
          ) {
            nextIndex = (nextIndex + 1) % players.length;
            guard += 1;
          }
          const nextPlayer = updatedPlayers[nextIndex];
          set({
            currentPlayerIndex: nextIndex,
            hasRolled: false,
            consecutiveDoubles: 0,
            handoff: {
              playerId: nextPlayer.id,
              playerName: nextPlayer.name,
              token: nextPlayer.token,
            },
            message: `${player.name} has gone bankrupt! ${nextPlayer.name}'s turn. Roll the dice!`,
          });
        }
      },

      payDebt: (amount) => {
        const { players, currentPlayerIndex, debtOwedTo, debtAmount } = get();
        const player = players[currentPlayerIndex];

        // Never pay more than the remaining debt (or what the player holds) -
        // otherwise the excess would be silently created into / vanish from
        // the pot or the creditor's pocket.
        const capped = Math.min(amount, debtAmount, player.cash);
        if (capped <= 0) return;

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash - capped,
        };

        let potCredit = 0;
        if (debtOwedTo === 'pot') {
          // Debt owed to the Free Parking pot (card / tax shortfalls)
          potCredit = capped;
        } else if (debtOwedTo) {
          const ownerIndex = updatedPlayers.findIndex(
            (p) => p.id === debtOwedTo
          );
          if (ownerIndex !== -1) {
            updatedPlayers[ownerIndex] = {
              ...updatedPlayers[ownerIndex],
              cash: updatedPlayers[ownerIndex].cash + capped,
            };
          }
        }

        playSound('pay');

        const remainingDebt = debtAmount - capped;
        const showDebt = remainingDebt > 0;
        const newMessage = showDebt
          ? `${player.name} paid $${capped} toward debt.`
          : `${player.name} has fully paid their debt!`;

        set({
          players: updatedPlayers,
          message: newMessage,
          showDebtResolution: showDebt,
          debtAmount: Math.max(0, remainingDebt),
          ...(potCredit > 0
            ? { freeParkingPot: get().freeParkingPot + potCredit }
            : {}),
        });

        if (potCredit > 0) {
          get().triggerPopup(`+$${potCredit} Free Parking Pot`, 'gain');
        }
      },

      buyProperty: (tileId) => {
        const { players, currentPlayerIndex, properties } = get();
        if (get().trade || get().auction) return;
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[tileId];

        if (!tile || !tile.cost) return;
        if (properties[tileId]?.owner) return;
        if (player.cash < tile.cost) {
          set({
            message: `${player.name} does not have enough cash to buy ${tile.name}!`,
          });
          return;
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash - tile.cost,
          properties: [...player.properties, tileId],
        };

        const updatedProperties = {
          ...properties,
          [tileId]: { owner: player.id, houses: 0, isMortgaged: false },
        };

        get().triggerPopup(`-$${tile.cost} Buy`, 'lose');
        playSound('buy');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: `${player.name} successfully purchased ${tile.name} for $${tile.cost}!`,
        });
      },

      buildHouse: (tileId) => {
        const { players, currentPlayerIndex, properties } = get();
        if (get().trade || get().auction) return;
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[tileId];

        if (
          !tile ||
          tile.type !== 'property' ||
          !tile.colorGroup ||
          !tile.houseCost
        )
          return;
        const prop = properties[tileId];
        if (!prop || prop.owner !== player.id || prop.isMortgaged) return;

        if (!hasCompleteColorGroup(tile.colorGroup, player.id, properties)) {
          set({
            message: `Cannot build: You must own all properties in the ${tile.colorGroup} color group!`,
          });
          return;
        }

        if (prop.houses >= 5) {
          set({ message: `${tile.name} already has a Hotel!` });
          return;
        }

        // Even-building rule: a property can only be built on when it has no
        // more houses than every other property in the color group.
        if (tile.colorGroup) {
          const groupTiles = BOARD_SPACES.filter(
            (t) => t.colorGroup === tile.colorGroup && t.type === 'property'
          );
          const minOthers = Math.min(
            ...groupTiles
              .filter((t) => t.id !== tileId)
              .map((t) => properties[t.id]?.houses ?? 0)
          );
          if (prop.houses > minOthers) {
            set({
              message: `Cannot build: houses must be built evenly across the ${tile.colorGroup} color group.`,
            });
            return;
          }
        }

        if (player.cash < tile.houseCost) {
          set({
            message: `Not enough cash to build ($${tile.houseCost} required).`,
          });
          return;
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash - tile.houseCost,
        };

        const updatedProperties = {
          ...properties,
          [tileId]: { ...prop, houses: prop.houses + 1 },
        };

        get().triggerPopup(`-$${tile.houseCost} Build`, 'lose');
        playSound('build');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: `${player.name} built a ${prop.houses === 4 ? 'Hotel' : 'House'} on ${tile.name} for $${tile.houseCost}!`,
        });
      },

      sellHouse: (tileId) => {
        const { players, currentPlayerIndex, properties } = get();
        if (get().trade || get().auction) return;
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[tileId];

        if (!tile || tile.type !== 'property' || !tile.houseCost) return;
        const prop = properties[tileId];
        if (!prop || prop.owner !== player.id || prop.houses <= 0) return;

        // Even-selling rule: a property can only be sold down when it has no
        // fewer houses than every other property in the color group.
        if (tile.colorGroup) {
          const groupTiles = BOARD_SPACES.filter(
            (t) => t.colorGroup === tile.colorGroup && t.type === 'property'
          );
          const maxOthers = Math.max(
            0,
            ...groupTiles
              .filter((t) => t.id !== tileId)
              .map((t) => properties[t.id]?.houses ?? 0)
          );
          if (prop.houses < maxOthers) {
            set({
              message: `Cannot sell: houses must be sold evenly across the ${tile.colorGroup} color group.`,
            });
            return;
          }
        }

        const refund = Math.floor(tile.houseCost / 2);
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash + refund,
        };

        const updatedProperties = {
          ...properties,
          [tileId]: { ...prop, houses: prop.houses - 1 },
        };

        get().triggerPopup(`+$${refund} Sell`, 'gain');
        playSound('gain');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: `${player.name} sold a building on ${tile.name} for $${refund} refund.`,
        });
      },

      mortgageProperty: (tileId) => {
        const { players, currentPlayerIndex, properties } = get();
        if (get().trade || get().auction) return;
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[tileId];

        if (!tile || !tile.cost) return;
        const prop = properties[tileId];
        if (!prop || prop.owner !== player.id || prop.isMortgaged) return;

        if (
          tile.colorGroup &&
          colorGroupHasBuildings(tile.colorGroup, properties)
        ) {
          set({
            message: `Cannot mortgage: Sell all houses/hotels in ${tile.colorGroup} first!`,
          });
          return;
        }

        const mortgageValue = Math.floor(tile.cost / 2);
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash + mortgageValue,
        };

        const updatedProperties = {
          ...properties,
          [tileId]: { ...prop, isMortgaged: true },
        };

        get().triggerPopup(`+$${mortgageValue} Mortgage`, 'gain');
        playSound('gain');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: `${player.name} mortgaged ${tile.name} for $${mortgageValue}.`,
        });
      },

      unmortgageProperty: (tileId) => {
        const { players, currentPlayerIndex, properties } = get();
        if (get().trade || get().auction) return;
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[tileId];

        if (!tile || !tile.cost) return;
        const prop = properties[tileId];
        if (!prop || prop.owner !== player.id || !prop.isMortgaged) return;

        const unmortgageCost = Math.floor((tile.cost / 2) * 1.1);
        if (player.cash < unmortgageCost) {
          set({
            message: `Not enough cash to unmortgage ($${unmortgageCost} required).`,
          });
          return;
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex] = {
          ...player,
          cash: player.cash - unmortgageCost,
        };

        const updatedProperties = {
          ...properties,
          [tileId]: { ...prop, isMortgaged: false },
        };

        get().triggerPopup(`-$${unmortgageCost} Unmortgage`, 'lose');
        playSound('pay');

        set({
          players: updatedPlayers,
          properties: updatedProperties,
          message: `${player.name} unmortgaged ${tile.name} for $${unmortgageCost}.`,
        });
      },

      endTurn: () => {
        const {
          players,
          currentPlayerIndex,
          trade,
          auction,
          handoff,
          properties,
          declinedTile,
          showDebtResolution,
        } = get();
        if (trade || auction || handoff) return;

        // Official rule: a player who declines to buy an unowned property must
        // auction it. Clicking End Turn on an unowned tile is the decline —
        // start the auction instead of passing the turn. After a no-sale
        // auction declinedTile disables this path so the player can finish.
        const player = players[currentPlayerIndex];
        const tile = BOARD_SPACES[player.position];
        const prop = tile ? properties[tile.id] : undefined;
        const isUnownedToAuction =
          !!player &&
          !player.isBankrupt &&
          !showDebtResolution &&
          !!tile &&
          !!tile.cost &&
          (tile.type === 'property' ||
            tile.type === 'railroad' ||
            tile.type === 'utility') &&
          (!prop || !prop.owner) &&
          declinedTile !== tile.id;
        if (isUnownedToAuction) {
          get().startAuction(tile.id);
          return;
        }

        // Skip bankrupt players so the turn always passes to an active one.
        let nextIndex = (currentPlayerIndex + 1) % players.length;
        let guard = 0;
        while (players[nextIndex].isBankrupt && guard < players.length) {
          nextIndex = (nextIndex + 1) % players.length;
          guard += 1;
        }
        const nextPlayer = players[nextIndex];
        set({
          currentPlayerIndex: nextIndex,
          hasRolled: false,
          consecutiveDoubles: 0,
          declinedTile: null,
          message: `${nextPlayer.name}'s turn. Roll the dice!`,
          // Pass & Play handoff — hide the board until the next player confirms.
          handoff: {
            playerId: nextPlayer.id,
            playerName: nextPlayer.name,
            token: nextPlayer.token,
          },
        });
      },

      resetGame: () => {
        set({
          gamePhase: 'setup',
          players: [],
          currentPlayerIndex: 0,
          dice: [1, 1],
          manualDice: null,
          hasRolled: false,
          isRolling: false,
          isMoving: false,
          movingPlayerId: null,
          movingStep: 0,
          consecutiveDoubles: 0,
          message: 'Welcome to Play, Pass & Go! Setup players to begin.',
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
        });
      },
    
      drawChanceCard: () => {
        let { chanceDeck } = get();
        // Standard Monopoly rule: once the deck runs out, reshuffle the full
        // set so cards never silently vanish.
        if (chanceDeck.length === 0) {
          chanceDeck = shuffleChanceDeck();
        }
        const [top, ...rest] = chanceDeck;
        set({
          pendingCard: { type: 'chance', text: top.text },
          chanceDeck: rest,
        });
      },
    
      drawCommunityChestCard: () => {
        let { communityChestDeck } = get();
        if (communityChestDeck.length === 0) {
          communityChestDeck = shuffleCommunityChestDeck();
        }
        const [top, ...rest] = communityChestDeck;
        set({
          pendingCard: { type: 'community_chest', text: top.text },
          communityChestDeck: rest,
        });
      },
    
      applyCardEffect: () => {
        const {
          pendingCard,
          players,
          currentPlayerIndex,
          properties,
          freeParkingPot,
        } = get();
        if (!pendingCard) return;
    
        const playerId = players[currentPlayerIndex]?.id;
        if (!playerId) return;

        const cardText = pendingCard.text;
        const oldPosition = players[currentPlayerIndex]?.position;
    
        let patch: ChanceStatePatch | ChestStatePatch | null = null;
        if (pendingCard.type === 'chance') {
          const card = CHANCE_CARDS.find((c) => c.text === cardText);
          if (card) {
            patch = card.getStatePatch(
              playerId,
              players,
              properties,
              freeParkingPot,
            );
          }
        } else {
          const card = COMMUNITY_CHEST_CARDS.find((c) => c.text === cardText);
          if (card) {
            patch = card.getStatePatch(
              playerId,
              players,
              properties,
              freeParkingPot,
            );
          }
        }
    
        if (!patch) {
          set({ pendingCard: null });
          return;
        }        const updatedPlayers: Player[] = (patch as ChanceStatePatch | ChestStatePatch).players ?? players;
        const updatedProps: PropertiesMap = (patch as ChanceStatePatch | ChestStatePatch).properties ?? properties;
        const updatedPot = patch.freeParkingPot ?? freeParkingPot;
        const unpaidDebt =
          (patch as ChanceStatePatch | ChestStatePatch).unpaidDebt ?? 0;
        // Being sent to jail via a card also ends the turn immediately.
        const jailedByCard = Boolean(updatedPlayers[currentPlayerIndex]?.inJail);
        if (jailedByCard) playSound('jail');

        const newPosition = updatedPlayers[currentPlayerIndex]?.position;
        const movedByCard =
          newPosition !== undefined && newPosition !== oldPosition;

        // Apply the card's full effect and then resolve the destination tile
        // (rent, tax, Free Parking, Go To Jail, or a follow-up card draw).
        // Runs AFTER the patch is committed so get() sees the final position.
        const commitCard = (movingStep: number) => {
          const nextCardState: {
            players: Player[];
            properties: PropertiesMap;
            freeParkingPot: number;
            message: string;
            pendingCard: null;
            hasRolled: boolean;
            isMoving: boolean;
            movingPlayerId: null;
            movingStep: number;
            showDebtResolution?: boolean;
            debtAmount?: number;
            debtOwedTo?: string | null;
          } = {
            players: updatedPlayers,
            properties: updatedProps,
            freeParkingPot: Math.max(0, updatedPot),
            message: patch.message ?? get().message,
            pendingCard: null,
            hasRolled: jailedByCard ? true : get().hasRolled,
            isMoving: false,
            movingPlayerId: null,
            movingStep,
          };

          if (unpaidDebt > 0) {
            // The card cost more than the player could pay - pause for debt
            // resolution (mortgage / sell / bankruptcy) instead of silently
            // clamping cash to 0. The shortfall is owed to the Free Parking pot.
            nextCardState.showDebtResolution = true;
            nextCardState.debtAmount = unpaidDebt;
            nextCardState.debtOwedTo = 'pot';
            if (!jailedByCard) {
              nextCardState.message = `${nextCardState.message} ${updatedPlayers[currentPlayerIndex]?.name ?? 'Player'} owes $${unpaidDebt} to the Free Parking pot.`;
            }
          }

          set(nextCardState);

          // If the card MOVED the player (and didn't send them to jail or
          // trigger debt resolution), resolve the destination tile just like
          // a normal landing: rent on owned property, tax, Free Parking, or
          // a follow-up card draw. Money-only cards leave the player on the
          // same Chance/Community Chest tile, so they must NOT re-resolve it
          // (that would draw another card and chain forever).
          if (!jailedByCard && unpaidDebt === 0 && movedByCard) {
            // Official rule: the "nearest Railroad" card charges DOUBLE rent.
            get().resolveCardLanding(
              currentPlayerIndex,
              cardText.includes('nearest Railroad')
            );
          }
        };

        // Money-only cards (dividends, fees, repairs, jail-free cards, ...)
        // apply instantly, exactly as before.
        if (!movedByCard) {
          commitCard(0);
          return;
        }

        // Movement card: animate the token hopping tile-by-tile (the same
        // token-hop used by dice rolls) before committing the card's effect.
        // Direction follows the card: "Go back 3 spaces" walks backwards, and
        // Jail cards walk the way that avoids passing GO (no $200 shown).
        const direction: 'forward' | 'backward' = cardText.includes(
          'back 3 spaces'
        )
          ? 'backward'
          : cardText.includes('Jail') && oldPosition > 10
            ? 'backward'
            : 'forward';

        const path: number[] = [];
        let pos = oldPosition;
        while (pos !== newPosition) {
          pos =
            direction === 'forward' ? (pos + 1) % 40 : (pos - 1 + 40) % 40;
          path.push(pos);
        }

        if (path.length === 0) {
          commitCard(0);
          return;
        }

        // Close the card modal and start the token hop. The hop cadence
        // scales with distance so long trips (e.g. across the whole board)
        // stay snappy while short hops keep the dice-roll rhythm.
        set({
          pendingCard: null,
          isMoving: true,
          movingPlayerId: playerId,
          movingStep: 0,
        });

        const stepInterval = Math.min(
          220,
          Math.max(60, Math.round(1600 / path.length))
        );

        let i = 0;
        const advance = () => {
          const stepPos = path[i];
          // Forward card moves that cross GO collect $200 (the patch already
          // credits the cash; the popup is purely visual feedback).
          if (direction === 'forward' && stepPos === 0) {
            get().triggerPopup('+$200 Pass GO', 'gain');
            playSound('gain');
          }

          const current = get().players;
          const updated = [...current];
          updated[currentPlayerIndex] = {
            ...updated[currentPlayerIndex],
            position: stepPos,
          };
          i += 1;

          if (i < path.length) {
            set({ players: updated, movingStep: i });
            setTimeout(advance, stepInterval);
          } else {
            // Final step: land, then commit the card's full effect.
            set({ players: updated, movingStep: i });
            commitCard(i);
          }
        };
        setTimeout(advance, stepInterval);
      },

      // Resolves what happens when a movement card drops the player on a new
      // tile (rent, tax, Free Parking, Go To Jail, or a follow-up card draw).
      // Runs AFTER the card patch is committed so get() sees the new position.
      resolveCardLanding: (playerIndex, doubleRailroadRent = false) => {
        const { players, properties } = get();
        const player = players[playerIndex];
        if (!player || player.isBankrupt) return;

        const tile = BOARD_SPACES[player.position];
        if (!tile) return;

        if (tile.type === 'goto_jail') {
          const updated = [...players];
          updated[playerIndex] = {
            ...updated[playerIndex],
            position: 10,
            inJail: true,
          };
          playSound('jail');
          set({
            players: updated,
            hasRolled: true,
            message: `${player.name} landed on Go To Jail and was sent to Jail!`,
          });
          return;
        }

        if (tile.type === 'tax') {
          const taxAmount = tile.name.includes('Income') ? 200 : 100;
          const paid = Math.min(player.cash, taxAmount);
          const unpaid = taxAmount - paid;
          const updated = [...players];
          updated[playerIndex] = {
            ...updated[playerIndex],
            cash: player.cash - paid,
          };
          // Only the actually-paid portion goes into the Free Parking pot.
          set((s) => ({ freeParkingPot: s.freeParkingPot + paid }));
          if (paid > 0) {
            get().triggerPopup(`-$${paid} Tax`, 'lose');
            playSound('pay');
          }
          if (unpaid > 0) {
            // Cannot afford the full tax - pause for debt resolution instead
            // of silently clamping cash to 0.
            set({
              players: updated,
              showDebtResolution: true,
              debtAmount: unpaid,
              debtOwedTo: 'pot',
              message: `${player.name} could not afford the full ${tile.name} - $${unpaid} is still owed to the Free Parking pot.`,
            });
            return;
          }
          set({
            players: updated,
            message: `${player.name} paid $${paid} in ${tile.name}.`,
          });
          return;
        }

        if (tile.type === 'freeparking') {
          const pot = get().freeParkingPot;
          if (pot > 0) {
            const updated = [...players];
            updated[playerIndex] = {
              ...updated[playerIndex],
              cash: player.cash + pot,
            };
            get().triggerPopup(`+$${pot} Free Parking`, 'gain');
            playSound('gain');
            set({
              players: updated,
              freeParkingPot: 0,
              message: `${player.name} collected $${pot} from Free Parking!`,
            });
          }
          return;
        }

        if (tile.type === 'chance' || tile.type === 'community_chest') {
          // draw* reshuffles automatically when the deck runs out.
          playSound('card');
          if (tile.type === 'chance') {
            get().drawChanceCard();
            set({
              message: `${player.name} drew a Chance card. Read it and click Confirm!`,
            });
          } else {
            get().drawCommunityChestCard();
            set({
              message: `${player.name} drew a Community Chest card. Read it and click Confirm!`,
            });
          }
          return;
        }

        if (
          ['property', 'railroad', 'utility'].includes(tile.type) &&
          tile.cost
        ) {
          const prop = properties[tile.id];
          if (
            prop &&
            prop.owner &&
            prop.owner !== player.id &&
            !prop.isMortgaged
          ) {
            // Utilities use the turn's dice roll for rent; a card move has no
            // fresh roll, so the existing turn roll is the closest equivalent.
            let rent = calculateRent(
              tile,
              properties,
              get().dice[0] + get().dice[1]
            );
            if (doubleRailroadRent && tile.type === 'railroad' && rent > 0) {
              rent *= 2;
            }
            if (rent > 0) {
              get().processRentPayment(
                player,
                playerIndex,
                prop.owner,
                rent,
                tile.name,
                properties,
                player.position
              );
            }
          }
        }
      },
    
      useGetOutOfJailCard: () => {
        const { players, currentPlayerIndex } = get();
        const player = players[currentPlayerIndex];
        if (!player || !player.inJail || (player.getOutOfJailCards ?? 0) <= 0) return;
        const updated = [...players];
        updated[currentPlayerIndex] = {
          ...player,
          inJail: false,
          jailTurns: 0,
          getOutOfJailCards: (player.getOutOfJailCards ?? 1) - 1,
        };
        playSound('card');
        set({
          players: updated,
          message: `${player.name} used a Get Out of Jail Free card and is now free!`,
        });
      },
    
      payBail: () => {
        const { players, currentPlayerIndex } = get();
        const player = players[currentPlayerIndex];
        if (!player || !player.inJail || player.cash < 50) return;
        const updated = [...players];
        updated[currentPlayerIndex] = {
          ...player,
          cash: player.cash - 50,
          inJail: false,
          jailTurns: 0,
        };
        get().triggerPopup('-$50 Bail', 'lose');
        playSound('bail');
        set({
          players: updated,
          message: `${player.name} paid $50 bail and is now free!`,
        });
      },

      startTrade: () => {
        const {
          players,
          currentPlayerIndex,
          isMoving,
          showDebtResolution,
          pendingCard,
          trade,
          auction,
          handoff,
        } = get();
        const player = players[currentPlayerIndex];
        if (!player || player.isBankrupt) return;
        if (isMoving || showDebtResolution || pendingCard || trade || auction || handoff) return;
        if (players.filter((p) => !p.isBankrupt).length < 2) return;

        set({
          trade: {
            phase: 'proposing',
            fromId: player.id,
            toId: null,
            offerProps: [],
            requestProps: [],
            offerCash: 0,
            requestCash: 0,
          },
        });
      },

      sendTradeOffer: ({
        toId,
        offerProps,
        requestProps,
        offerCash,
        requestCash,
      }) => {
        const { trade, players, properties } = get();
        if (!trade || trade.phase !== 'proposing') return;

        const from = players.find((p) => p.id === trade.fromId);
        const to = players.find((p) => p.id === toId);
        if (!from || !to || to.isBankrupt || toId === trade.fromId) return;

        if (offerProps.length + requestProps.length < 1) {
          set({ message: 'A trade must include at least one property.' });
          return;
        }

        for (const tileId of offerProps) {
          const prop = properties[tileId];
          if (!prop || prop.owner !== from.id || !from.properties.includes(tileId)) {
            set({
              message:
                'You no longer own a property you selected - re-select it and try again.',
            });
            return;
          }
          if (prop.houses > 0) {
            set({ message: 'Sell houses/hotels before trading those properties.' });
            return;
          }
        }
        for (const tileId of requestProps) {
          const prop = properties[tileId];
          if (!prop || prop.owner !== to.id || !to.properties.includes(tileId)) {
            set({
              message:
                'The other player no longer owns a property you requested - re-select it and try again.',
            });
            return;
          }
          if (prop.houses > 0) {
            set({
              message: 'The requested property has houses/hotels - sell them before trading.',
            });
            return;
          }
        }

        if (offerCash > from.cash || requestCash > to.cash) {
          set({ message: 'The offered cash exceeds a player\'s available cash.' });
          return;
        }

        set({
          trade: {
            phase: 'review',
            fromId: from.id,
            toId,
            offerProps,
            requestProps,
            offerCash,
            requestCash,
          },
          message: `${to.name}, review the trade offer from ${from.name}.`,
        });
      },

      acceptTrade: () => {
        const { trade, players, properties } = get();
        if (!trade || trade.phase !== 'review' || !trade.toId) return;
        const {
          fromId,
          toId,
          offerProps,
          requestProps,
          offerCash,
          requestCash,
        } = trade;

        const from = players.find((p) => p.id === fromId);
        const to = players.find((p) => p.id === toId);
        if (!from || !to) return;
        if (requestCash > to.cash) {
          set({ message: `${to.name} cannot afford the requested $${requestCash}.` });
          return;
        }

        const updatedPlayers = players.map((p) => ({ ...p }));
        const fromIdx = updatedPlayers.findIndex((p) => p.id === fromId);
        const toIdx = updatedPlayers.findIndex((p) => p.id === toId);
        if (fromIdx === -1 || toIdx === -1) return;

        const updatedProps: PropertiesMap = { ...properties };
        const transfer = (tileId: number, newOwnerId: string) => {
          const prop = updatedProps[tileId];
          if (prop) updatedProps[tileId] = { ...prop, owner: newOwnerId };
        };
        for (const tileId of offerProps) transfer(tileId, toId);
        for (const tileId of requestProps) transfer(tileId, fromId);

        updatedPlayers[fromIdx] = {
          ...updatedPlayers[fromIdx],
          properties: [
            ...updatedPlayers[fromIdx].properties.filter(
              (id) => !offerProps.includes(id)
            ),
            ...requestProps,
          ],
          cash: updatedPlayers[fromIdx].cash - offerCash + requestCash,
        };
        updatedPlayers[toIdx] = {
          ...updatedPlayers[toIdx],
          properties: [
            ...updatedPlayers[toIdx].properties.filter(
              (id) => !requestProps.includes(id)
            ),
            ...offerProps,
          ],
          cash: updatedPlayers[toIdx].cash + offerCash - requestCash,
        };

        get().triggerPopup('Trade completed', 'gain');
        playSound('buy');
        set({
          players: updatedPlayers,
          properties: updatedProps,
          trade: null,
          message: `Trade complete: ${from.name} and ${to.name} exchanged properties and cash.`,
        });
      },

      declineTrade: () => {
        const { trade, players } = get();
        if (!trade || trade.phase !== 'review') return;
        const from = players.find((p) => p.id === trade.fromId);
        const to = players.find((p) => p.id === trade.toId);
        set({
          trade: null,
          message: `${to?.name ?? 'Player'} declined the trade from ${from?.name ?? 'Player'}.`,
        });
      },

      closeTrade: () => {
        set({ trade: null });
      },

      startAuction: (tileId) => {
        const {
          players,
          currentPlayerIndex,
          properties,
          isMoving,
          showDebtResolution,
          pendingCard,
          trade,
          auction,
          handoff,
        } = get();
        if (isMoving || showDebtResolution || pendingCard || trade || auction || handoff) return;

        const tile = BOARD_SPACES[tileId];
        if (!tile || !tile.cost) return;
        const prop = properties[tileId];
        if (prop && prop.owner) return;

        const currentPlayer = players[currentPlayerIndex];
        if (!currentPlayer || currentPlayer.isBankrupt) return;

        const active = players.filter((p) => !p.isBankrupt).map((p) => p.id);
        if (active.length < 2) return;

        // Rotate starting with the player AFTER the current one; the
        // declining player bids last in the first round.
        const currentIdx = active.indexOf(currentPlayer.id);
        const ordered =
          currentIdx === -1
            ? active
            : [...active.slice(currentIdx + 1), ...active.slice(0, currentIdx + 1)];

        set({
          // The current player is declining to buy this tile - remember it so
          // the Buy / Decline & Auction buttons don't reappear after the
          // auction ends without a sale.
          declinedTile: tileId,
          auction: {
            tileId,
            currentBid: 0,
            highestBidderId: null,
            activeBidders: ordered,
            passedBidders: [],
            currentBidderIndex: 0,
            phase: 'bidding',
            winnerId: null,
            finalBid: 0,
          },
          message: `Auction for ${tile.name} has started! ${players.find((p) => p.id === ordered[0])?.name ?? ''} bids first (minimum $10).`,
        });
        playSound('start');
      },

      submitBid: (amount) => {
        const { auction, players } = get();
        if (!auction || auction.phase !== 'bidding') return;
        if (!Number.isInteger(amount) || amount < 0) return;

        const bidderId = auction.activeBidders[auction.currentBidderIndex];
        const bidder = players.find((p) => p.id === bidderId);
        if (!bidder || bidder.isBankrupt) return;

        const minBid = auction.currentBid + 10;
        if (amount < minBid || amount > bidder.cash) return;

        const nextIndex =
          (auction.currentBidderIndex + 1) % auction.activeBidders.length;
        set({
          auction: {
            ...auction,
            currentBid: amount,
            highestBidderId: bidderId,
            currentBidderIndex: nextIndex,
          },
          message: `${bidder.name} bid $${amount} for ${BOARD_SPACES[auction.tileId].name}.`,
        });
        playSound('bail');
      },

      passAuction: () => {
        const { auction, players, properties } = get();
        if (!auction || auction.phase !== 'bidding') return;

        const bidderId = auction.activeBidders[auction.currentBidderIndex];
        const bidder = players.find((p) => p.id === bidderId);
        if (!bidder) return;

        const newActive = auction.activeBidders.filter((id) => id !== bidderId);
        const newPassed = [...auction.passedBidders, bidderId];

        // The highest bidder wins once every other bidder has passed.
        const winnerId = auction.highestBidderId;
        const onlyWinnerLeft =
          winnerId !== null &&
          newActive.length === 1 &&
          newActive[0] === winnerId;

        if (onlyWinnerLeft && auction.currentBid > 0 && winnerId) {
          const tile = BOARD_SPACES[auction.tileId];
          const winner = players.find((p) => p.id === winnerId);
          const winnerIdx = players.findIndex((p) => p.id === winnerId);
          if (!winner || winnerIdx === -1) return;

          const updatedPlayers = players.map((p) => ({ ...p }));
          const updatedProps: PropertiesMap = { ...properties };
          updatedProps[auction.tileId] = {
            owner: winnerId,
            houses: 0,
            isMortgaged: false,
          };
          updatedPlayers[winnerIdx] = {
            ...updatedPlayers[winnerIdx],
            cash: updatedPlayers[winnerIdx].cash - auction.currentBid,
            properties: [...updatedPlayers[winnerIdx].properties, auction.tileId],
          };

          get().triggerPopup(`-$${auction.currentBid} Auction`, 'lose');
          playSound('buy');
          set({
            players: updatedPlayers,
            properties: updatedProps,
            auction: {
              ...auction,
              phase: 'won',
              winnerId,
              finalBid: auction.currentBid,
            },
            message: `${winner.name} won the auction for ${tile.name} with a bid of $${auction.currentBid}!`,
          });
          return;
        }

        if (newActive.length === 0) {
          // Everyone passed — no sale if there were no bids.
          set({
            auction: null,
            message:
              auction.currentBid > 0
                ? `Auction ended without a buyer for ${BOARD_SPACES[auction.tileId].name}.`
                : `No one bid on ${BOARD_SPACES[auction.tileId].name} — it stays unowned.`,
          });
          return;
        }

        const nextIndex =
          newActive.length > 0 ? auction.currentBidderIndex % newActive.length : 0;
        set({
          auction: {
            ...auction,
            activeBidders: newActive,
            passedBidders: newPassed,
            currentBidderIndex: nextIndex,
          },
          message: `${bidder.name} passed the auction for ${BOARD_SPACES[auction.tileId].name}.`,
        });
      },

      closeAuction: () => {
        set({ auction: null });
      },

      confirmHandoff: () => {
        set({ handoff: null });
      },
    }),
    {
      name: 'monopoly-game-storage',
      // Never persist the dev-only dice override across reloads.
      partialize: (state) => {
        const { manualDice: _manualDice, ...rest } = state;
        return rest;
      },
    }
  )
);
