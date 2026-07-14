/**
 * Win detection, gammon/backgammon classification, and stake math.
 *
 * A played-out win is classified by how far the loser got:
 *   - single (x1):     the loser has borne off at least one checker;
 *   - gammon (x2):     the loser has borne off none;
 *   - backgammon (x3): the loser has borne off none AND still has a
 *     checker in the winner's home board or on the bar.
 *
 * Final stake = base stake (1) x cube value x that multiplier.
 * (A dropped double is settled in cube.ts and never reaches here.)
 */

import { checkersAt, opponentOf, pointFor } from "./board";
import type { Board, CubeState, GameResult, Player, ResultKind } from "./types";

/** Has this player borne off all 15 checkers? */
export function hasWon(board: Board, player: Player): boolean {
  return board.off[player] === 15;
}

export function classifyWin(board: Board, winner: Player): Exclude<ResultKind, "drop"> {
  const loser = opponentOf(winner);
  if (board.off[loser] > 0) return "single";

  // Winner's home board is their relative points 1-6.
  let loserInWinnersHome = board.bar[loser] > 0;
  for (let rel = 1; rel <= 6 && !loserInWinnersHome; rel++) {
    loserInWinnersHome = checkersAt(board, loser, pointFor(winner, rel)) > 0;
  }
  return loserInWinnersHome ? "backgammon" : "gammon";
}

const MULTIPLIER: Record<Exclude<ResultKind, "drop">, number> = {
  single: 1,
  gammon: 2,
  backgammon: 3,
};

export function resultForWin(board: Board, winner: Player, cube: CubeState): GameResult {
  const kind = classifyWin(board, winner);
  return { winner, kind, stake: cube.value * MULTIPLIER[kind] };
}
