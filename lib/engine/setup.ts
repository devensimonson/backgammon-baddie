/**
 * The standard backgammon starting position.
 *
 * Per player, from that player's own perspective: 2 checkers on the
 * 24-point, 5 on the 13-point, 3 on the 8-point, 5 on the 6-point --
 * 15 checkers each, none on the bar, none borne off. The cube starts
 * at 1, centered.
 *
 * Who moves first is the caller's decision (the opening-roll contest
 * lives outside the engine).
 */

import { pointFor } from "./board";
import type { GameState, Player, Point } from "./types";

const STARTING_CHECKERS: ReadonlyArray<readonly [relativePoint: number, count: number]> = [
  [24, 2],
  [13, 5],
  [8, 3],
  [6, 5],
];

export function newGame(firstPlayer: Player): GameState {
  const points: Point[] = new Array(24).fill(null);
  for (const player of ["white", "black"] as const) {
    for (const [rel, count] of STARTING_CHECKERS) {
      points[pointFor(player, rel) - 1] = { owner: player, count };
    }
  }
  return {
    board: {
      points,
      bar: { white: 0, black: 0 },
      off: { white: 0, black: 0 },
    },
    toMove: firstPlayer,
    phase: { kind: "awaiting-roll" },
    cube: { value: 1, owner: "centered" },
  };
}
