/**
 * The Baddie's positional evaluation -- the readability centerpiece.
 *
 * `evaluate(state, player)` returns one number: higher is better for
 * `player`. It is a weighted sum of named positional terms, computed
 * once per side and taken as a difference (the player's score minus
 * the opponent's), so every strength the bot counts for itself it
 * also counts against itself when the opponent has it.
 *
 * The unit of account is roughly one pip: a weight of 3 means the
 * feature is worth about as much as a three-pip lead in the race.
 * These are honest v1 heuristic weights, tuned only far enough to
 * pass the positional sanity checks in __tests__, not a rolled-out
 * equity model. Tuning them further is a known future item.
 */

import { hasWon, opponentOf, pointFor } from "../engine";
import type { Board, GameState, Player } from "../engine";

// ---------------------------------------------------------------------------
// The weights. Each constant names one positional idea; the comment
// says what it measures and why its sign and rough size make sense.
// All weights are written positive here -- costs are subtracted
// explicitly where they apply, so the sign of each term is visible at
// the point of use in `sideScore`.
// ---------------------------------------------------------------------------

/**
 * A finished game outscores any positional consideration, so a
 * winning bear-off is never passed over for a marginal structural
 * gain (and a lost position is never preferred for one).
 */
export const WIN_SCORE = 1_000_000;

/**
 * The race: one point per pip the side still has to travel. This is
 * the baseline every other weight is measured against -- "worth about
 * N pips". Charged as a cost: more pips remaining is worse.
 */
const PIP = 1;

/**
 * A checker already borne off, on top of the pips it no longer has to
 * travel. Bearing off must beat spending the same pips shuffling
 * inside the home board, so this comfortably exceeds any structural
 * credit a shuffle could earn.
 */
const BORNE_OFF = 10;

/**
 * A checker on the bar, on top of its raw pip cost (the pip count
 * already charges a bar checker the full 25-point journey). This is
 * the tempo cost: it must re-enter before anything else may move, and
 * it may dance. Hitting is rewarded automatically: the hit checker's
 * lost pips and this penalty both land on the opponent's side of the
 * difference.
 */
const ON_BAR = 12;

/**
 * A blot: a lone checker the opponent could hit. Every blot pays this
 * base exposure cost, even out of direct range, because indirect
 * (two-die) shots and future contact are real but not modeled in v1.
 */
const BLOT = 4;

/**
 * Added blot cost per distinct die value (1-6) that would hit it
 * directly right now. Direct shots only: v1 deliberately ignores
 * combination shots and intervening blocked points; the base BLOT
 * cost stands in for that residual risk.
 */
const BLOT_DIRECT_SHOT = 2;

/**
 * A made point (two or more checkers): a landing spot the opponent
 * can never use and a safe home for the side's own checkers.
 */
const MADE_POINT = 3;

/**
 * Extra credit for a made point inside the side's own home board,
 * where it also blocks the opponent's re-entry from the bar.
 */
const HOME_BOARD_POINT = 2;

/**
 * Extra credit per adjacent pair of made points. Consecutive points
 * (a prime) block far more than the same points scattered, because
 * no single die can leap a solid wall.
 */
const PRIME_PAIR = 2;

// ---------------------------------------------------------------------------
// The evaluation.
// ---------------------------------------------------------------------------

/**
 * Score a position for `player`: higher is better. Terminal positions
 * short-circuit to +/- WIN_SCORE; otherwise the score is the
 * difference of the two sides' positional scores.
 */
export function evaluate(state: GameState, player: Player): number {
  const opponent = opponentOf(player);

  // Terminal positions first. A game already decided (including a
  // dropped double) or a board with all 15 checkers borne off is
  // maximally good or bad -- nothing positional can outweigh it.
  if (state.phase.kind === "game-over") {
    return state.phase.result.winner === player ? WIN_SCORE : -WIN_SCORE;
  }
  if (hasWon(state.board, player)) return WIN_SCORE;
  if (hasWon(state.board, opponent)) return -WIN_SCORE;

  return sideScore(state.board, player) - sideScore(state.board, opponent);
}

