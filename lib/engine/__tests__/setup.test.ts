import { describe, expect, it } from "vitest";
import { checkersAt, pointFor } from "../board";
import { newGame } from "../setup";

describe("starting position", () => {
  it("QA-01: standard setup, per player from their own perspective", () => {
    const state = newGame("white");

    for (const player of ["white", "black"] as const) {
      // 2 on the 24-point, 5 on the 13-point, 3 on the 8-point, 5 on the 6-point.
      expect(checkersAt(state.board, player, pointFor(player, 24))).toBe(2);
      expect(checkersAt(state.board, player, pointFor(player, 13))).toBe(5);
      expect(checkersAt(state.board, player, pointFor(player, 8))).toBe(3);
      expect(checkersAt(state.board, player, pointFor(player, 6))).toBe(5);

      // 15 checkers total, none on the bar, none borne off.
      let total = 0;
      for (let abs = 1; abs <= 24; abs++) total += checkersAt(state.board, player, abs);
      expect(total).toBe(15);
      expect(state.board.bar[player]).toBe(0);
      expect(state.board.off[player]).toBe(0);
    }
  });

  it("QA-01: new game starts awaiting a roll with a centered cube at 1", () => {
    const state = newGame("black");
    expect(state.toMove).toBe("black");
    expect(state.phase).toEqual({ kind: "awaiting-roll" });
    expect(state.cube).toEqual({ value: 1, owner: "centered" });
  });

  it("absolute placement matches the convention (White home 1-6, Black home 19-24)", () => {
    const { board } = newGame("white");
    // White absolute: 24:2, 13:5, 8:3, 6:5. Black mirrored: 1:2, 12:5, 17:3, 19:5.
    expect(checkersAt(board, "white", 24)).toBe(2);
    expect(checkersAt(board, "white", 13)).toBe(5);
    expect(checkersAt(board, "white", 8)).toBe(3);
    expect(checkersAt(board, "white", 6)).toBe(5);
    expect(checkersAt(board, "black", 1)).toBe(2);
    expect(checkersAt(board, "black", 12)).toBe(5);
    expect(checkersAt(board, "black", 17)).toBe(3);
    expect(checkersAt(board, "black", 19)).toBe(5);
  });
});
