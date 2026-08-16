import React from 'react';
import { Player } from '../../store/gameStore';
import { BOARD_SPACES } from '../../engine/boardData';
import { cn } from '../../utils/cn';
import { colorMap } from '../../utils/groupColors';

interface ActionPanelProps {
  currentPlayer: Player;
  properties: Record<number, { owner: string | null; houses: number; isMortgaged: boolean }>;
  onBuildHouse: (tileId: number) => void;
  onSellHouse: (tileId: number) => void;
  onMortgage: (tileId: number) => void;
  onUnmortgage: (tileId: number) => void;
}

/**
 * Side panel dedicated to the current player's property portfolio.
 * The dice, status message and action buttons now live in the board center
 * (CenterPanel), so this panel can use the full column for a readable,
 * always-visible property list with house/mortgage management controls.
 */
export const ActionPanel: React.FC<ActionPanelProps> = ({
  currentPlayer,
  properties,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
}) => {
  // Group owned properties by color group (or, for railroads/utilities, by
  // their type / colorGroup) and sort groups by their earliest board tile id
  // so the portfolio reflects board order while making it obvious which
  // color sets are complete.
  const propertyGroups: {
    key: string;
    label: string;
    colorGroup: string;
    tileIds: number[];
    owned: number;
    total: number;
    isComplete: boolean;
  }[] = (() => {
    // Map each colorGroup (or type fallback) to all board tile ids in that group.
    const groupTileIds: Record<string, number[]> = {};
    for (const tile of BOARD_SPACES) {
      const key = tile.colorGroup || (tile.type === 'railroad' ? 'railroad' : tile.type === 'utility' ? 'utility' : undefined);
      if (!key) continue;
      if (!groupTileIds[key]) groupTileIds[key] = [];
      groupTileIds[key].push(tile.id);
    }

    const ownedByGroup: Record<string, number[]> = {};
    for (const tileId of currentPlayer.properties) {
      const tile = BOARD_SPACES[tileId];
      if (!tile) continue;
      const key = tile.colorGroup || (tile.type === 'railroad' ? 'railroad' : tile.type === 'utility' ? 'utility' : null);
      if (!key) continue;
      if (!ownedByGroup[key]) ownedByGroup[key] = [];
      ownedByGroup[key].push(tileId);
    }

    const prettyLabel = (key: string) => {
      switch (key) {
        case 'railroad':
          return 'Railroads';
        case 'utility':
          return 'Utilities';
        default:
          return key.charAt(0).toUpperCase() + key.slice(1);
      }
    };

    return Object.entries(ownedByGroup)
      .map(([key, tileIds]) => {
        const total = groupTileIds[key]?.length ?? tileIds.length;
        const owned = tileIds.length;
        const sortedIds = [...tileIds].sort((a, b) => a - b);
        return {
          key,
          label: prettyLabel(key),
          colorGroup: key,
          tileIds: sortedIds,
          owned,
          total,
          isComplete: owned >= total,
        };
      })
      .sort((a, b) => a.tileIds[0] - b.tileIds[0]);
  })();

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-900/90 p-4 rounded-xl border border-slate-700 shadow-xl my-2 lg:flex-1">
      {/* Prominent Property Portfolio & Management Section */}
      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col gap-2 flex-1 min-h-0">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between gap-2">
          <span>{currentPlayer.name}&apos;s Properties ({currentPlayer.properties.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">Manage Houses & Mortgages below</span>
        </h3>
        {propertyGroups.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No properties owned yet. Land on unowned properties and buy them!</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[60vh] lg:max-h-[calc(100vh-180px)] overflow-y-auto pr-1 flex-1 min-h-0">
            {propertyGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                {/* Group header: color band, label, and completeness indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-sm shrink-0',
                      colorMap[group.colorGroup] ?? 'bg-slate-600'
                    )}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {group.label}
                  </span>
                  <span
                    className={cn(
                      'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded',
                      group.isComplete
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    )}
                  >
                    {group.isComplete ? '✓ Complete' : `${group.owned}/${group.total}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.tileIds.map((tileId) => {
                    const tile = BOARD_SPACES[tileId];
                    const prop = properties[tileId];
                    if (!tile || !prop) return null;

                    return (
                      <div
                        key={tileId}
                        className={cn(
                          'relative p-2.5 bg-slate-900 rounded-lg flex flex-col justify-between gap-2 text-xs shadow',
                          group.isComplete && !prop.isMortgaged
                            ? 'border-2 border-emerald-500/70'
                            : 'border border-slate-700'
                        )}
                      >
                        {/* Property color banner background */}
                        {tile.colorGroup && colorMap[tile.colorGroup] && (
                          <div
                            className={cn('absolute left-0 top-0 bottom-0 w-1.5', colorMap[tile.colorGroup])}
                          />
                        )}
                        <div className="flex justify-between items-center gap-1 pl-1.5">
                          <span className="font-bold text-sm text-slate-100">{tile.name}</span>
                          <span className={prop.isMortgaged ? 'text-red-400 font-bold text-[10px] shrink-0' : 'text-emerald-400 font-bold text-[10px] shrink-0'}>
                            {prop.isMortgaged ? 'MORTGAGED' : prop.houses === 5 ? 'HOTEL 🏨' : `${prop.houses} 🏠`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 pl-1.5 border-t border-slate-800">
                          {tile.type === 'property' && tile.houseCost && !prop.isMortgaged && (
                            <>
                              {prop.houses < 5 && group.isComplete && (
                                <button
                                  onClick={() => onBuildHouse(tileId)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] shadow transition-all active:scale-95 cursor-pointer"
                                >
                                  + House (${tile.houseCost})
                                </button>
                              )}
                              {prop.houses > 0 && (
                                <button
                                  onClick={() => onSellHouse(tileId)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] shadow transition-all active:scale-95 cursor-pointer"
                                >
                                  - Sell ({Math.floor(tile.houseCost / 2)})
                                </button>
                              )}
                            </>
                          )}
                          {!prop.isMortgaged ? (
                            <button
                              onClick={() => onMortgage(tileId)}
                              className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded text-[10px] shadow transition-all active:scale-95 cursor-pointer"
                            >
                              Mortgage (+${Math.floor((tile.cost || 0) / 2)})
                            </button>
                          ) : (
                            <button
                              onClick={() => onUnmortgage(tileId)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] shadow transition-all active:scale-95 cursor-pointer"
                            >
                              Unmortgage (-${Math.floor((tile.cost || 0) / 2 * 1.1)})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
