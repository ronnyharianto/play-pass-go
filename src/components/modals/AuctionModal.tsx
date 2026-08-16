'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BOARD_SPACES } from '../../engine/boardData';

export const AuctionModal: React.FC = () => {
  const auction = useGameStore((s) => s.auction);
  const players = useGameStore((s) => s.players);
  const submitBid = useGameStore((s) => s.submitBid);
  const passAuction = useGameStore((s) => s.passAuction);
  const closeAuction = useGameStore((s) => s.closeAuction);

  const [bidInput, setBidInput] = useState('');

  if (!auction) return null;

  const tile = BOARD_SPACES[auction.tileId];
  const currentBidderId =
    auction.phase === 'bidding'
      ? auction.activeBidders[auction.currentBidderIndex]
      : null;
  const currentBidder = currentBidderId
    ? (players.find((p) => p.id === currentBidderId) ?? null)
    : null;
  const winner = auction.winnerId
    ? (players.find((p) => p.id === auction.winnerId) ?? null)
    : null;
  const highestBidder = auction.highestBidderId
    ? (players.find((p) => p.id === auction.highestBidderId) ?? null)
    : null;

  const minBid = auction.currentBid + 10;
  const parsedBid = Math.max(0, parseInt(bidInput || '0', 10) || 0);
  const bidValid = Boolean(
    currentBidder && parsedBid >= minBid && parsedBid <= currentBidder.cash
  );

  const handleBid = () => {
    if (!bidValid || !currentBidder) return;
    submitBid(parsedBid);
    setBidInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-slate-900 border border-slate-600 shadow-2xl p-5 text-center">
        <h2 className="text-lg font-extrabold text-amber-300 mb-1">🔨 Auction</h2>
        <p className="text-sm text-slate-200 font-bold mb-1">{tile.name}</p>
        <p className="text-[11px] text-slate-400 mb-4">Cost: ${tile.cost}</p>

        {auction.phase === 'bidding' && currentBidder ? (
          <>
            <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-3 mb-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Current Bid
              </p>
              <p className="text-2xl font-extrabold text-emerald-400">
                {auction.currentBid > 0 ? `$${auction.currentBid}` : '—'}
              </p>
              {highestBidder && auction.currentBid > 0 && (
                <p className="text-[11px] text-slate-400">
                  by {highestBidder.name}
                </p>
              )}
            </div>

            <p className="text-sm text-slate-200 mb-3">
              <span className="font-bold text-white">{currentBidder.name}</span>,
              your turn — bid at least{' '}
              <span className="font-bold text-emerald-400">${minBid}</span>
            </p>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => submitBid(minBid)}
                disabled={currentBidder.cash < minBid}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Bid ${minBid}
              </button>
              <button
                type="button"
                onClick={() => submitBid(Math.min(minBid + 40, currentBidder.cash))}
                disabled={currentBidder.cash < minBid + 40}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Bid ${minBid + 40}
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="number"
                min={minBid}
                max={currentBidder.cash}
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                placeholder={`Custom (max $${currentBidder.cash})`}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={handleBid}
                disabled={!bidValid}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Bid
              </button>
            </div>

            {!bidValid && bidInput !== '' && (
              <p className="text-[10px] text-red-400 font-bold mb-2">
                Bid must be ≥ ${minBid} and ≤ ${currentBidder.cash}.
              </p>
            )}

            <button
              type="button"
              onClick={passAuction}
              className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg text-sm cursor-pointer"
            >
              Pass
            </button>
          </>
        ) : auction.phase === 'won' && winner ? (
          <>
            <div className="bg-emerald-600/20 border border-emerald-500 rounded-xl p-4 mb-4">
              <p className="text-xl font-extrabold text-emerald-300">
                Sold to {winner.name} for ${auction.finalBid}!
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {winner.token} {winner.name} now owns {tile.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={closeAuction}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm cursor-pointer"
            >
              OK
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
