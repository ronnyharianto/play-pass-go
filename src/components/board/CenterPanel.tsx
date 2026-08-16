import React from "react";
import { useGameStore } from "../../store/gameStore";
import { BOARD_SPACES } from "../../engine/boardData";
import { DiceBox } from "../controls/DiceBox";
import { cn } from "../../utils/cn";

/**
 * Center panel of the Monopoly board.
 *
 * Hosts the Free Parking pot, player status cards (turn, position, cash),
 * the dice, the status message and the main action buttons (Roll Dice /
 * End Turn / Trade / Buy), plus the debt-resolution and transaction popup
 * overlays. Keeping these in the board center frees the side panel for the
 * (much more readable) property list.
 */
export const CenterPanel: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const dice = useGameStore((s) => s.dice);
  const isRolling = useGameStore((s) => s.isRolling);
  const isMoving = useGameStore((s) => s.isMoving);
  const hasRolled = useGameStore((s) => s.hasRolled);
  const message = useGameStore((s) => s.message);
  const properties = useGameStore((s) => s.properties);
  const freeParkingPot = useGameStore((s) => s.freeParkingPot);
  const showDebtResolution = useGameStore((s) => s.showDebtResolution);
  const debtAmount = useGameStore((s) => s.debtAmount);
  const declinedTile = useGameStore((s) => s.declinedTile);
  const trade = useGameStore((s) => s.trade);
  const auction = useGameStore((s) => s.auction);
  const transactionPopup = useGameStore((s) => s.transactionPopup);

  const rollDice = useGameStore((s) => s.rollDice);
  const endTurn = useGameStore((s) => s.endTurn);
  const buyProperty = useGameStore((s) => s.buyProperty);
  const payBail = useGameStore((s) => s.payBail);
  const useGetOutOfJailCard = useGameStore((s) => s.useGetOutOfJailCard);
  const payDebt = useGameStore((s) => s.payDebt);
  const declareBankruptcy = useGameStore((s) => s.declareBankruptcy);
  const startTrade = useGameStore((s) => s.startTrade);

  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;

  const currentTile = BOARD_SPACES[currentPlayer.position];
  const currentTileProp = properties[currentTile.id];
  const isBuyable = Boolean(
    currentTile.cost &&
    (currentTile.type === "property" ||
      currentTile.type === "railroad" ||
      currentTile.type === "utility") &&
    (!currentTileProp || !currentTileProp.owner) &&
    // A tile the current player declined (auctioned, no sale) can't be
    // bought or re-auctioned until the next roll/turn.
    currentTile.id !== declinedTile,
  );

  const canBuy = Boolean(
    !isMoving &&
    !auction &&
    !trade &&
    isBuyable &&
    currentPlayer.cash >= (currentTile.cost || 0) &&
    (!currentTileProp || currentTileProp.owner === null),
  );

  // "Decline & Auction" is offered on any unowned property the current
  // player lands on — even when they cannot afford to buy it.
  const isAuctionable = Boolean(
    !isMoving && !showDebtResolution && !auction && !trade && isBuyable,
  );

  const canTrade = Boolean(
    !isRolling &&
    !isMoving &&
    !showDebtResolution &&
    !trade &&
    !auction &&
    players.filter((p) => !p.isBankrupt).length >= 2,
  );

  return (
    <div className="relative h-full w-full bg-emerald-950/40 border border-emerald-800/50 p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 overflow-hidden">
      {/* Header: game title + Free Parking Pot */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-amber-300 font-extrabold tracking-wider text-sm sm:text-xl drop-shadow-md shrink-0">
          PLAY, PASS & GO
        </span>
        <div className="flex items-center justify-center gap-1.5 bg-slate-900/70 border border-slate-700 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 min-w-0">
          <span className="text-[10px] sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
            🅿️<span className="hidden sm:inline"> Free Parking Pot</span>
          </span>
          <span className="text-xs sm:text-lg font-extrabold text-emerald-400">
            ${freeParkingPot}
          </span>
        </div>
      </div>

      {/* Player status cards — stretch to fill the center space */}
      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2.5 w-full flex-1 min-h-0">
        {players.map((p, idx) => {
          const isCurrent = idx === currentPlayerIndex;
          return (
            <div
              key={p.id}
              className={cn(
                // overflow-hidden keeps content inside the card when the grid
                // row is shorter than the content, so nothing ever renders
                // outside the card's border.
                "p-2 sm:p-3 rounded-lg border flex flex-col justify-between gap-1 sm:gap-2 min-w-0 overflow-hidden transition-all",
                isCurrent
                  ? "bg-emerald-900/70 border-emerald-400 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950"
                  : "bg-slate-900/60 border-slate-700 opacity-80",
              )}
            >
              <div className="flex items-center justify-between gap-1 min-w-0">
                <span className="font-bold text-xs sm:text-lg truncate flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl shrink-0">
                    {p.token}
                  </span>
                  <span className="truncate">{p.name}</span>
                </span>
                {isCurrent && (
                  <span className="shrink-0 text-[9px] sm:text-xs bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                    TURN
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 min-w-0 text-sm sm:text-xl font-semibold">
                <span className="text-amber-400 font-extrabold shrink-0">
                  ${p.cash}
                </span>
                {/* Cash on the left; jail-free cards, position and the
                    property count share one row so the card stays compact -
                    no separate bottom row that can overflow a short card. */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 text-[10px] sm:text-sm flex-wrap min-w-0">
                  {(p.getOutOfJailCards ?? 0) > 0 && (
                    <span
                      className="text-violet-400 font-bold shrink-0"
                      title="Get Out of Jail Free cards"
                    >
                      🔑×{p.getOutOfJailCards}
                    </span>
                  )}
                  <span
                    className="text-slate-400 font-semibold shrink-0"
                    title="Position on the board"
                  >
                    Pos: {p.position}
                  </span>
                  <span className="text-slate-500 shrink-0" aria-hidden="true">
                    |
                  </span>
                  <span
                    className="text-slate-400 font-semibold shrink-0"
                    title={`${p.properties.length} properties owned`}
                  >
                    🧾 Owned: {p.properties.length}
                  </span>
                  {p.isBankrupt && (
                    <span className="text-red-400 font-bold shrink-0">
                      BANKRUPT
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-[11px] sm:text-sm font-medium text-slate-200 bg-slate-950/60 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-800 flex items-center gap-1.5">
        <span className="text-amber-400 font-bold shrink-0">Status:</span>
        <span className="truncate">{message}</span>
      </div>

      {/* Jail sub-panel */}
      {currentPlayer.inJail && (
        <div className="p-2 sm:p-3 bg-slate-800/80 border-2 border-amber-500/60 rounded-xl">
          <h3 className="text-amber-300 font-extrabold text-xs sm:text-sm mb-1.5 sm:mb-2 text-center">
            🚔 You are in Jail (turn {currentPlayer.jailTurns}/3)
          </h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {!hasRolled && (
              <>
                <button
                  onClick={payBail}
                  disabled={
                    currentPlayer.cash < 50 ||
                    isRolling ||
                    isMoving ||
                    showDebtResolution
                  }
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] sm:text-sm shadow transition-all active:scale-95 cursor-pointer"
                >
                  Pay $50 Bail
                </button>
                {(currentPlayer.getOutOfJailCards ?? 0) > 0 && (
                  <button
                    onClick={useGetOutOfJailCard}
                    disabled={isRolling || isMoving || showDebtResolution}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] sm:text-sm shadow transition-all active:scale-95 cursor-pointer"
                  >
                    Use Get Out of Jail Free ({currentPlayer.getOutOfJailCards})
                  </button>
                )}
              </>
            )}
            {!hasRolled && currentPlayer.jailTurns >= 2 && (
              <span className="text-[9px] sm:text-xs text-red-300 font-bold self-center text-center">
                ⚠️ Turn 3 / last chance — must pay bail
                {currentPlayer.cash < 50 &&
                  (currentPlayer.getOutOfJailCards ?? 0) === 0 && (
                    <>
                      {" "}
                      — can&apos;t afford bail; rolling will force bankruptcy
                    </>
                  )}
              </span>
            )}
            {hasRolled && (
              <span className="text-[9px] sm:text-xs text-slate-300 font-bold self-center text-center">
                Your turn in Jail is over — End your turn. Jail options return
                on your next turn.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dice + main action buttons */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <DiceBox dice={dice} isRolling={isRolling} />
          {!hasRolled ? (
            <button
              onClick={rollDice}
              disabled={
                isRolling ||
                isMoving ||
                showDebtResolution ||
                Boolean(trade) ||
                Boolean(auction)
              }
              className="px-5 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 text-sm sm:text-base cursor-pointer"
            >
              {isRolling ? "Rolling..." : isMoving ? "Moving..." : "Roll Dice"}
            </button>
          ) : (
            <button
              onClick={endTurn}
              // Clicking End Turn while standing on an unowned property is the
              // "decline to buy" — the store auto-starts the auction instead,
              // so the label says so.
              disabled={
                isRolling ||
                isMoving ||
                showDebtResolution ||
                Boolean(trade) ||
                Boolean(auction)
              }
              className={cn(
                "px-5 sm:px-6 py-2 sm:py-2.5 disabled:opacity-50 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 text-sm sm:text-base cursor-pointer",
                isAuctionable
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "bg-slate-700 hover:bg-slate-600",
              )}
            >
              {isAuctionable ? "End Turn & Auction" : "End Turn"}
            </button>
          )}

          <button
            onClick={startTrade}
            disabled={!canTrade}
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 text-sm sm:text-base cursor-pointer"
          >
            Trade
          </button>

          {isAuctionable && canBuy && (
            <button
              onClick={() => buyProperty(currentTile.id)}
              disabled={isMoving || showDebtResolution}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-lg shadow-md transition-all active:scale-95 text-sm sm:text-base cursor-pointer animate-pulse"
            >
              Buy {currentTile.name} (${currentTile.cost})
            </button>
          )}
        </div>

        {isAuctionable && (
          <p className="text-[9px] sm:text-xs text-cyan-200/90 font-medium text-center">
            {canBuy
              ? `Buy ${currentTile.name} or end your turn — ending your turn sends it to auction.`
              : `You can't afford ${currentTile.name} — ending your turn sends it to auction.`}
          </p>
        )}
      </div>

      {/* Floating transaction animation popup */}
      {transactionPopup && (
        <div
          className={cn(
            "absolute left-1/2 top-8 -translate-x-1/2 z-50 px-4 py-2 rounded-xl font-extrabold text-lg shadow-2xl animate-bounce tracking-wide",
            transactionPopup.type === "gain"
              ? "bg-emerald-500 text-slate-950 border-2 border-emerald-300"
              : "bg-red-600 text-white border-2 border-red-300",
          )}
        >
          {transactionPopup.text}
        </div>
      )}

      {/* Debt resolution overlay — pauses the game until resolved */}
      {showDebtResolution && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-red-950/95 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500 rounded-xl p-4 text-center animate-pulse">
            <h3 className="text-red-400 font-extrabold text-lg mb-2">
              ⚠️ DEBT RESOLUTION ⚠️
            </h3>
            <p className="text-white font-bold mb-3">
              {currentPlayer.name} owes{" "}
              <span className="text-red-400 text-xl">${debtAmount}</span>!
            </p>
            <div className="flex flex-col gap-2 items-center">
              <p className="text-slate-300 text-sm">
                Choose an action to resolve debt:
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={() =>
                    payDebt(Math.min(currentPlayer.cash, debtAmount))
                  }
                  disabled={currentPlayer.cash <= 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow transition-all active:scale-95"
                >
                  Pay ${Math.min(currentPlayer.cash, debtAmount)}
                </button>
                <button
                  onClick={declareBankruptcy}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm shadow transition-all active:scale-95"
                >
                  Declare Bankruptcy
                </button>
              </div>
              <p className="text-slate-400 text-xs mt-2">
                You can also mortgage properties first to raise cash, then pay
                debt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
