'use client';

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  GAME_FEATURE_TOGGLES,
  isDefaultGameSettings,
} from '../../engine/gameSettings';
import { cn } from '../../utils/cn';

/**
 * Landing-page card for the optional rule features (auctions, trading, Free
 * Parking pot, jail-free cards). Core rules — houses/hotels and mortgages —
 * are always on and are not listed here.
 *
 * These choices describe the NEXT game: the store freezes them into the game's
 * rules when it starts, so they can be changed at any time without altering a
 * game already in progress.
 */
export const GameSettingsPanel: React.FC = () => {
  const settings = useGameStore((s) => s.settings);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const setSetting = useGameStore((s) => s.setSetting);
  const resetSettings = useGameStore((s) => s.resetSettings);

  const gameInProgress = gamePhase === 'playing';
  const isClassic = isDefaultGameSettings(settings);

  return (
    <section
      aria-labelledby="game-settings-heading"
      className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl w-full mt-4"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2
          id="game-settings-heading"
          className="text-xl font-bold text-amber-300"
        >
          Game Settings
        </h2>
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border shrink-0',
            isClassic
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/60'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/60'
          )}
        >
          {isClassic ? 'Classic rules' : 'Custom rules'}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Turn optional rules on or off for your next game. Houses, hotels and
        mortgages are always enabled.
      </p>

      {gameInProgress && (
        <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2 mb-3">
          ℹ️ A game is in progress — it keeps the rules it started with. Changes
          here apply the next time you start a game.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {GAME_FEATURE_TOGGLES.map((feature) => {
          const enabled = settings[feature.key];
          return (
            // The whole row is a <label>, so tapping anywhere on it (not just
            // the switch) toggles the feature.
            <label
              key={feature.key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors cursor-pointer select-none',
                enabled
                  ? 'bg-slate-950/60 border-slate-700 hover:border-emerald-500/60'
                  : 'bg-slate-950/30 border-slate-800 hover:border-slate-600'
              )}
            >
              <span className="flex items-start gap-3 min-w-0">
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {feature.icon}
                </span>
                <span className="min-w-0 block">
                  <span className="block text-sm font-bold text-slate-100">
                    {feature.label}
                  </span>
                  <span className="block text-[11px] text-slate-400 leading-snug">
                    {feature.description}
                  </span>
                </span>
              </span>

              <input
                type="checkbox"
                className="peer sr-only"
                checked={enabled}
                onChange={(e) => setSetting(feature.key, e.target.checked)}
                aria-label={`${feature.label}: ${enabled ? 'on' : 'off'}`}
              />
              {/* Switch track; peer-focus-visible keeps keyboard focus visible. */}
              <span
                aria-hidden="true"
                className={cn(
                  'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900',
                  enabled
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-slate-700 border-slate-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                    enabled && 'translate-x-6'
                  )}
                />
              </span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={resetSettings}
        disabled={isClassic}
        className="w-full mt-4 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer"
      >
        Reset to classic rules
      </button>
    </section>
  );
};
