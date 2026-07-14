import { describe, expect, it } from "vitest";
import { applyPlay } from "../turn";
import type { CubeValue, GameState } from "../types";
import { position } from "./helpers";

/**
 * White is one bear-off away from winning; Black's situation varies
 * per test. Playing the final checker off ends the game.
 */
function aboutToWin(black: Parameters<typeof position>[0]["black"], cubeValue: CubeValue = 1): GameState {
  return position({
    white: { points: { 1: 1 }, off: 14 },
    black,
    dice: [6, 5],
    cube: { value: cubeValue, owner: "white" },
  });
}

function winNow(state: GameState): GameState {
  // A 6 overshoots from the 1-point (and, as the larger die of an
  // otherwise unplayable roll, is compulsory).
  return applyPlay(state, [{ from: 1, to: "off", die: 6 }]);
}

describe("winning and scoring", () => {
  it("QA-19: bearing off the 15th checker ends the game with that player the winner", () => {
    const after = winNow(aboutToWin({ points: { 13: 14 }, off: 1 }));
    expect(after.phase.kind).toBe("game-over");
    if (after.phase.kind !== "game-over") return;
    expect(after.phase.result.winner).toBe("white");
    expect(after.board.off.white).toBe(15);
  });

  it("QA-22: loser has borne off at least one checker -- plain win, x1", () => {
    const after = winNow(aboutToWin({ points: { 13: 14 }, off: 1 }));
    if (after.phase.kind !== "game-over") throw new Error("expected game over");
    expect(after.phase.result).toEqual({ winner: "white", kind: "single", stake: 1 });
  });

  it("QA-20: loser borne off none -- gammon, x2", () => {
    const after = winNow(aboutToWin({ points: { 13: 15 } }));
    if (after.phase.kind !== "game-over") throw new Error("expected game over");
    expect(after.phase.result).toEqual({ winner: "white", kind: "gammon", stake: 2 });
  });

  it("QA-21: loser borne off none with a checker in the winner's home board -- backgammon, x3", () => {
    // Black's checker on point 2 sits inside White's home board (1-6).
    const after = winNow(aboutToWin({ points: { 2: 1, 13: 14 } }));
    if (after.phase.kind !== "game-over") throw new Error("expected game over");
    expect(after.phase.result).toEqual({ winner: "white", kind: "backgammon", stake: 3 });
  });

  it("QA-21: a loser checker on the bar also counts as a backgammon", () => {
    const after = winNow(aboutToWin({ points: { 13: 14 }, bar: 1 }));
    if (after.phase.kind !== "game-over") throw new Error("expected game over");
    expect(after.phase.result.kind).toBe("backgammon");
  });

  it("QA-27: final stake = base x cube value x multiplier", () => {
    // Gammon with the cube at 4 -> 8.
    const gammon = winNow(aboutToWin({ points: { 13: 15 } }, 4));
    if (gammon.phase.kind !== "game-over") throw new Error("expected game over");
    expect(gammon.phase.result.stake).toBe(8);

    // Backgammon with the cube at 2 -> 6.
    const backgammon = winNow(aboutToWin({ points: { 2: 1, 13: 14 } }, 2));
    if (backgammon.phase.kind !== "game-over") throw new Error("expected game over");
    expect(backgammon.phase.result.stake).toBe(6);

    // Plain win with the cube at 1 -> 1.
    const single = winNow(aboutToWin({ points: { 13: 14 }, off: 1 }, 1));
    if (single.phase.kind !== "game-over") throw new Error("expected game over");
    expect(single.phase.result.stake).toBe(1);
  });
});
