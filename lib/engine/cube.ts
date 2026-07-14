/**
 * The doubling cube state machine.
 *
 * A double is offered strictly before the offerer rolls, and only when
 * the cube is centered or the offerer owns it. Eligibility does not
 * depend on whether the coming roll will be playable -- a player stuck
 * on the bar may still double.
 *
 * Take: the value doubles (2, 4, ... 64) and the taker owns the cube.
 * Drop: the game ends at once; the dropper concedes the PRE-double
 * value, and no gammon/backgammon multiplier ever applies to a drop.
 * The cube never rises above 64: from 64, nobody may redouble.
 */

import { opponentOf } from "./board";
import type { CubeValue, GameState } from "./types";

export function offerDouble(state: GameState): GameState {
  if (state.phase.kind !== "awaiting-roll") {
    throw new Error(`cannot offer a double in phase "${state.phase.kind}"`);
  }
  if (state.cube.owner !== "centered" && state.cube.owner !== state.toMove) {
    throw new Error(`${state.toMove} does not own the cube and it is not centered`);
  }
  if (state.cube.value >= 64) {
    throw new Error("the cube is at 64 and cannot be raised further");
  }
  return { ...state, phase: { kind: "cube-offered", offeredBy: state.toMove } };
}

export function takeDouble(state: GameState): GameState {
  if (state.phase.kind !== "cube-offered") {
    throw new Error(`cannot take in phase "${state.phase.kind}"`);
  }
  const taker = opponentOf(state.phase.offeredBy);
  return {
    ...state,
    cube: { value: (state.cube.value * 2) as CubeValue, owner: taker },
    toMove: state.phase.offeredBy, // the offerer now rolls
    phase: { kind: "awaiting-roll" },
  };
}

export function dropDouble(state: GameState): GameState {
  if (state.phase.kind !== "cube-offered") {
    throw new Error(`cannot drop in phase "${state.phase.kind}"`);
  }
  return {
    ...state,
    phase: {
      kind: "game-over",
      result: {
        winner: state.phase.offeredBy,
        kind: "drop",
        stake: state.cube.value, // the pre-double value; no multiplier
      },
    },
  };
}
