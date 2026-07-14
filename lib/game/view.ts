/**
 * Pure view helpers that map engine state to what the board renders.
 * No React, no DOM: just data in, data out, so each helper is unit
 * tested directly. The human is White ("you"); the Baddie is Black.
 */

import { pointFor } from "../engine";
import { pipCount } from "../bot";
import type { Board, Die, GameState, Player, Point, Roll } from "../engine";

export { pipCount };

/** Which visual quadrant each point sits in, and its render order. */
export const QUADRANTS = {
  tl: [24, 23, 22, 21, 20, 19],
  tr: [18, 17, 16, 15, 14, 13],
  bl: [1, 2, 3, 4, 5, 6],
  br: [7, 8, 9, 10, 11, 12],
} as const;

export type QuadrantId = keyof typeof QUADRANTS;

/** The two top quadrants render checkers hanging from the top edge. */
export const TOP_QUADRANTS: readonly QuadrantId[] = ["tl", "tr"];

export type Side = "you" | "bad";

/** Map an engine owner to a UI side, given which colour the human plays. */
export function sideOf(owner: Player, human: Player): Side {
  return owner === human ? "you" : "bad";
}

export type PointView = { side: Side; count: number } | null;

/** The checkers on an absolute point, as a UI side and count. */
export function pointView(board: Board, absPoint: number, human: Player): PointView {
  const point: Point = board.points[absPoint - 1];
  if (point === null) return null;
  return { side: sideOf(point.owner, human), count: point.count };
}

/**
 * Pip positions for a die face on a 3x3 grid, indexed 0-8 left to right,
 * top to bottom. `true` means a pip is drawn in that cell.
 */
export function diePips(die: Die): boolean[] {
  // 1-based cell numbers that carry a pip, matching a standard die face.
  const faces: Record<Die, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };
  const on = new Set(faces[die]);
  return Array.from({ length: 9 }, (_, i) => on.has(i + 1));
}

export type OpeningRoll = { first: Player; dice: Roll };

/**
 * The full opening roll-off, every shown pair included. `rolls` is each
 * `[white, black]` pair thrown on screen in order: any leading pairs are
 * ties that must be re-thrown, and the final pair is the decisive one
 * (its two values differ, so the opening move is never doubles). `first`
 * is the winner and `dice` is that final pair, which becomes the opening
 * turn's two dice. White is the human, Black is The Baddie.
 */
export type OpeningRollSequence = { rolls: [Die, Die][]; first: Player; dice: Roll };

/**
 * Resolve the standard opening roll as a *visible* sequence: each side
 * contributes one die, the higher die moves first and plays both dice,
 * and a tie re-rolls. Every thrown pair is returned in `rolls` (including
 * ties) so the UI can show each re-throw rather than resolving it
 * silently. `rollDie` returns one die; injecting a deterministic source
 * makes this testable.
 */
export function resolveOpeningRollSequence(rollDie: () => Die): OpeningRollSequence {
  const rolls: [Die, Die][] = [];
  let white = rollDie();
  let black = rollDie();
  rolls.push([white, black]);
  let guard = 0;
  while (white === black && guard < 100) {
    white = rollDie();
    black = rollDie();
    rolls.push([white, black]);
    guard += 1;
  }
  const first: Player = white >= black ? "white" : "black";
  return { rolls, first, dice: [white, black] };
}

/**
 * Resolve the opening roll to just its outcome (winner and the two dice).
 * Defined in terms of {@link resolveOpeningRollSequence} so the tie-loop
 * logic has a single tested source.
 */
export function resolveOpeningRoll(rollDie: () => Die): OpeningRoll {
  const { first, dice } = resolveOpeningRollSequence(rollDie);
  return { first, dice };
}

/**
 * Which start moment to show for a persisted (or absent) saved game. Pure
 * so the load branch is testable without React:
 * - no saved game -> the fresh Begin moment;
 * - a saved game in progress -> Welcome back (resume vs start new);
 * - a saved finished game -> restore that finished board with its result.
 * The roll-off persists nothing until the opening turn begins, so during
 * the roll-off `saved` is still null and this returns "begin".
 */
export type StartDecision = "begin" | "welcome-back" | "resume-finished";

export function decideStartFromSaved(saved: GameState | null): StartDecision {
  if (!saved) return "begin";
  if (saved.phase.kind === "game-over") return "resume-finished";
  return "welcome-back";
}

/** A fair two-die roll from an injected single-die source. */
export function fairRoll(rollDie: () => Die): Roll {
  return [rollDie(), rollDie()];
}

/**
 * Expand a roll into the dice the turn actually spends: two for a normal
 * roll, four of the same value for doubles.
 */
export function diceForTurn(dice: Roll): Die[] {
  return dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
}

/** Relative pip distance of a point for a player, via the one symmetry helper. */
export function relativePoint(player: Player, absPoint: number): number {
  return pointFor(player, absPoint);
}
