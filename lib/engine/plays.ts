/**
 * Complete-turn move generation: the heart of the engine.
 *
 * Legality in backgammon is a property of WHOLE turns, not individual
 * half-moves -- a half-move that is legal on its own is still
 * forbidden if choosing it would waste a die that some other line
 * could have played. So generation works in three steps:
 *
 *   1. Enumerate every maximal sequence of legal half-moves, trying
 *      both die orders for a normal roll (order matters: an early move
 *      can open or close later ones) and the single order for doubles
 *      (four half-moves of the same value).
 *
 *   2. Apply the maximum-use rule: keep only sequences of the maximum
 *      achievable length. When exactly one die can be played of a
 *      normal roll, the larger die is compulsory if any line plays it.
 *      Maximum length zero means the turn is forfeited.
 *
 *   3. Deduplicate: different orderings and different checkers often
 *      reach the same position (8/5 6/5 vs 6/5 8/5). `legalPlays`
 *      returns one canonical play per distinct resulting position --
 *      which is exactly what a bot evaluates. Validation of a
 *      submitted play (turn.ts) checks the pre-dedup set, so any legal
 *      ordering a UI produces is accepted.
 */

import { applyHalfMove, halfMovesFor } from "./halfMove";
import type { Board, Die, GameState, HalfMove, Play, Roll } from "./types";

export type Candidate = {
  readonly moves: Play;
  /** The board after playing every half-move in `moves`. */
  readonly board: Board;
};

/**
 * Every max-use play, in every playable half-move order, with its
 * resulting board. Empty array = the turn is forfeited.
 * Internal to the engine; consumers use `legalPlays`.
 */
export function candidatePlays(state: GameState): Candidate[] {
  if (state.phase.kind !== "moving") {
    throw new Error(`cannot generate plays in phase "${state.phase.kind}"`);
  }
  const { dice } = state.phase;
  const orderings: Die[][] =
    dice[0] === dice[1]
      ? [[dice[0], dice[0], dice[0], dice[0]]]
      : [
          [dice[0], dice[1]],
          [dice[1], dice[0]],
        ];

  const maximal: Candidate[] = [];
  for (const ordering of orderings) {
    extend(state.board, state.toMove, ordering, 0, [], maximal);
  }
  return maxUseFilter(dice, maximal);
}

/** Depth-first search: play the next die every legal way, recurse. */
function extend(
  board: Board,
  player: GameState["toMove"],
  ordering: readonly Die[],
  depth: number,
  prefix: HalfMove[],
  out: Candidate[],
): void {
  const options = depth < ordering.length ? halfMovesFor(board, player, ordering[depth]) : [];
  if (options.length === 0) {
    out.push({ moves: prefix.slice(), board });
    return;
  }
  for (const move of options) {
    prefix.push(move);
    extend(applyHalfMove(board, player, move), player, ordering, depth + 1, prefix, out);
    prefix.pop();
  }
}

/**
 * The maximum-use rule over complete sequences: play as many
 * half-moves as any line allows; if that maximum is a single
 * half-move of a normal roll and the larger die has a play, the
 * larger die is compulsory.
 */
function maxUseFilter(dice: Roll, candidates: Candidate[]): Candidate[] {
  let maxLength = 0;
  for (const c of candidates) maxLength = Math.max(maxLength, c.moves.length);
  if (maxLength === 0) return [];

  let kept = candidates.filter((c) => c.moves.length === maxLength);
  if (maxLength === 1 && dice[0] !== dice[1]) {
    const larger = Math.max(dice[0], dice[1]);
    if (kept.some((c) => c.moves[0].die === larger)) {
      kept = kept.filter((c) => c.moves[0].die === larger);
    }
  }
  return kept;
}

/**
 * Every legal play for the state's roll, deduplicated by resulting
 * position (one canonical representative each). An empty array means
 * no legal play exists and the turn must be forfeited.
 */
export function legalPlays(state: GameState): Play[] {
  const byPosition = new Map<string, Candidate>();
  for (const candidate of candidatePlays(state)) {
    const key = boardKey(candidate.board);
    const existing = byPosition.get(key);
    if (existing === undefined || canonicalKey(candidate.moves) < canonicalKey(existing.moves)) {
      byPosition.set(key, candidate);
    }
  }
  return [...byPosition.values()].map((c) => c.moves);
}

/**
 * UI helper: given the half-moves already made this turn, where may
 * the checker on `from` legally land next? Only destinations that
 * still extend to a full maximum-use play are offered, so a partially
 * played turn can never dead-end illegally.
 */
export function movesFrom(
  state: GameState,
  from: number | "bar",
  played: Play = [],
): (number | "off")[] {
  const destinations = new Set<number | "off">();
  for (const { moves } of candidatePlays(state)) {
    if (moves.length <= played.length) continue;
    if (!played.every((move, i) => sameMove(move, moves[i]))) continue;
    const next = moves[played.length];
    if (next.from === from) destinations.add(next.to);
  }
  return [...destinations];
}

export function sameMove(a: HalfMove, b: HalfMove): boolean {
  return a.from === b.from && a.to === b.to && a.die === b.die;
}

/** Compact, deterministic serialization of a board position. */
function boardKey(board: Board): string {
  const points = board.points
    .map((p) => (p === null ? "-" : `${p.owner === "white" ? "w" : "b"}${p.count}`))
    .join(",");
  return `${points}|bar:${board.bar.white},${board.bar.black}|off:${board.off.white},${board.off.black}`;
}

/** Order-insensitive key used to pick a deterministic representative play. */
function canonicalKey(moves: Play): string {
  return moves
    .map((m) => `${m.from}/${m.to}:${m.die}`)
    .sort()
    .join(" ");
}
