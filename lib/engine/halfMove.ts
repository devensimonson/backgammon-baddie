/**
 * Legality and effect of ONE half-move: one checker moved by one die.
 *
 * This file knows every rule that applies to a single die:
 *   - bar entry must come before anything else, on the entry point the
 *     die maps to in the opponent's home board;
 *   - a point held by 2+ opposing checkers is blocked;
 *   - landing on a lone opposing checker hits it to the bar;
 *   - bear-off: only with every checker home; exactly-matching die, or
 *     a die larger than the highest occupied point bearing off from
 *     that highest point.
 *
 * What it deliberately does NOT know: the maximum-use rule. That is a
 * property of complete turns and lives in plays.ts.
 */

import {
  allCheckersHome,
  highestOccupiedHomePoint,
  isBlocked,
  isBlot,
  opponentOf,
  pointAt,
  pointFor,
} from "./board";
import type { Board, Die, HalfMove, Player, Point } from "./types";

/**
 * Every legal half-move for `player` using one die on this board.
 * With checkers on the bar, entering is the only option (FR-09).
 */
export function halfMovesFor(board: Board, player: Player, die: Die): HalfMove[] {
  if (board.bar[player] > 0) {
    // Entry: die d maps to the player's relative (25 - d) point, which
    // sits in the opponent's home board (die 1 -> the farthest point).
    const entry = pointFor(player, 25 - die);
    return isBlocked(board, player, entry) ? [] : [{ from: "bar", to: entry, die }];
  }

  const moves: HalfMove[] = [];
  const canBearOff = allCheckersHome(board, player);
  const highestHome = canBearOff ? highestOccupiedHomePoint(board, player) : null;

  for (let rel = 1; rel <= 24; rel++) {
    const from = pointFor(player, rel);
    const point = pointAt(board, from);
    if (point === null || point.owner !== player) continue;

    const destRel = rel - die;
    if (destRel >= 1) {
      const to = pointFor(player, destRel);
      if (!isBlocked(board, player, to)) moves.push({ from, to, die });
    } else if (canBearOff) {
      // destRel === 0: the die exactly bears this checker off.
      // destRel < 0: the die overshoots; legal only from the highest
      // occupied point, when no checker sits above it.
      if (destRel === 0 || rel === highestHome) {
        moves.push({ from, to: "off", die });
      }
    }
  }
  return moves;
}

/** Is this specific half-move legal here? (Same source of truth as halfMovesFor.) */
export function canPlayHalfMove(board: Board, player: Player, move: HalfMove): boolean {
  return halfMovesFor(board, player, move.die).some(
    (legal) => legal.from === move.from && legal.to === move.to,
  );
}

/**
 * Apply a legal half-move, returning a new board. Landing on a lone
 * opposing checker hits it to the bar.
 */
export function applyHalfMove(board: Board, player: Player, move: HalfMove): Board {
  const points = board.points.slice();
  let bar = board.bar;
  let off = board.off;

  // Lift the checker from its source.
  if (move.from === "bar") {
    bar = { ...bar, [player]: bar[player] - 1 };
  } else {
    const source = points[move.from - 1] as NonNullable<Point>;
    points[move.from - 1] =
      source.count === 1 ? null : { owner: player, count: source.count - 1 };
  }

  // Land it.
  if (move.to === "off") {
    off = { ...off, [player]: off[player] + 1 };
  } else {
    if (isBlot(board, player, move.to)) {
      const opponent = opponentOf(player);
      bar = { ...bar, [opponent]: bar[opponent] + 1 };
      points[move.to - 1] = { owner: player, count: 1 };
    } else {
      const dest = points[move.to - 1];
      points[move.to - 1] = { owner: player, count: (dest?.count ?? 0) + 1 };
    }
  }

  return { points, bar, off };
}
