import { describe, expect, it } from "vitest";
import { newGame } from "../../engine";
import type { Die } from "../../engine";
import {
  QUADRANTS,
  diceForTurn,
  diePips,
  fairRoll,
  pipCount,
  pointView,
  resolveOpeningRoll,
  sideOf,
} from "../view";

/** A deterministic single-die source that walks a fixed sequence. */
function dieSeq(values: Die[]): () => Die {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("view: board mapping", () => {
  it("QA-03: the four quadrants cover all 24 points exactly once", () => {
    const all = Object.values(QUADRANTS).flat().sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it("QA-03: pointView maps the human's owner to the you side", () => {
    const board = newGame("white").board;
    // White starts with two checkers on absolute point 24.
    expect(pointView(board, 24, "white")).toEqual({ side: "you", count: 2 });
    // Black holds absolute point 1 at the start.
    expect(pointView(board, 1, "white")).toEqual({ side: "bad", count: 2 });
    // An empty point renders as null.
    expect(pointView(board, 2, "white")).toBeNull();
  });

  it("QA-22: sideOf respects which colour the human plays", () => {
    expect(sideOf("white", "white")).toBe("you");
    expect(sideOf("black", "white")).toBe("bad");
  });
});

describe("view: dice", () => {
  it("QA-05: diePips places the right number of pips on a 3x3 grid", () => {
    for (let face = 1 as Die; face <= 6; face = (face + 1) as Die) {
      const pips = diePips(face);
      expect(pips).toHaveLength(9);
      expect(pips.filter(Boolean)).toHaveLength(face);
    }
    // A one shows a single centre pip.
    expect(diePips(1)[4]).toBe(true);
  });

  it("QA-05: diceForTurn expands doubles to four uses and a normal roll to two", () => {
    expect(diceForTurn([2, 2])).toEqual([2, 2, 2, 2]);
    expect(diceForTurn([3, 1])).toEqual([3, 1]);
  });

  it("QA-05: fairRoll draws two dice from the source", () => {
    expect(fairRoll(dieSeq([4, 2]))).toEqual([4, 2]);
  });
});

describe("view: opening roll", () => {
  it("QA-02: a tie re-rolls, then the higher die moves first and plays both dice", () => {
    // First pair ties (3,3) and re-rolls to (5,2): white's 5 is higher.
    const opening = resolveOpeningRoll(dieSeq([3, 3, 5, 2]));
    expect(opening.first).toBe("white");
    expect(opening.dice).toEqual([5, 2]);
  });

  it("QA-02: the Baddie moves first when its die is higher", () => {
    const opening = resolveOpeningRoll(dieSeq([2, 5]));
    expect(opening.first).toBe("black");
    expect(opening.dice).toEqual([2, 5]);
  });
});

describe("view: pip count", () => {
  it("QA-04: the standard start is 167 pips per side", () => {
    const board = newGame("white").board;
    expect(pipCount(board, "white")).toBe(167);
    expect(pipCount(board, "black")).toBe(167);
  });
});
