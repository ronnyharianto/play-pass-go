import React from 'react';
import { TileData } from '../../engine/boardData';
import { Player, useGameStore } from '../../store/gameStore';
import { Token } from './Token';
import { cn } from '@/utils/cn';
import { colorMap } from '@/utils/groupColors';

type TileOrientation = 'bottom' | 'left' | 'top' | 'right' | 'corner';

interface TileProps {
  tile: TileData;
  players: Player[];
  movingPlayerId: string | null;
  movingStep: number;
  orientation: TileOrientation;
}

const MAX_TOKENS = 4;

export const Tile: React.FC<TileProps> = ({
  tile,
  players,
  movingPlayerId,
  movingStep,
  orientation,
}) => {
  const properties = useGameStore((s) => s.properties);
  const prop = properties[tile.id];
  const owner = prop?.owner ? players.find((p) => p.id === prop.owner) : null;

  const tilePlayers = players.filter((p) => p.position === tile.id && !p.isBankrupt);
  const emptySlots = Math.max(0, MAX_TOKENS - tilePlayers.length);

  // Determine rotation and layout based on orientation
  const getOrientationStyles = () => {
    switch (orientation) {
      case 'bottom':
        return {
          container: 'flex-col',
          textRotation: '',
          colorBanner: 'h-1.5 w-full',
          textContainer: 'flex-col items-center text-center',
        };
      case 'top':
        return {
          container: 'flex-col',
          textRotation: '',
          colorBanner: 'h-1.5 w-full',
          textContainer: 'flex-col items-center text-center',
        };
      case 'left':
        return {
          container: 'flex-row-reverse',
          textRotation: 'rotate-90',
          colorBanner: 'h-full w-1.5',
          textContainer: 'flex-col items-center text-center',
        };
      case 'right':
        return {
          container: 'flex-row',
          textRotation: '-rotate-90',
          colorBanner: 'h-full w-1.5',
          textContainer: 'flex-col items-center text-center',
        };
      case 'corner':
        return {
          container: 'flex-col',
          textRotation: '',
          colorBanner: 'h-1.5 w-full',
          textContainer: 'flex-col items-center text-center',
        };
      default:
        return {
          container: 'flex-col',
          textRotation: '',
          colorBanner: 'h-1.5 w-full',
          textContainer: 'flex-col items-center text-center',
        };
    }
  };

  const styles = getOrientationStyles();
  const isVertical = orientation === 'left' || orientation === 'right';

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Outside badges / indicators (Owner indicator, houses/hotels, mortgage banner) */}
      {owner && (
        <div
          className={cn(
            'absolute z-10 px-1 py-0.5 rounded text-[7px] font-bold text-white shadow',
            'max-w-[2.75rem] sm:max-w-[4.5rem] truncate',
            orientation === 'bottom' || orientation === 'corner' ? '-top-2 left-1/2 -translate-x-1/2' :
            orientation === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2' :
            orientation === 'left' ? '-right-2 top-1/2 -translate-y-1/2' :
            '-left-2 top-1/2 -translate-y-1/2',
            styles.textRotation
          )}
          style={{ backgroundColor: getPlayerBadgeColor(owner.token) }}
          title={`Owned by ${owner.name}`}
        >
          {owner.name}
        </div>
      )}

      {prop?.houses > 0 && (
        <div className="absolute -top-2 right-0 z-10 bg-amber-500 text-slate-950 font-extrabold text-[7px] px-1 rounded shadow">
          {prop.houses === 5 ? '🏨' : `🏠${prop.houses}`}
        </div>
      )}

      {prop?.isMortgaged && (
        <div className="absolute inset-0 z-20 bg-red-950/80 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] font-bold text-red-300 uppercase tracking-widest rotate-[-15deg] border border-red-500 px-1 py-0.5 bg-red-900/90 rounded">
            Mortgaged
          </span>
        </div>
      )}

      {/* Main Tile Body */}
      <div
        className={cn(
          'border border-slate-500 bg-slate-900/90',
          'p-1 h-full w-full min-w-0',
          'flex items-stretch',
          'overflow-hidden select-none',
          styles.container
        )}
      >
        {/* Color Banner */}
        {tile.colorGroup && colorMap[tile.colorGroup] && (
          <div className={cn('shrink-0', colorMap[tile.colorGroup], styles.colorBanner)} />
        )}

        {/* Tile Name & Cost */}
        <div
          className={cn(
            'flex leading-tight text-slate-200',
            styles.textContainer,
            styles.textRotation,
            isVertical ? 'flex-1 justify-center' : 'mt-1'
          )}
        >
          <span className="block font-medium break-words text-[8px]">
            {tile.name}
          </span>
          {tile.cost && (
            <span className="text-amber-400 text-[7px] leading-tight">
              ${tile.cost}
            </span>
          )}
        </div>

        {/* Player Tokens */}
        <div className={cn(
          'grid gap-0.5 place-items-center',
          isVertical ? 'grid-rows-2 grid-cols-1' : 'grid-cols-2',
          styles.textRotation,
          orientation === 'bottom' || orientation === 'corner' ? 'mt-auto pt-1' : '',
          orientation === 'top' ? 'mb-auto pb-1' : ''
        )}>
          {tilePlayers.map((p) => (
            <Token
              key={p.id}
              token={p.token}
              playerName={p.name}
              isMoving={movingPlayerId === p.id}
              moveKey={movingStep}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <span key={`empty-${i}`} aria-hidden="true" className="w-4 h-4" />
          ))}
        </div>
      </div>
    </div>
  );
};

function getPlayerBadgeColor(token: string): string {
  switch (token) {
    case '🚗': return '#3b82f6'; // blue
    case '🎩': return '#8b5cf6'; // purple
    case '🐶': return '#f59e0b'; // amber
    case ' Th': return '#ec4899'; // pink
    case '👢': return '#10b981'; // emerald
    case '🚢': return '#6366f1'; // indigo
    case '🐱': return '#ef4444'; // red
    case '🦖': return '#14b8a6'; // teal
    default: return '#64748b';
  }
}
