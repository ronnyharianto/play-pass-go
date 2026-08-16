import React from 'react';
import { BOARD_SPACES } from '../../engine/boardData';
import { Player, useGameStore } from '../../store/gameStore';
import { Tile } from './Tile';
import { CenterPanel } from './CenterPanel';
import { cn } from '@/utils/cn';

interface BoardProps {
  players: Player[];
}

function getTileGridPosition(id: number): { row: number; col: number } {
  if (id >= 0 && id <= 10) {
    return { row: 11, col: 11 - id };
  } else if (id > 10 && id <= 20) {
    return { row: 11 - (id - 10), col: 1 };
  } else if (id > 20 && id <= 30) {
    return { row: 1, col: 1 + (id - 20) };
  } else {
    return { row: 1 + (id - 30), col: 11 };
  }
}

type TileOrientation = 'bottom' | 'left' | 'top' | 'right' | 'corner';

function getTileOrientation(id: number): TileOrientation {
  if (id === 0 || id === 10 || id === 20 || id === 30) {
    return 'corner';
  } else if (id > 0 && id < 10) {
    return 'bottom';
  } else if (id > 10 && id < 20) {
    return 'left';
  } else if (id > 20 && id < 30) {
    return 'top';
  } else {
    return 'right';
  }
}

export const Board: React.FC<BoardProps> = ({ players }) => {
  const movingPlayerId = useGameStore((s) => s.movingPlayerId);
  const movingStep = useGameStore((s) => s.movingStep);

  return (
    <div
      className={cn(
        'h-[60vh] lg:h-[85vh] xl:h-[95vh]',
        'relative w-full bg-board-frame p-2 rounded-xl board-grid',
        'aspect-square mx-auto overflow-visible'
      )}
    >
      {/* Center area: Free Parking pot, player cards, dice, status & actions */}
      <div className="col-start-2 col-end-11 row-start-2 row-end-11 min-w-0 min-h-0">
        <CenterPanel />
      </div>

      {/* Render all 40 tiles */}
      {BOARD_SPACES.map((tile) => {
        const { row, col } = getTileGridPosition(tile.id);
        const orientation = getTileOrientation(tile.id);

        return (
          <div
            key={tile.id}
            className="min-w-0 min-h-0"
            style={{
              gridRow: row,
              gridColumn: col,
            }}
          >
            <Tile
              tile={tile}
              players={players}
              movingPlayerId={movingPlayerId}
              movingStep={movingStep}
              orientation={orientation}
            />
          </div>
        );
      })}
    </div>
  );
};
