import { describe, expect, it } from "vitest";
import { halfMovesFor } from "../halfMove";
import { legalPlays } from "../plays";
import { moveKey, position } from "./helpers";

describe("bearing off", () => {
  it("QA-14: a die matching an occupied point bears that checker off", () => {
    const state = position({
      white: { points: { 6: 2, 5: 2, 3: 1 }, off: 10 },
      dice: [3, 2],
    });
    const offMoves = legalPlays(state)
      .flat()
      .filter((move) => move.to === "off");
    expect(offMoves).toContainEqual({ from: 3, to: "off", die: 3 });
  });

  it("QA-15: a die larger than the highest occupied point bears off from that point", () => {
    const { board } = position({
      white: { points: { 3: 2, 2: 1 }, off: 12 },
    });
    // Highest occupied point is 3; a 6 overshoots and bears off from 3 --
    // never from 2 while 3 is still occupied.
    expect(halfMovesFor(board, "white", 6)).toEqual([{ from: 3, to: "off", die: 6 }]);
  });

  it("QA-16: when the matching point is empty and a higher point is occupied, the die moves within the board", () => {
    const state = position({
      white: { points: { 5: 2, 2: 2 }, off: 11 },
      dice: [3, 1],
    });
    // Point 3 is empty and point 5 is higher, so a 3 cannot bear off;
    // its only use is moving 5/2 inside the home board.
    const dieThreeMoves = legalPlays(state)
      .flat()
      .filter((move) => move.die === 3);
    expect(dieThreeMoves.length).toBeGreaterThan(0);
    for (const move of dieThreeMoves) {
      expect(moveKey(move)).toBe("5/2:3");
    }
  });

  it("QA-17: no checker bears off while one is still outside the home board", () => {
    const state = position({
      white: { points: { 6: 2, 13: 1 }, off: 12 },
      dice: [6, 5],
    });
    for (const move of legalPlays(state).flat()) {
      expect(move.to).not.toBe("off");
    }
  });

  it("QA-18: the maximum-use rule applies during bear-off", () => {
    const state = position({
      white: { points: { 6: 1, 5: 1 }, off: 13 },
      dice: [6, 5],
    });
    const plays = legalPlays(state);
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) expect(play).toHaveLength(2);
  });
});
