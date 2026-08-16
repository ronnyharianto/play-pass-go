// Shared color classes for the property color groups. Single source of truth
// for the board tiles, the property panel and the trade modal so they never
// drift apart. The actual hex values live in @theme in src/app/globals.css.
export const colorMap: Record<string, string> = {
  brown: 'bg-group-brown',
  lightblue: 'bg-group-lightblue',
  pink: 'bg-group-pink',
  orange: 'bg-group-orange',
  red: 'bg-group-red',
  yellow: 'bg-group-yellow',
  green: 'bg-group-green',
  darkblue: 'bg-group-darkblue',
  railroad: 'bg-group-railroad',
  utility: 'bg-group-utility',
};
