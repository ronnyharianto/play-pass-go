export interface TileData {
  id: number;
  name: string;
  type:
    | 'go'
    | 'property'
    | 'railroad'
    | 'utility'
    | 'tax'
    | 'chance'
    | 'community_chest'
    | 'jail'
    | 'goto_jail'
    | 'freeparking';
  cost?: number;
  rent?: number[];
  colorGroup?:
    | 'brown'
    | 'lightblue'
    | 'pink'
    | 'orange'
    | 'red'
    | 'yellow'
    | 'green'
    | 'darkblue'
    | 'railroad'
    | 'utility';
  houseCost?: number;
}

export const BOARD_SPACES: TileData[] = [
  { id: 0, name: 'GO', type: 'go' },
  {
    id: 1,
    name: 'Cocoa Corner',
    type: 'property',
    cost: 60,
    rent: [2, 10, 30, 90, 160, 250],
    colorGroup: 'brown',
    houseCost: 50,
  },
  { id: 2, name: 'Chest', type: 'community_chest' },
  {
    id: 3,
    name: 'Fudge Lane',
    type: 'property',
    cost: 60,
    rent: [4, 20, 60, 180, 320, 450],
    colorGroup: 'brown',
    houseCost: 50,
  },
  { id: 4, name: 'Income Tax', type: 'tax' },
  {
    id: 5,
    name: 'Candy Express',
    type: 'railroad',
    cost: 200,
    rent: [25, 50, 100, 200],
    colorGroup: 'railroad',
  },
  {
    id: 6,
    name: 'Mint Avenue',
    type: 'property',
    cost: 100,
    rent: [6, 30, 90, 270, 400, 550],
    colorGroup: 'lightblue',
    houseCost: 50,
  },
  { id: 7, name: 'Chance', type: 'chance' },
  {
    id: 8,
    name: 'Sherbet Street',
    type: 'property',
    cost: 100,
    rent: [6, 30, 90, 270, 400, 550],
    colorGroup: 'lightblue',
    houseCost: 50,
  },
  {
    id: 9,
    name: 'Gumdrop Court',
    type: 'property',
    cost: 120,
    rent: [8, 40, 100, 300, 450, 600],
    colorGroup: 'lightblue',
    houseCost: 50,
  },
  { id: 10, name: 'Jail / Visiting', type: 'jail' },
  {
    id: 11,
    name: 'Cotton Candy',
    type: 'property',
    cost: 140,
    rent: [10, 50, 150, 450, 625, 750],
    colorGroup: 'pink',
    houseCost: 100,
  },
  {
    id: 12,
    name: 'Bubblegum',
    type: 'utility',
    cost: 150,
    colorGroup: 'utility',
  },
  {
    id: 13,
    name: 'Strawberry',
    type: 'property',
    cost: 140,
    rent: [10, 50, 150, 450, 625, 750],
    colorGroup: 'pink',
    houseCost: 100,
  },
  {
    id: 14,
    name: 'Pink Fizz',
    type: 'property',
    cost: 160,
    rent: [12, 60, 180, 500, 700, 900],
    colorGroup: 'pink',
    houseCost: 100,
  },
  {
    id: 15,
    name: 'Lollipop Line',
    type: 'railroad',
    cost: 200,
    rent: [25, 50, 100, 200],
    colorGroup: 'railroad',
  },
  {
    id: 16,
    name: 'Tangerine',
    type: 'property',
    cost: 180,
    rent: [14, 70, 200, 550, 750, 950],
    colorGroup: 'orange',
    houseCost: 100,
  },
  { id: 17, name: 'Chest', type: 'community_chest' },
  {
    id: 18,
    name: 'Orange Grove',
    type: 'property',
    cost: 180,
    rent: [14, 70, 200, 550, 750, 950],
    colorGroup: 'orange',
    houseCost: 100,
  },
  {
    id: 19,
    name: 'Candy Corn',
    type: 'property',
    cost: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    colorGroup: 'orange',
    houseCost: 100,
  },
  { id: 20, name: 'Free Parking', type: 'freeparking' },
  {
    id: 21,
    name: 'Cherry Chase',
    type: 'property',
    cost: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    colorGroup: 'red',
    houseCost: 150,
  },
  { id: 22, name: 'Chance', type: 'chance' },
  {
    id: 23,
    name: 'Red Velvet Road',
    type: 'property',
    cost: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    colorGroup: 'red',
    houseCost: 150,
  },
  {
    id: 24,
    name: 'Raspberry Row',
    type: 'property',
    cost: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    colorGroup: 'red',
    houseCost: 150,
  },
  {
    id: 25,
    name: 'Gumdrop Railway',
    type: 'railroad',
    cost: 200,
    rent: [25, 50, 100, 200],
    colorGroup: 'railroad',
  },
  {
    id: 26,
    name: 'Lemon Loop',
    type: 'property',
    cost: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    colorGroup: 'yellow',
    houseCost: 150,
  },
  {
    id: 27,
    name: 'Honeycomb Hill',
    type: 'property',
    cost: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    colorGroup: 'yellow',
    houseCost: 150,
  },
  {
    id: 28,
    name: 'Soda Springs',
    type: 'utility',
    cost: 150,
    colorGroup: 'utility',
  },
  {
    id: 29,
    name: 'Butterscotch',
    type: 'property',
    cost: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    colorGroup: 'yellow',
    houseCost: 150,
  },
  { id: 30, name: 'Go To Jail', type: 'goto_jail' },
  {
    id: 31,
    name: 'Lime Lane',
    type: 'property',
    cost: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    colorGroup: 'green',
    houseCost: 200,
  },
  {
    id: 32,
    name: 'Sour Apple',
    type: 'property',
    cost: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    colorGroup: 'green',
    houseCost: 200,
  },
  { id: 33, name: 'Chest', type: 'community_chest' },
  {
    id: 34,
    name: 'Green Apple',
    type: 'property',
    cost: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    colorGroup: 'green',
    houseCost: 200,
  },
  {
    id: 35,
    name: 'Choo-Choo',
    type: 'railroad',
    cost: 200,
    rent: [25, 50, 100, 200],
    colorGroup: 'railroad',
  },
  { id: 36, name: 'Chance', type: 'chance' },
  {
    id: 37,
    name: 'Blueberry',
    type: 'property',
    cost: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    colorGroup: 'darkblue',
    houseCost: 200,
  },
  { id: 38, name: 'Luxury Tax', type: 'tax' },
  {
    id: 39,
    name: 'Midnight',
    type: 'property',
    cost: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    colorGroup: 'darkblue',
    houseCost: 200,
  },
];
