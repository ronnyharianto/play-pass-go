import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';

interface DiceBoxProps {
  dice: [number, number];
  isRolling: boolean;
}

const parseDie = (value: string): number | null => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
};

export const DiceBox: React.FC<DiceBoxProps> = ({ dice, isRolling }) => {
  const rollDice = useGameStore((s) => s.rollDice);
  const setManualDice = useGameStore((s) => s.setManualDice);
  const hasRolled = useGameStore((s) => s.hasRolled);
  const isMoving = useGameStore((s) => s.isMoving);

  // Dev-only manual dice override. process.env.NODE_ENV is inlined at build
  // time, so this UI never ships (or renders) in production builds.
  const isDev = process.env.NODE_ENV === 'development';
  const [manualD1, setManualD1] = useState('3');
  const [manualD2, setManualD2] = useState('4');
  const manualDisabled =
    isRolling || isMoving || hasRolled ||
    parseDie(manualD1) === null || parseDie(manualD2) === null;

  const manualRoll = () => {
    const v1 = parseDie(manualD1);
    const v2 = parseDie(manualD2);
    if (v1 === null || v2 === null) return;
    setManualDice([v1, v2]);
    rollDice();
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700 shadow-md">
      <span className="text-sm text-slate-400 font-medium">Dice:</span>
      <div className="flex gap-2">
        {dice.map((val, idx) => (
          <motion.div
            key={idx}
            animate={isRolling ? { rotate: [0, 360, 720], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold text-amber-300 shadow-inner"
          >
            {val}
          </motion.div>
        ))}
      </div>

      {isDev && (
        <div
          className="flex items-center gap-1.5 border-l border-slate-700 pl-3"
          title="Manual dice — development only"
        >
          <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
            Dev dice
          </span>
          <input
            type="number"
            min={1}
            max={6}
            value={manualD1}
            onChange={(e) => setManualD1(e.target.value)}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-sm text-amber-300 focus:outline-hidden focus:border-amber-400"
            aria-label="Manual die 1"
          />
          <input
            type="number"
            min={1}
            max={6}
            value={manualD2}
            onChange={(e) => setManualD2(e.target.value)}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-sm text-amber-300 focus:outline-hidden focus:border-amber-400"
            aria-label="Manual die 2"
          />
          <button
            onClick={manualRoll}
            disabled={manualDisabled}
            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded text-[11px] cursor-pointer"
          >
            Roll
          </button>
        </div>
      )}
    </div>
  );
};
