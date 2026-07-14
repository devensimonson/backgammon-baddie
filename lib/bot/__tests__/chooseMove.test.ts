import { describe, expect, it } from "vitest";
import { legalPlays, newGame, roll } from "../../engine";
import type { Roll } from "../../engine";
import { deepFreeze, position } from "../../engine/__tests__/helpers";
import { chooseMove } from "../index";
import type { GameState } from "../index";

describe("the move-selection contract", () => {
  it("QA-01: returns a play deeply equal to one of the engine's legal plays", () => {
    const state = roll(newGame("white"), [3, 1]);
    const chosen = chooseMove(state);

    expect(chosen).not.toBeNull();
    expect(legalPlays(state)).toContainEqual(chosen);
  });

  it("QA-02: with no legal play, reports forfeit (null) instead of a fake play", () => {
    // White's bar checker faces a closed black home board: the engine
    // offers nothing, and the bot must say so rather than invent a play.
    const state = position({
      white: { points: { 13: 2 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 } },
      dice: [6, 2],
    });

    expect(legalPlays(state)).toEqual([]);
    expect(chooseMove(state)).toBeNull();
  });

  it("QA-03: throws on any phase other than moving", () => {
    // Dice not rolled yet: the bot does not roll, so this is a caller bug.
    const awaitingRoll = position({
      white: { points: { 13: 2 } },
      black: { points: { 19: 2 } },
    });
    expect(() => chooseMove(awaitingRoll)).toThrow(/moving/);

    // Game already decided: there is nothing left to choose.
    const gameOver: GameState = {
      ...position({
        white: { off: 15 },
        black: { points: { 19: 2 }, off: 1 },
      }),
      phase: {
        kind: "game-over",
        result: { winner: "white", kind: "single", stake: 1 },
      },
    };
    expect(() => chooseMove(gameOver)).toThrow(/moving/);
  });

  it("QA-04: the same state always yields the identical play (and is never mutated)", () => {
    const state = deepFreeze(roll(newGame("white"), [6, 5]));

    const first = chooseMove(state);
    const second = chooseMove(state);

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });

  it("QA-05: repeated calls are stable across many states and both players", () => {
    const rolls: Roll[] = [[3, 1], [6, 1], [5, 2], [4, 4], [6, 6]];
    for (const player of ["white", "black"] as const) {
      for (const dice of rolls) {
        const state = roll(newGame(player), dice);
        const first = chooseMove(state);
        expect(chooseMove(state)).toEqual(first);
        expect(chooseMove(state)).toEqual(first);
      }
    }
  });

  it("QA-10: with a checker on the bar and an entry open, the chosen play re-enters", () => {
    // Black blocks the 6-entry (point 19); the 3 still enters on 22.
    const state = position({
      white: { points: { 13: 2 }, bar: 1 },
      black: { points: { 19: 2 } },
      dice: [6, 3],
    });

    const chosen = chooseMove(state);
    expect(chosen).not.toBeNull();
    expect(chosen![0]).toEqual({ from: "bar", to: 22, die: 3 });
  });
});
