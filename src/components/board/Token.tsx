import React from 'react';

interface TokenProps {
  token: string;
  playerName: string;
  isMoving?: boolean;
  moveKey?: number; // increments each tile hop to retrigger the hop animation
}

export const Token: React.FC<TokenProps> = ({
  token,
  playerName,
  isMoving = false,
  moveKey = 0,
}) => {
  return (
    <span
      key={isMoving ? `move-${moveKey}-${playerName}` : `idle-${playerName}`}
      className={[
        'inline-flex items-center justify-center',
        'w-5 h-5 sm:w-6 sm:h-6',
        'rounded-full bg-slate-800 text-white text-[10px] sm:text-xs font-bold',
        'shadow-md border border-white/40',
        isMoving ? 'token-moving' : '',
      ].join(' ')}
      title={playerName}
    >
      {token}
    </span>
  );
};
