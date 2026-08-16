'use client';

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '../../utils/cn';

export const CardModal: React.FC = () => {
  const pendingCard = useGameStore((s) => s.pendingCard);
  const applyCardEffect = useGameStore((s) => s.applyCardEffect);

  if (!pendingCard) return null;

  const isChance = pendingCard.type === 'chance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          'mx-4 w-full max-w-md rounded-2xl p-6 shadow-2xl',
          'border-4 border-dashed',
          isChance ? 'border-orange-500 bg-orange-950/95' : 'border-blue-500 bg-blue-950/95',
        )}
      >
        {/* Card badge */}
        <div className="flex justify-center mb-4">
          <span
            className={cn(
              'text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest',
              isChance
                ? 'bg-orange-500 text-slate-950'
                : 'bg-blue-500 text-white',
            )}
          >
            {isChance ? '🎲 CHANCE' : '📦 COMMUNITY CHEST'}
          </span>
        </div>

        {/* Card text */}
        <div className="bg-white/10 rounded-xl p-4 mb-6 min-h-[80px] flex items-center justify-center">
          <p className="text-slate-100 text-center font-semibold text-sm leading-relaxed">
            {pendingCard.text}
          </p>
        </div>

        {/* Confirmation button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              applyCardEffect();
            }}
            className={cn(
              'px-8 py-3 rounded-xl font-extrabold text-base shadow-lg',
              'transition-all active:scale-95 cursor-pointer',
              isChance
                ? 'bg-orange-500 hover:bg-orange-400 text-slate-950'
                : 'bg-blue-600 hover:bg-blue-500 text-white',
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

