/**
 * Optional rule features for a local game.
 *
 * These are chosen on the landing page and read by the store so a disabled
 * feature can never be triggered (the UI also hides its controls). Core rules
 * — houses/hotels and mortgages — are always on and deliberately absent here.
 */
export interface GameSettings {
  /** Unbought/declined properties go to auction when the turn ends. */
  auctions: boolean;
  /** Players may trade properties and cash with each other. */
  trading: boolean;
  /** Taxes and card fees collect in the Free Parking pot and are won by landing there. */
  freeParking: boolean;
  /** The two "Get Out of Jail Free" cards are dealt into the decks. */
  jailFreeCards: boolean;
}

/** Classic rules: every optional feature enabled. */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  auctions: true,
  trading: true,
  freeParking: true,
  jailFreeCards: true,
};

export interface GameFeatureToggle {
  key: keyof GameSettings;
  label: string;
  description: string;
  icon: string;
}

/**
 * Single source of truth for the landing-page toggle list — the settings panel
 * renders straight from this array, so adding a feature later means adding one
 * entry here plus its guard in the store.
 */
export const GAME_FEATURE_TOGGLES: GameFeatureToggle[] = [
  {
    key: 'auctions',
    label: 'Auctions',
    icon: '⚖️',
    description:
      'Declined properties are auctioned to the highest bidder. Off: they stay with the bank.',
  },
  {
    key: 'trading',
    label: 'Trading',
    icon: '🤝',
    description:
      'Trade properties and cash with other players between turns.',
  },
  {
    key: 'freeParking',
    label: 'Free Parking Pot',
    icon: '🅿️',
    description:
      'Taxes and fees collect in a pot, won by whoever lands on Free Parking. Off: they go to the bank.',
  },
  {
    key: 'jailFreeCards',
    label: 'Get Out of Jail Free Cards',
    icon: '🔑',
    description:
      'Both jail-free cards stay in the decks. Off: nobody can draw or be awarded one.',
  },
];

/** True when every optional feature is at its classic default. */
export function isDefaultGameSettings(settings: GameSettings): boolean {
  return GAME_FEATURE_TOGGLES.every(
    (feature) => settings[feature.key] === DEFAULT_GAME_SETTINGS[feature.key]
  );
}
