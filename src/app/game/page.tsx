"use client";

import { useGameStore } from "../../store/gameStore";
import { Board } from "../../components/board/Board";
import { ActionPanel } from "../../components/controls/ActionPanel";
import { PassAndPlayScreen } from "../../components/controls/PassAndPlayScreen";
import { CardModal } from "../../components/modals/CardModal";
import { TradeModal } from "../../components/modals/TradeModal";
import { AuctionModal } from "../../components/modals/AuctionModal";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  subscribeSounds,
  getSoundsSnapshot,
  getSoundsServerSnapshot,
  setMuted,
} from "../../utils/sounds";

export default function GamePage() {
  const muted = useSyncExternalStore(
    subscribeSounds,
    getSoundsSnapshot,
    getSoundsServerSnapshot,
  );
  const {
    players,
    currentPlayerIndex,
    gamePhase,
    resetGame,
    properties,
    buildHouse,
    sellHouse,
    mortgageProperty,
    unmortgageProperty,
    winner,
  } = useGameStore();
  const router = useRouter();

  // Show winner modal whenever the game has ended with a winner
  const showWinnerModal = gamePhase === "ended" && Boolean(winner);

  if (gamePhase === "setup" || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-400">No active game found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-lg"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];

  const handleCloseWinnerModal = () => {
    resetGame();
    router.push("/");
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full mx-auto p-4">
      {/* Left / Top: Board */}
      <div className="flex justify-center lg:min-w-[70vw]">
        <Board players={players} />
      </div>

      {/* Right / Bottom: Controls & HUD */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">Game Control</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              title={muted ? "Unmute sounds" : "Mute sounds"}
              className="text-xs text-slate-300 hover:text-white font-semibold px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {muted ? "🔇 Muted" : "🔊 Sound"}
            </button>
            <button
              onClick={() => {
                resetGame();
                router.push("/");
              }}
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg"
            >
              Reset Game
            </button>
          </div>
        </div>

        {/* Property Portfolio (side panel is now dedicated to the property list) */}
        <ActionPanel
          currentPlayer={currentPlayer}
          properties={properties}
          onBuildHouse={buildHouse}
          onSellHouse={sellHouse}
          onMortgage={mortgageProperty}
          onUnmortgage={unmortgageProperty}
        />

        {/* Modals */}
        <CardModal />
        <TradeModal />
        <AuctionModal />

        {/* Pass & Play turn-handoff overlay (top-most) */}
        <PassAndPlayScreen />
      </div>

      {/* Winner Celebration Modal */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-linear-to-br from-amber-500 via-yellow-400 to-amber-600 rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4 animate-bounce">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-extrabold text-slate-950 mb-2">
              GAME OVER!
            </h2>
            <p className="text-xl font-bold text-slate-900 mb-1">
              {winner.winnerName} Wins!
            </p>
            <p className="text-sm text-slate-800 mb-6">{winner.reason}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCloseWinnerModal}
                className="px-6 py-3 bg-slate-950 text-amber-400 font-extrabold rounded-xl shadow-lg hover:bg-slate-900 transition-all active:scale-95 text-sm cursor-pointer"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
