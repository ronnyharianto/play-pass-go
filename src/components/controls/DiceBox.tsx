import React from 'react';
import { motion } from 'motion/react';

interface DiceBoxProps {
  dice: [number, number];
  isRolling: boolean;
}

export const DiceBox: React.FC<DiceBoxProps> = ({ dice, isRolling }) => {
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
    </div>
  );
};
