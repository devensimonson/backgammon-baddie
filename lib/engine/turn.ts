/**
 * The turn lifecycle: roll -> play (or forfeit) -> opponent's turn,
 * ending the game when the 15th checker comes off.
 *
 * Turns are atomic. A whole play (every half-move of the turn) is
 * applied at once, which is what makes the maximum-use rule
 * unbreakable: a partial turn can never be committed. The caller
 * drives the loop -- the engine validates and reports.
 *
 * Dice are inputs, never generated here (see dice.ts for the optional
 * roller utility consumers may use).
 */

import { opponentOf } from "./board";
import { applyHalfMove } from "./halfMove";
import { candidatePlays, sameMove } from "./plays";
import { hasWon, resultForWin } from "./scoring";
import type { GameState, Play, Roll } from "./types";

/** Supply the rolled dice; the game enters the moving phase. */
export function roll(state: GameState, dice: Roll): GameState {
  if (state.phase.kind !== "awaiting-roll") {
    throw new Error(`cannot roll in phase "${state.phase.kind}"`);
  }
  for (const die of dice) {
    if (!Number.isInteger(die) || die < 1 || die > 6) {
      throw new Error(`invalid die value ${die}`);
    }
  }
  return { ...state, phase: { kind: "moving", dice } };
}

/**
 * Commit a complete turn. The play must be one of the legal
 * maximum-use plays; any legal ordering of the half-moves is accepted
 * (generation enumerates every ordering). Ends the game if the 15th
 * checker bears off; otherwise passes the turn.
 */
export function applyPlay(state: GameState, play: Play): GameState {
  if (state.phase.kind !== "moving") {
    throw new Error(`cannot play in phase "${state.phase.kind}"`);
  }
  const legal = candidatePlays(state).some(
    (candidate) =>
      candidate.moves.length === play.length &&
      candidate.moves.every((move, i) => sameMove(move, play[i])),
  );
  if (!legal) {
    throw new Error(
      play.length === 0 && candidatePlays(state).length === 0
        ? "no legal plays: use forfeitTurn"
        : `not a legal maximum-use play: ${JSON.stringify(play)}`,
    );
  }

  let board = state.board;
  for (const move of play) board = applyHalfMove(board, state.toMove, move);

  if (hasWon(board, state.toMove)) {
    return {
      ...state,
      board,
      phase: { kind: "game-over", result: resultForWin(board, state.toMove, state.cube) },
    };
  }
  return { ...state, board, toMove: opponentOf(state.toMove), phase: { kind: "awaiting-roll" } };
}

/**
 * Pass the turn when the roll cannot be played. Validated: throws if
 * any legal play exists (the maximum-use rule forbids passing then).
 */
export function forfeitTurn(state: GameState): GameState {
  if (state.phase.kind !== "moving") {
    throw new Error(`cannot forfeit in phase "${state.phase.kind}"`);
  }
  if (candidatePlays(state).length > 0) {
    throw new Error("legal plays exist: the turn cannot be forfeited");
  }
  return { ...state, toMove: opponentOf(state.toMove), phase: { kind: "awaiting-roll" } };
}
