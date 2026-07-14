/**
 * The Baddie -- the heuristic backgammon opponent. Public API.
 *
 * A pure, framework-free module held to the same purity bar as the
 * engine: no React, no Next.js, no DOM, no I/O, no randomness, no
 * mutation of inputs. It consumes the engine only through the
 * engine's public API and never recomputes a rule the engine owns.
 *
 * Driving a bot turn:
 *
 *   // state.phase.kind must be "moving" (dice already rolled)
 *   const play = chooseMove(state);
 *   state = play !== null ? applyPlay(state, play) : forfeitTurn(state);
 *
 * Return shape: `chooseMove` returns the chosen `Play`, always deeply
 * equal to one of the engine's `legalPlays(state)`, or `null` when no
 * legal play exists and the turn is forfeited. It throws if the state
 * is in any phase other than "moving" -- the bot does not roll dice
 * and, in v1, does not act on the cube.
 *
 * `evaluate` and `pipCount` are exported so the scoring logic can be
 * inspected and unit-tested directly; a future stronger bot replaces
 * this module behind the same `chooseMove` signature.
 *
 * The engine types the bot's signatures use are re-exported here so a
 * caller can import everything bot-facing from this one module.
 */

export { chooseMove } from "./chooseMove";
export { evaluate, pipCount, WIN_SCORE } from "./evaluate";
export type { GameState, Play, Player } from "../engine";
