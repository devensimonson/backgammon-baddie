/**
 * Backgammon rules engine -- the public API.
 *
 * This module is the single source of truth for backgammon legality
 * and scoring. It is pure TypeScript: no framework, no DOM, no I/O,
 * no randomness. Every function takes a game state and returns a new
 * one without mutating its input; identical inputs always produce
 * identical outputs. Dice are supplied by the caller (see
 * `createRoller` for an optional seedable roller).
 *
 * A game is driven like this:
 *
 *   let state = newGame("white");
 *   // before rolling, the player on turn may double:
 *   //   state = offerDouble(state); then takeDouble / dropDouble
 *   state = roll(state, [3, 1]);
 *   const plays = legalPlays(state);   // [] means the turn is forfeited
 *   state = plays.length > 0 ? applyPlay(state, plays[0]) : forfeitTurn(state);
 *   // ...repeat until state.phase.kind === "game-over"
 *
 * Consumers never recompute legality or score: the bot picks from
 * `legalPlays`, and a UI walks a turn with `movesFrom`, which only
 * offers destinations that still complete to a legal maximum-use play.
 */

export { newGame } from "./setup";
export { roll, applyPlay, forfeitTurn } from "./turn";
export { legalPlays, movesFrom } from "./plays";
export { offerDouble, takeDouble, dropDouble } from "./cube";
export { hasWon, classifyWin, resultForWin } from "./scoring";
export { opponentOf, pointFor, allCheckersHome } from "./board";
export { createRoller } from "./dice";

export type {
  Board,
  CubeState,
  CubeValue,
  Die,
  GamePhase,
  GameResult,
  GameState,
  HalfMove,
  Play,
  Player,
  Point,
  ResultKind,
  Roll,
} from "./types";
