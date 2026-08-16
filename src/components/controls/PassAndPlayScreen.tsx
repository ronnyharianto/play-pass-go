'use client';

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion } from 'motion/react';

/**
 * Full-screen Pass & Play handoff overlay. Shown between turns so the device
 * can be handed to the next player with the board, cash and properties
 * completely hidden underneath.
 */
export const PassAndPlayScreen: React.FC = () => {
  const handoff = useGameStore((s) => s.handoff);
  const confirmHandoff = useGameStore((s) => s.confirmHandoff);

  if (!handoff) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center px-6"
      >
        <div className="text-7xl mb-4 animate-bounce">{handoff.token}</div>
        <h2 className="text-2xl font-extrabold text-slate-100 mb-1">
          {handoff.playerName}&apos;s Turn
        </h2>
        <p className="text-sm text-slate-400 mb-8 max-w-sm">
          Pass the device to{' '}
          <span className="font-bold text-slate-200">{handoff.playerName}</span>.
          The board is hidden so the previous turn&apos;s details stay private.
        </p>
        <button
          onClick={confirmHandoff}
          className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-95 text-lg cursor-pointer"
        >
          I&apos;m Ready — Start Turn
        </button>
      </motion.div>
    </div>
  );
};
