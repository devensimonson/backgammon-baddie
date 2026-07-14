/**
 * Shared types for the backgammon rules engine.
 *
 * Coordinate convention: one absolute board, points numbered 1-24 from
 * White's perspective. White's home board is points 1-6 and White moves
 * from 24 toward 1; Black's home board is points 19-24 and Black moves
 * from 1 toward 24. All rules code is written in player-relative terms
 * and converts through `pointFor` in board.ts -- the only place the
 * white/black symmetry lives.
 *
 * Every type here is deeply readonly. Engine functions never mutate
 * their inputs; they return new values.
 */

export type Player = "white" | "black";

export type Die = 1 | 2 | 3 | 4 | 5 | 6;

/** A roll of two dice, as supplied by the caller. Doubles count four times. */
export type Roll = readonly [Die, Die];

/**
 * One point on the board: empty, or held by exactly one side.
 * A mixed point is not a legal backgammon state -- landing on a lone
 * opposing checker hits it rather than sharing the point.
 */
export type Point = { readonly owner: Player; readonly count: number } | null;

export type Board = {
  /** The 24 points; index 0 is absolute point 1, index 23 is point 24. */
  readonly points: readonly Point[];
  /** Checkers on the bar, per side. */
  readonly bar: { readonly white: number; readonly black: number };
  /** Checkers borne off, per side. Reaching 15 wins the game. */
  readonly off: { readonly white: number; readonly black: number };
};

export type CubeValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type CubeState = {
  readonly value: CubeValue;
  /** "centered" until the first take; then the taker owns it. */
  readonly owner: Player | "centered";
};

/**
 * One half-move: one checker moved by one die.
 * `from` is an absolute point number or "bar"; `to` is an absolute
 * point number or "off" (borne off).
 */
export type HalfMove = {
  readonly from: number | "bar";
  readonly to: number | "off";
  readonly die: Die;
};

/** A complete turn's moves: 0-2 half-moves normally, up to 4 on doubles. */
export type Play = readonly HalfMove[];

export type ResultKind = "single" | "gammon" | "backgammon" | "drop";

export type GameResult = {
  readonly winner: Player;
  readonly kind: ResultKind;
  /** Base stake (1) x cube value x multiplier (x1 single, x2 gammon, x3 backgammon). */
  readonly stake: number;
};

/**
 * The phase state machine. Doubling happens only in "awaiting-roll",
 * strictly before the dice are supplied.
 */
export type GamePhase =
  | { readonly kind: "awaiting-roll" }
  | { readonly kind: "moving"; readonly dice: Roll }
  | { readonly kind: "cube-offered"; readonly offeredBy: Player }
  | { readonly kind: "game-over"; readonly result: GameResult };

/** A complete game in one immutable value. */
export type GameState = {
  readonly board: Board;
  readonly toMove: Player;
  readonly phase: GamePhase;
  readonly cube: CubeState;
};
