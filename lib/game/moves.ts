/**
 * Engine-facing helpers for staging a human turn in the UI.
 *
 * Pure and framework-free: this module imports only the engine's public
 * API and never recomputes a rule the engine owns. The UI stages
 * half-moves client-side for feedback, but every committed turn is one
 * of the engine's own `legalPlays` (see `commitStaged`), so no `Play`
 * is ever built or mutated outside `movesFrom` / `legalPlays`.
 *
 * The human is White. Only White turns are staged here; the Baddie's
 * moves come fully formed from `chooseMove`. All side symmetry flows
 * through `pointFor`, per the coordinate convention.
 */

import { applyPlay, legalPlays, movesFrom, pointFor } from "../engine";
import type { Die, GameState, Play } from "../engine";

/** Every source a checker could move from: the bar, then points 1-24. */
const ALL_SOURCES: readonly (number | "bar")[] = [
  "bar",
  ...Array.from({ length: 24 }, (_, i) => i + 1),
];

/**
 * The length every legal play must reach this turn (the maximum-use
 * length). Zero means the turn is forfeited. All legal plays share this
 * length because the engine keeps only maximum-use sequences.
 */
export function maxPlayLength(game: GameState): number {
  const plays = legalPlays(game);
  return plays.length === 0 ? 0 : plays[0].length;
}

/** True when the moving player has no legal play and must forfeit. */
export function isForfeit(game: GameState): boolean {
  return game.phase.kind === "moving" && legalPlays(game).length === 0;
}

/**
 * Sources that can still move given the staged prefix, each with the
 * destinations `movesFrom` offers. This is exactly the set FR-06
 * requires the UI to highlight.
 */
export function stagingOptions(
  game: GameState,
  staged: Play,
): Map<number | "bar", (number | "off")[]> {
  const options = new Map<number | "bar", (number | "off")[]>();
  if (game.phase.kind !== "moving") return options;
  for (const from of ALL_SOURCES) {
    const destinations = movesFrom(game, from, staged);
    if (destinations.length > 0) options.set(from, destinations);
  }
  return options;
}

/**
 * Resolve the exact die the engine would charge for the chosen
 * `from -> to` move after `staged`, using only public API. Point and
 * bar moves have a single die; a bear-off can overshoot, so each
 * remaining die is tried against the engine until one forms a valid
 * prefix. Returns null only if `to` was not actually offered.
 */
export function resolveDie(
  game: GameState,
  staged: Play,
  from: number | "bar",
  to: number | "off",
  player: GameState["toMove"],
): Die | null {
  const maxLen = maxPlayLength(game);
  for (const die of candidateDice(game, staged, from, to, player)) {
    const trial: Play = [...staged, { from, to, die }];
    if (isValidPrefix(game, trial, maxLen)) return die;
  }
  return null;
}

/**
 * Append the chosen move to the staged play, tagged with its engine die.
 * Returns the extended play, or null if the move was not offered.
 */
export function stageMove(
  game: GameState,
  staged: Play,
  from: number | "bar",
  to: number | "off",
): Play | null {
  const die = resolveDie(game, staged, from, to, game.toMove);
  if (die === null) return null;
  return [...staged, { from, to, die }];
}

/**
 * The engine's canonical play that reaches the staged play's resulting
 * board. The engine accepts every legal ordering while `legalPlays`
 * deduplicates equivalent results, so matching by result preserves both
 * flexible staging and an engine-sourced commit.
 */
export function commitStaged(game: GameState, staged: Play): Play | null {
  const stagedResult = appliedResult(game, staged);
  if (stagedResult === null) return null;

  return (
    legalPlays(game).find((play) => {
      const canonicalResult = appliedResult(game, play);
      return canonicalResult !== null && sameBoard(canonicalResult.board, stagedResult.board);
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Dice still unspent after `staged`, ordered so the exact die is tried first. */
function candidateDice(
  game: GameState,
  staged: Play,
  from: number | "bar",
  to: number | "off",
  player: GameState["toMove"],
): Die[] {
  if (game.phase.kind !== "moving") return [];
  const [d1, d2] = game.phase.dice;
  const pool: Die[] = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  for (const move of staged) {
    const at = pool.indexOf(move.die);
    if (at !== -1) pool.splice(at, 1);
  }
  const exact = exactDie(from, to, player);
  const unique = [...new Set(pool)];
  unique.sort((a, b) => a - b);
  if (exact !== null && unique.includes(exact)) {
    return [exact, ...unique.filter((d) => d !== exact)];
  }
  return unique;
}

/**
 * The die a `from -> to` move consumes by geometry, via `pointFor` (the
 * one home of side symmetry). Bear-off returns the exact die; overshoot
 * dice, which are larger, are discovered by `resolveDie` trying the pool.
 */
function exactDie(
  from: number | "bar",
  to: number | "off",
  player: GameState["toMove"],
): Die | null {
  const relFrom = from === "bar" ? 25 : pointFor(player, from);
  const relTo = to === "off" ? 0 : pointFor(player, to);
  const die = relFrom - relTo;
  return die >= 1 && die <= 6 ? (die as Die) : null;
}

/**
 * Is `seq` a legal prefix of some play this turn? Below the maximum
 * length, that means the engine still offers a continuation; at the
 * maximum length, it means `seq` completes to a legal play.
 */
function isValidPrefix(game: GameState, seq: Play, maxLen: number): boolean {
  if (seq.length > maxLen) return false;
  if (seq.length === maxLen) {
    return appliedResult(game, seq) !== null;
  }
  return ALL_SOURCES.some((from) => movesFrom(game, from, seq).length > 0);
}

/** Ask the engine to validate and apply a complete staged turn. */
function appliedResult(game: GameState, play: Play): GameState | null {
  try {
    return applyPlay(game, play);
  } catch {
    return null;
  }
}

/** Resulting-board equality mirrors the engine's position deduplication. */
function sameBoard(a: GameState["board"], b: GameState["board"]): boolean {
  if (
    a.bar.white !== b.bar.white ||
    a.bar.black !== b.bar.black ||
    a.off.white !== b.off.white ||
    a.off.black !== b.off.black ||
    a.points.length !== b.points.length
  ) {
    return false;
  }

  return a.points.every((point, index) => {
    const other = b.points[index];
    return point === null
      ? other === null
      : other !== null && point.owner === other.owner && point.count === other.count;
  });
}
