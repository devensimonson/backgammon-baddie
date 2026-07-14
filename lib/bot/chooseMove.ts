/**
 * The Baddie's move selection: an honest 1-ply search.
 *
 * Ask the engine for every legal play, apply each one through the
 * engine, score the resulting position with `evaluate`, and play the
 * best one. No randomness anywhere: ties break by the engine's
 * canonical `legalPlays` ordering (the first maximal-scoring play
 * wins), so the same state always yields the same play.
 *
 * The bot never constructs a move itself -- everything it returns
 * came out of `legalPlays`, so it is legal by construction.
 */

import { applyPlay, legalPlays } from "../engine";
import type { GameState, Play } from "../engine";
import { evaluate } from "./evaluate";

/**
 * Choose the bot's play for a state in the "moving" phase (dice
 * already supplied; the bot player is `state.toMove`).
 *
 * Returns the chosen `Play` -- always one of `legalPlays(state)` --
 * or `null` when no legal play exists and the turn must be forfeited
 * (the caller advances with the engine's `forfeitTurn`).
 *
 * Throws on any other phase: The Baddie does not roll dice and, in
 * v1, does not act on the cube. Handing it such a state is a
 * programming error, not a decision to guess at.
 */
export function chooseMove(state: GameState): Play | null {
  if (state.phase.kind !== "moving") {
    throw new Error(
      `The Baddie only chooses in the "moving" phase, not "${state.phase.kind}": ` +
        "it does not roll dice and, in v1, does not act on the cube",
    );
  }

  const player = state.toMove;
  const candidates = legalPlays(state);
  if (candidates.length === 0) return null; // no legal play: the caller forfeits the turn

  let best: Play = candidates[0];
  let bestScore = evaluate(applyPlay(state, best), player);
  for (const candidate of candidates.slice(1)) {
    const score = evaluate(applyPlay(state, candidate), player);
    // Strictly greater: on a tie the earlier candidate keeps the seat,
    // which is what makes the choice deterministic.
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
