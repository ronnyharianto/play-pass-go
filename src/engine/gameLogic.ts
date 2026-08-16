import { BOARD_SPACES, TileData } from './boardData';

export interface PropertyState {
  owner: string | null; // player id
  houses: number; // 0-4 = houses, 5 = hotel
  isMortgaged: boolean;
}

export type PropertiesMap = Record<number, PropertyState>;

/**
 * Check if a player owns all properties of a given color group.
 */
export function hasCompleteColorGroup(
  colorGroup: string,
  playerId: string,
  properties: PropertiesMap
): boolean {
  const groupTiles = BOARD_SPACES.filter(
    (tile) => tile.colorGroup === colorGroup && tile.type === 'property'
  );
  if (groupTiles.length === 0) return false;

  return groupTiles.every((tile) => {
    const prop = properties[tile.id];
    return prop && prop.owner === playerId && !prop.isMortgaged;
  });
}

/**
 * Calculate rent for landing on a property given dice roll (for utilities) and properties state.
 */
export function calculateRent(
  tile: TileData,
  properties: PropertiesMap,
  diceTotal: number
): number {
  const prop = properties[tile.id];
  if (!prop || !prop.owner || prop.isMortgaged) return 0;

  const ownerId = prop.owner;

  // 1. Railroads
  if (tile.type === 'railroad') {
    const rrTiles = BOARD_SPACES.filter((t) => t.type === 'railroad');
    const ownedCount = rrTiles.filter((t) => {
      const p = properties[t.id];
      return p && p.owner === ownerId && !p.isMortgaged;
    }).length;

    if (ownedCount === 0) return 0;
    const rents = [25, 50, 100, 200];
    return rents[Math.min(ownedCount - 1, 3)];
  }

  // 2. Utilities
  if (tile.type === 'utility') {
    const utilTiles = BOARD_SPACES.filter((t) => t.type === 'utility');
    const ownedCount = utilTiles.filter((t) => {
      const p = properties[t.id];
      return p && p.owner === ownerId && !p.isMortgaged;
    }).length;

    if (ownedCount === 0) return 0;
    return ownedCount === 1 ? diceTotal * 4 : diceTotal * 10;
  }

  // 3. Standard Properties
  if (tile.type === 'property' && tile.rent) {
    const houses = prop.houses;
    if (houses > 0) {
      // rent array: [base, 1house, 2house, 3house, 4house, hotel]
      return tile.rent[Math.min(houses, 5)];
    }

    // No houses: check if owner has monopoly on this color group
    const isMonopoly = tile.colorGroup
      ? hasCompleteColorGroup(tile.colorGroup, ownerId, properties)
      : false;

    const baseRent = tile.rent[0];
    return isMonopoly ? baseRent * 2 : baseRent;
  }

  return 0;
}

/**
 * Check if any property in the color group has houses/hotels built.
 */
export function colorGroupHasBuildings(
  colorGroup: string,
  properties: PropertiesMap
): boolean {
  const groupTiles = BOARD_SPACES.filter(
    (tile) => tile.colorGroup === colorGroup && tile.type === 'property'
  );
  return groupTiles.some((tile) => {
    const prop = properties[tile.id];
    return prop && prop.houses > 0;
  });
}
