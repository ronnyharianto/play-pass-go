'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useRouter } from 'next/navigation';

const AVAILABLE_TOKENS = ['🚗', '🎩', '🐶', '⛵', '🐱', '🦕', '🏎️', '👑'];

export default function LobbyPage() {
  const [nameInput, setNameInput] = useState('');
  const { players, addPlayer, removePlayer, startGame, gamePhase } = useGameStore();

  // Find first available token not yet chosen by any player
  const takenTokens = players.map((p) => p.token);
  const firstAvailableToken = AVAILABLE_TOKENS.find((t) => !takenTokens.includes(t)) || '🚗';
  const [selectedToken, setSelectedToken] = useState(firstAvailableToken);

  // Duplicate name check — names identify players on the board and in
  // messages, so each player needs a unique one (case-insensitive).
  const trimmedName = nameInput.trim();
  const duplicateName = players.some(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
  );

  const router = useRouter();

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    if (duplicateName) return;
    if (takenTokens.includes(selectedToken)) return;

    addPlayer(nameInput, selectedToken);
    setNameInput('');

    // Pick next available token for next input
    const newTaken = [...takenTokens, selectedToken];
    const nextToken = AVAILABLE_TOKENS.find((t) => !newTaken.includes(t)) || '🚗';
    setSelectedToken(nextToken);
  };

  const handleStart = () => {
    if (players.length < 2) return;
    startGame();
    router.push('/game');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-xl mx-auto p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl w-full">
        <h1 className="text-3xl font-extrabold text-center text-amber-300 mb-2">
          Play, Pass & Go
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Add 2 to 4 players to start your local game. Each player must have a unique token.
        </p>

        {/* Add Player Form */}
        {players.length < 4 && (
          <form onSubmit={handleAddPlayer} className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={`Player ${players.length + 1}`}
                maxLength={12}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-hidden focus:border-amber-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Up to 12 characters — names are shown on the board to mark your properties.
              </p>
              {trimmedName && duplicateName && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">
                  ⚠️ “{trimmedName}” is already taken — each player needs a unique name.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Token (Unique)
              </label>
              <div className="flex gap-2 flex-wrap">
                {AVAILABLE_TOKENS.map((token) => {
                  const isTaken = takenTokens.includes(token);
                  const isSelected = selectedToken === token;
                  return (
                    <button
                      key={token}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setSelectedToken(token)}
                      className={`w-10 h-10 text-xl rounded-lg border flex items-center justify-center transition-all ${
                        isTaken
                          ? 'bg-slate-800/40 border-slate-800 opacity-30 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-amber-400/20 border-amber-400 scale-105 shadow-md'
                          : 'bg-slate-950 border-slate-700 hover:border-slate-500 cursor-pointer'
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={trimmedName.length > 0 && duplicateName}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition-all active:scale-98 cursor-pointer mt-2"
            >
              Add Player
            </button>
          </form>
        )}

        {/* Players List */}
        <div className="space-y-2 mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Players ({players.length}/4)
          </h2>
          {players.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No players added yet.</p>
          ) : (
            players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800 px-4 py-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.token}</span>
                  <span className="font-bold text-slate-200">{p.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePlayer(p.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Start Game Button */}
        <button
          onClick={handleStart}
          disabled={players.length < 2}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer text-base"
        >
          {players.length < 2 ? 'Add at least 2 players' : 'Start a New Game'}
        </button>

        {/* Resume Game Button */}
        <button
          onClick={() => router.push('/game')}
          disabled={gamePhase !== 'playing' && gamePhase !== 'ended'}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition-all active:scale-98 cursor-pointer text-sm mt-3"
        >
          Resume the Last Game
        </button>
      </div>
    </div>
  );
}
