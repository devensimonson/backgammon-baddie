import { describe, expect, it } from "vitest";
import { legalPlays } from "../plays";
import { newGame } from "../setup";
import type { GameState, Roll } from "../types";
import { moveKey, position } from "./helpers";

function opening(dice: Roll): GameState {
  return { ...newGame("white"), phase: { kind: "moving", dice } };
}

describe("maximum-use rule", () => {
  it("QA-05: when both dice can be played, no play uses fewer", () => {
    for (const play of legalPlays(opening([3, 1]))) expect(play).toHaveLength(2);
    // Doubles: all four when achievable.
    for (const play of legalPlays(opening([6, 6]))) expect(play).toHaveLength(4);
  });

  it("QA-06: when only one die is playable, the larger die is compulsory", () => {
    // White's lone checker on 24 can play either die alone (18 and 19
    // are open) but never both: Black holds 13, where both two-die
    // lines (24/18 18/13 and 24/19 19/13) would land.
    const state = position({
      white: { points: { 24: 1 } },
      black: { points: { 13: 2 } },
      dice: [6, 5],
    });
    const plays = legalPlays(state);

    expect(plays).toHaveLength(1);
    expect(plays[0]).toEqual([{ from: 24, to: 18, die: 6 }]);
    // No play uses only the smaller die.
    for (const play of plays) {
      expect(play.some((move) => move.die === 5)).toBe(false);
    }
  });

  it("QA-07: when neither die can be played, there are no legal plays", () => {
    // Every destination for both dice, from both of White's checkers,
    // is held by Black. Bear-off is unavailable (a checker sits on 20).
    const state = position({
      white: { points: { 3: 1, 20: 1 } },
      black: { points: { 1: 2, 2: 2, 18: 2, 19: 2 } },
      dice: [2, 1],
    });
    expect(legalPlays(state)).toEqual([]);
  });

  it("QA-08: a locally legal half-move that strands the other die is excluded", () => {
    // Roll 4-3, White checkers on 8 and 24. Playing the 4 as 8/4 is
    // legal on its own, but then the 3 is dead: 4/1 and 24/21 are both
    // blocked. Playing the 4 as 24/20 keeps the 3 alive via 20/17.
    // Only the two-die line may be offered.
    const state = position({
      white: { points: { 8: 1, 24: 1 } },
      black: { points: { 1: 2, 5: 2, 21: 2 } },
      dice: [4, 3],
    });
    const plays = legalPlays(state);

    expect(plays).toHaveLength(1);
    expect(plays[0]).toEqual([
      { from: 24, to: 20, die: 4 },
      { from: 20, to: 17, die: 3 },
    ]);
    // The stranding half-move never appears in any offered play.
    for (const play of plays) {
      expect(play.map(moveKey)).not.toContain("8/4:4");
    }
  });
});
