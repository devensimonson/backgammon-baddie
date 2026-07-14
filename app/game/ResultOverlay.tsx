"use client";

import type { GameResult, Player } from "@/lib/engine";
import { ShareIcon } from "./icons";

const YOU_SUB: Record<GameResult["kind"], string> = {
  single: "A clean single game. Your record just ticked up.",
  gammon: "A gammon. Double the sting for The Baddie.",
  backgammon: "A backgammon. About as bad as it gets for The Baddie.",
  drop: "You win this one.",
};

const BAD_SUB: Record<GameResult["kind"], string> = {
  single: "A close single game. Shake it off and go again.",
  gammon: "A gammon. That one counts double.",
  backgammon: "A backgammon. The heaviest kind of loss.",
  drop: "The Baddie takes this one.",
};

export function ResultOverlay({
  result,
  human,
  said,
  onAgain,
  onShare,
}: {
  result: GameResult;
  human: Player;
  said: string;
  onAgain: () => void;
  onShare: () => void;
}) {
  const youWon = result.winner === human;
  return (
    <div className={`overlay ${youWon ? "you-win" : "bad-win"}`} role="dialog" aria-modal="true" aria-label="Game result">
      <div className="result">
        <span className="badge-r">{youWon ? "You win" : "The Baddie wins"}</span>
        <h2>{youWon ? "You beat The Baddie" : "The Baddie got you"}</h2>
        <div className="sub">{(youWon ? YOU_SUB : BAD_SUB)[result.kind]}</div>
        <div className="said">&ldquo;{said}&rdquo;</div>
        <div className="r-actions">
          <button type="button" className="again" onClick={onAgain}>
            Play again
          </button>
          <button type="button" className="share2" onClick={onShare}>
            <ShareIcon />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
