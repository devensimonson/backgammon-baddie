import { describe, expect, it } from "vitest";
import { applyHalfMove, canPlayHalfMove, halfMovesFor } from "../halfMove";
import { position } from "./helpers";

describe("blocking and hitting", () => {
  it("QA-12: landing on a lone opposing checker sends it to the bar", () => {
    const { board } = position({
      white: { points: { 13: 1 } },
      black: { points: { 9: 1 } },
    });
    const after = applyHalfMove(board, "white", { from: 13, to: 9, die: 4 });

    expect(after.bar.black).toBe(1);
    expect(after.points[9 - 1]).toEqual({ owner: "white", count: 1 });
    expect(after.points[13 - 1]).toBeNull();
  });

  it("QA-13: a point held by two or more opposing checkers cannot be landed on", () => {
    const { board } = position({
      white: { points: { 13: 1 } },
      black: { points: { 9: 2 } },
    });
    expect(canPlayHalfMove(board, "white", { from: 13, to: 9, die: 4 })).toBe(false);
    // The die still has its other uses; 9 is just never a destination.
    const destinations = halfMovesFor(board, "white", 4).map((m) => m.to);
    expect(destinations).not.toContain(9);
  });

  it("landing on an own point stacks; a lone opposing checker does not block", () => {
    const { board } = position({
      white: { points: { 13: 1, 9: 2 } },
      black: { points: { 11: 1 } },
    });
    expect(canPlayHalfMove(board, "white", { from: 13, to: 9, die: 4 })).toBe(true);
    expect(canPlayHalfMove(board, "white", { from: 13, to: 11, die: 2 })).toBe(true);

    const stacked = applyHalfMove(board, "white", { from: 13, to: 9, die: 4 });
    expect(stacked.points[9 - 1]).toEqual({ owner: "white", count: 3 });
  });

  it("moves travel in the player's own direction", () => {
    const { board } = position({
      white: { points: { 13: 1 } },
      black: { points: { 12: 1 } },
    });
    // White moves toward point 1; Black moves toward point 24.
    expect(halfMovesFor(board, "white", 3)).toEqual([{ from: 13, to: 10, die: 3 }]);
    expect(halfMovesFor(board, "black", 3)).toEqual([{ from: 12, to: 15, die: 3 }]);
  });
});
