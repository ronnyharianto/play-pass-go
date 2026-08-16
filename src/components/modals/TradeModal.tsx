'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BOARD_SPACES } from '../../engine/boardData';
import { cn } from '../../utils/cn';
import { colorMap } from '../../utils/groupColors';

export const TradeModal: React.FC = () => {
  const trade = useGameStore((s) => s.trade);
  const players = useGameStore((s) => s.players);
  const properties = useGameStore((s) => s.properties);
  const sendTradeOffer = useGameStore((s) => s.sendTradeOffer);
  const acceptTrade = useGameStore((s) => s.acceptTrade);
  const declineTrade = useGameStore((s) => s.declineTrade);
  const closeTrade = useGameStore((s) => s.closeTrade);

  // Draft state (proposing phase only)
  const [targetId, setTargetId] = useState<string | null>(null);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [offerCash, setOfferCash] = useState('');
  const [requestCash, setRequestCash] = useState('');

  // The modal stays mounted between trades (it just renders null), so the
  // draft state above persists. Wipe it whenever a new trade session starts
  // (trade closed/completed, or a fresh proposing phase) — otherwise stale
  // selections, e.g. properties that were already traded away, make the
  // next Send Offer fail silently with no response.
  useEffect(() => {
    if (!trade || trade.phase === 'proposing') {
      setTargetId(null);
      setOfferProps([]);
      setRequestProps([]);
      setOfferCash('');
      setRequestCash('');
    }
  }, [trade]);

  if (!trade) return null;

  const from = players.find((p) => p.id === trade.fromId) ?? null;
  const toId = trade.phase === 'review' ? trade.toId : targetId;
  const to = toId ? (players.find((p) => p.id === toId) ?? null) : null;

  const toggleOffer = (tileId: number) =>
    setOfferProps((list) =>
      list.includes(tileId) ? list.filter((id) => id !== tileId) : [...list, tileId]
    );
  const toggleRequest = (tileId: number) =>
    setRequestProps((list) =>
      list.includes(tileId) ? list.filter((id) => id !== tileId) : [...list, tileId]
    );

  const offerCashNum = Math.max(0, parseInt(offerCash || '0', 10) || 0);
  const requestCashNum = Math.max(0, parseInt(requestCash || '0', 10) || 0);

  const otherPlayers = players.filter(
    (p) => p.id !== trade.fromId && !p.isBankrupt
  );

  const canSend = Boolean(
    to &&
      offerProps.length + requestProps.length >= 1 &&
      offerCashNum <= (from?.cash ?? 0) &&
      requestCashNum <= (to?.cash ?? 0)
  );

  const canAccept =
    trade.phase === 'review' &&
    Boolean(to) &&
    (trade.requestCash ?? 0) <= (to?.cash ?? 0);

  const renderPropsList = (
    tileIds: number[],
    selected: number[],
    onToggle: (id: number) => void
  ) => (
    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
      {tileIds.length === 0 && (
        <p className="text-[11px] text-slate-500 italic">No properties.</p>
      )}
      {tileIds.map((tileId) => {
        const tile = BOARD_SPACES[tileId];
        const prop = properties[tileId];
        const isSelected = selected.includes(tileId);
        const hasBuildings = (prop?.houses ?? 0) > 0;
        const isMortgaged = Boolean(prop?.isMortgaged);
        const isTradable = !hasBuildings;
        return (
          <button
            key={tileId}
            type="button"
            disabled={!isTradable}
            onClick={() => onToggle(tileId)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md border text-left text-xs transition-all',
              isSelected
                ? 'bg-emerald-600/30 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300',
              !isTradable && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-sm shrink-0',
                tile.colorGroup ? colorMap[tile.colorGroup] : 'bg-slate-500'
              )}
            />
            <span className="font-semibold truncate">{tile.name}</span>
            {isMortgaged && (
              <span className="text-[9px] text-red-400 font-bold">MORTGAGED</span>
            )}
            {hasBuildings && (
              <span className="text-[9px] text-amber-400 font-bold">🏠 Sell first</span>
            )}
            {isTradable && (
              <span className="ml-auto text-[10px]">{isSelected ? '✓' : '+'}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-600 shadow-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-amber-300">
            {trade.phase === 'proposing' ? '✋ Trade' : '🤝 Trade Offer Review'}
          </h2>
          {trade.phase === 'proposing' && (
            <button
              type="button"
              onClick={closeTrade}
              className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {trade.phase === 'proposing' && from ? (
          <>
            {/* Target selector */}
            <div className="mb-3">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trade with
              </label>
              <div className="flex flex-wrap gap-1.5">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setTargetId(p.id);
                      setRequestProps([]);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                      targetId === p.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    {p.token} {p.name} (${p.cash})
                  </button>
                ))}
              </div>
            </div>

            {/* Properties both ways */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  You give ({offerProps.length})
                </h3>
                {renderPropsList(from.properties, offerProps, toggleOffer)}
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  You receive ({requestProps.length})
                </h3>
                {to ? (
                  renderPropsList(to.properties, requestProps, toggleRequest)
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Select a player first.
                  </p>
                )}
              </div>
            </div>

            {/* Cash both ways */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  You give $
                </label>
                <input
                  type="number"
                  min={0}
                  max={from.cash}
                  value={offerCash}
                  onChange={(e) => setOfferCash(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-amber-400"
                />
                {offerCashNum > from.cash && (
                  <p className="text-[10px] text-red-400 font-bold mt-0.5">
                    Exceeds your cash (${from.cash})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  You receive $
                </label>
                <input
                  type="number"
                  min={0}
                  max={to?.cash ?? 0}
                  value={requestCash}
                  onChange={(e) => setRequestCash(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-amber-400"
                />
                {requestCashNum > (to?.cash ?? 0) && (
                  <p className="text-[10px] text-red-400 font-bold mt-0.5">
                    Exceeds their cash
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeTrade}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSend || !toId}
                onClick={() =>
                  toId &&
                  sendTradeOffer({
                    toId,
                    offerProps,
                    requestProps,
                    offerCash: offerCashNum,
                    requestCash: requestCashNum,
                  })
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Send Offer
              </button>
            </div>
            {offerProps.length + requestProps.length < 1 && (
              <p className="text-[10px] text-slate-400 mt-2 text-right">
                At least one property must be included in the trade.
              </p>
            )}
          </>
        ) : from && to ? (
          <>
            <p className="text-sm text-slate-300 mb-4 text-center">
              <span className="font-bold text-slate-100">{to.name}</span>, review
              this offer from{' '}
              <span className="font-bold text-slate-100">{from.name}</span>:
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <div className="bg-slate-950/60 border border-slate-700 rounded-lg p-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {from.name} gives
                </p>
                <p className="text-sm text-slate-200">
                  {trade.offerProps.length > 0
                    ? trade.offerProps
                        .map((id) => BOARD_SPACES[id]?.name)
                        .join(', ')
                    : 'No properties'}
                  {trade.offerCash > 0 && ` + $${trade.offerCash}`}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-700 rounded-lg p-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {to.name} gives
                </p>
                <p className="text-sm text-slate-200">
                  {trade.requestProps.length > 0
                    ? trade.requestProps
                        .map((id) => BOARD_SPACES[id]?.name)
                        .join(', ')
                    : 'No properties'}
                  {trade.requestCash > 0 && ` + $${trade.requestCash}`}
                </p>
              </div>
            </div>

            {trade.requestCash > to.cash && (
              <p className="text-[11px] text-red-400 font-bold text-center mb-2">
                You can&apos;t afford the requested ${trade.requestCash} (you have
                ${to.cash}).
              </p>
            )}

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={declineTrade}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={!canAccept}
                onClick={acceptTrade}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Accept
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
