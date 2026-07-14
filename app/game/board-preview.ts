/**
 * Presentation-only: show the board as the human's staged (but not yet
 * committed) half-moves would leave it, so a picked-up checker visibly
 * lands where it was placed.
 *
 * This decides NO legality. Every move it relocates already came from the
 * engine's `movesFrom`, and the turn is still committed as one whole
 * engine `Play` via `applyPlay`. It simply mirrors the visible effect of
 * moves the engine has already blessed. With no staged moves it returns
 * the engine board unchanged.
 */

import { opponentOf } from "@/lib/engine";
import type { Board, Play, Player, Point } from "@/lib/engine";

export function previewBoard(board: Board, staged: Play, player: Player): Board {
  if (staged.length === 0) return board;

  const points: Point[] = board.points.slice();
  const bar = { ...board.bar };
  const off = { ...board.off };
  const foe = opponentOf(player);

  for (const move of staged) {
    // Leave the source.
    if (move.from === "bar") {
      bar[player] = Math.max(0, bar[player] - 1);
    } else {
      const src = points[move.from - 1];
      if (src && src.owner === player) {
        const count = src.count - 1;
        points[move.from - 1] = count > 0 ? { owner: player, count } : null;
      }
    }

    // Arrive at the destination.
    if (move.to === "off") {
      off[player] += 1;
    } else {
      const dest = points[move.to - 1];
      if (dest === null || dest.owner === player) {
        points[move.to - 1] = { owner: player, count: (dest?.count ?? 0) + 1 };
      } else {
        // A lone opposing checker is hit to the bar (engine-validated blot).
        bar[foe] += 1;
        points[move.to - 1] = { owner: player, count: 1 };
      }
    }
  }

  return { points, bar, off };
}