/** One side's positional score: every term, each with its sign visible. */
function sideScore(board: Board, side: Player): number {
  let score = 0;
  score -= PIP * pipCount(board, side); // the race: fewer pips left is better
  score += BORNE_OFF * board.off[side]; // checkers already safely off
  score -= ON_BAR * board.bar[side]; // tempo lost re-entering from the bar
  score -= blotExposure(board, side); // hittable lone checkers
  score += structure(board, side); // made points, home board, primes
  return score;
}

/**
 * Total pips `side` still has to travel. A checker on an absolute
 * point is exactly its relative point number away from bearing off
 * (converted through `pointFor`, the one place side symmetry lives),
 * and a checker on the bar travels the full 25.
 */
export function pipCount(board: Board, side: Player): number {
  let pips = 25 * board.bar[side];
  for (let abs = 1; abs <= 24; abs++) {
    const point = board.points[abs - 1];
    if (point !== null && point.owner === side) {
      pips += point.count * pointFor(side, abs);
    }
  }
  return pips;
}

/**
 * The cost of `side`'s blots: a base exposure cost per lone checker,
 * plus a per-shot cost for every die value that would hit it directly
 * right now.
 */
function blotExposure(board: Board, side: Player): number {
  const opponent = opponentOf(side);
  let penalty = 0;
  for (let abs = 1; abs <= 24; abs++) {
    const point = board.points[abs - 1];
    if (point === null || point.owner !== side || point.count !== 1) continue;
    penalty += BLOT + BLOT_DIRECT_SHOT * directShots(board, opponent, abs);
  }
  return penalty;
}

/**
 * How many distinct die values (1-6) let `hitter` hit a checker on
 * absolute point `target` right now: a hitter checker exactly that
 * many pips behind the target in the hitter's direction of travel, or
 * a bar checker whose entry die lands exactly there. Measured in the
 * hitter's relative numbering via `pointFor`, so one formula serves
 * both sides. Like combination shots, the rule that a hitter with a
 * checker on the bar must enter before shooting from a point is a
 * deliberate v1 simplification: the base BLOT cost absorbs it.
 */
function directShots(board: Board, hitter: Player, target: number): number {
  const targetRel = pointFor(hitter, target);
  let shots = 0;
  for (let die = 1; die <= 6; die++) {
    const fromRel = targetRel + die; // the hitter moves from high relative points toward 1
    const hitsFromPoint =
      fromRel <= 24 && hasCheckerAt(board, hitter, pointFor(hitter, fromRel));
    const hitsFromBar = fromRel === 25 && board.bar[hitter] > 0;
    if (hitsFromPoint || hitsFromBar) shots += 1;
  }
  return shots;
}

/** Does `side` have at least one checker on this absolute point? */
function hasCheckerAt(board: Board, side: Player, abs: number): boolean {
  const point = board.points[abs - 1];
  return point !== null && point.owner === side && point.count > 0;
}

/**
 * Made points and blocking structure: MADE_POINT per point held with
 * two or more checkers, HOME_BOARD_POINT on top inside the side's own
 * home board (relative points 1-6), and PRIME_PAIR per adjacent pair
 * of made points. Walked in the side's relative numbering so "home"
 * and "adjacent" mean the same thing for both players.
 */
function structure(board: Board, side: Player): number {
  let score = 0;
  let previousMade = false;
  for (let rel = 1; rel <= 24; rel++) {
    const point = board.points[pointFor(side, rel) - 1];
    const made = point !== null && point.owner === side && point.count >= 2;
    if (made) {
      score += MADE_POINT;
      if (rel <= 6) score += HOME_BOARD_POINT;
      if (previousMade) score += PRIME_PAIR;
    }
    previousMade = made;
  }
  return score;
}
