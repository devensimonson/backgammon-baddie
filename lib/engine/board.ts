/**
 * Board geometry and queries. The one place the white/black symmetry
 * lives: everything else in the engine reasons in player-relative
 * points (your 1-point is where you bear off; your 24-point is your
 * farthest checker's start) and converts through `pointFor`.
 */

import type { Board, Player, Point } from "./types";

export function opponentOf(player: Player): Player {
  return player === "white" ? "black" : "white";
}

/**
 * Convert a player-relative point number (1-24) to an absolute point
 * number, and back -- the mapping is its own inverse.
 * White's relative numbering IS the absolute numbering; Black's is
 * mirrored (Black's 1-point is absolute point 24).
 */
export function pointFor(player: Player, point: number): number {
  return player === "white" ? point : 25 - point;
}

/** The point at an absolute point number (1-24). */
export function pointAt(board: Board, absPoint: number): Point {
  return board.points[absPoint - 1];
}

/** A point is blocked for `player` when the opponent holds it with 2+ checkers. */
export function isBlocked(board: Board, player: Player, absPoint: number): boolean {
  const point = pointAt(board, absPoint);
  return point !== null && point.owner !== player && point.count >= 2;
}

/** A blot: exactly one opposing checker, which landing there would hit. */
export function isBlot(board: Board, player: Player, absPoint: number): boolean {
  const point = pointAt(board, absPoint);
  return point !== null && point.owner !== player && point.count === 1;
}

/** How many of `player`'s checkers sit on an absolute point. */
export function checkersAt(board: Board, player: Player, absPoint: number): number {
  const point = pointAt(board, absPoint);
  return point !== null && point.owner === player ? point.count : 0;
}

/**
 * Bear-off gate: true when the player has no checker on the bar and
 * none outside their home board (relative points 1-6). Checkers
 * already borne off don't count against this.
 */
export function allCheckersHome(board: Board, player: Player): boolean {
  if (board.bar[player] > 0) return false;
  for (let rel = 7; rel <= 24; rel++) {
    if (checkersAt(board, player, pointFor(player, rel)) > 0) return false;
  }
  return true;
}

/**
 * The highest player-relative home point (1-6) still holding one of
 * the player's checkers, or null if their home board is empty.
 * Drives the bear-off overshoot rule: a die larger than this point
 * may bear off from exactly this point.
 */
export function highestOccupiedHomePoint(board: Board, player: Player): number | null {
  for (let rel = 6; rel >= 1; rel--) {
    if (checkersAt(board, player, pointFor(player, rel)) > 0) return rel;
  }
  return null;
}
