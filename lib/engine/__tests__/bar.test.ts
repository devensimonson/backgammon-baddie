import { describe, expect, it } from "vitest";
import { pointFor } from "../board";
import { halfMovesFor } from "../halfMove";
import { legalPlays } from "../plays";
import type { Die } from "../types";
import { position } from "./helpers";

describe("the bar", () => {
  it("QA-09: with a checker on the bar, every play enters it before anything else", () => {
    const state = position({
      white: { points: { 13: 2 }, bar: 1 },
      black: { points: { 5: 2 } },
      dice: [3, 1],
    });
    const plays = legalPlays(state);

    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      expect(play[0].from).toBe("bar");
      // Only one checker is on the bar, so exactly the first move enters.
      expect(play.filter((move) => move.from === "bar")).toHaveLength(1);
    }
  });

  it("QA-09: with two on the bar and one entry blocked, no other checker may move", () => {
    const state = position({
      white: { points: { 13: 2 }, bar: 2 },
      black: { points: { 24: 2 } }, // blocks entry with the 1
      dice: [3, 1],
    });
    const plays = legalPlays(state);

    // Only the 3 enters (bar/22); the 1 cannot enter and, with a
    // checker still on the bar, cannot be played anywhere else.
    expect(plays).toEqual([[{ from: "bar", to: 22, die: 3 }]]);
  });

  it("QA-10: each die enters on its matching point in the opponent's home board", () => {
    for (const player of ["white", "black"] as const) {
      for (let die = 1 as Die; die <= 6; die++) {
        const state = position({ [player]: { bar: 1 }, toMove: player });
        const entries = halfMovesFor(state.board, player, die as Die);
        // Die d enters on the player's relative (25 - d) point:
        // absolute 25 - d for White, absolute d for Black.
        expect(entries).toEqual([
          { from: "bar", to: pointFor(player, 25 - die), die },
        ]);
      }
    }
  });

  it("QA-10: entry is not offered on a blocked point", () => {
    const state = position({
      white: { bar: 1 },
      black: { points: { 22: 2 } },
    });
    expect(halfMovesFor(state.board, "white", 3)).toEqual([]); // 25 - 3 = 22, blocked
    expect(halfMovesFor(state.board, "white", 4)).toEqual([
      { from: "bar", to: 21, die: 4 },
    ]);
  });

  it("QA-11: with every required entry point blocked, the turn has no legal plays", () => {
    // Black owns a closed home board against White's bar checker.
    const state = position({
      white: { points: { 13: 2 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 } },
      dice: [6, 2],
    });
    expect(legalPlays(state)).toEqual([]);
  });
});
