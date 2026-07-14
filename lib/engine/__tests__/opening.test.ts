import { describe, expect, it } from "vitest";
import { legalPlays } from "../plays";
import { newGame } from "../setup";
import type { GameState, Roll } from "../types";
import { hasPlay } from "./helpers";

/** The standard opening position with a roll on the table for White. */
function opening(dice: Roll): GameState {
  return { ...newGame("white"), phase: { kind: "moving", dice } };
}

describe("opening rolls", () => {
  it("QA-02: 3-1 offers making the 5-point (8/5 6/5)", () => {
    const plays = legalPlays(opening([3, 1]));
    expect(
      hasPlay(plays, [
        { from: 8, to: 5, die: 3 },
        { from: 6, to: 5, die: 1 },
      ]),
    ).toBe(true);
  });

  it("QA-03: 6-1 offers making the bar-point (13/7 8/7)", () => {
    const plays = legalPlays(opening([6, 1]));
    expect(
      hasPlay(plays, [
        { from: 13, to: 7, die: 6 },
        { from: 8, to: 7, die: 1 },
      ]),
    ).toBe(true);
  });

  it("QA-04: doubles yield four half-moves of the die value", () => {
    const plays = legalPlays(opening([3, 3]));
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      expect(play).toHaveLength(4);
      for (const move of play) expect(move.die).toBe(3);
    }
  });
});
