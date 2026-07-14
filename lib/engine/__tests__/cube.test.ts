import { describe, expect, it } from "vitest";
import { dropDouble, offerDouble, takeDouble } from "../cube";
import { newGame } from "../setup";
import type { GameState } from "../types";
import { position } from "./helpers";

const CUBE_VALUES = [1, 2, 4, 8, 16, 32, 64];

describe("the doubling cube", () => {
  it("QA-23: a new game's cube is 1 and centered; takes walk the legal value sequence", () => {
    let state: GameState = newGame("white");
    expect(state.cube).toEqual({ value: 1, owner: "centered" });

    // Offer/take back and forth: 1 -> 2 -> 4 -> ... -> 64.
    for (let i = 1; i < CUBE_VALUES.length; i++) {
      state = takeDouble(offerDouble(state));
      expect(state.cube.value).toBe(CUBE_VALUES[i]);
      expect(CUBE_VALUES).toContain(state.cube.value);
      // Ownership alternates to each taker, so the next offer is legal too.
      state = { ...state, toMove: state.cube.owner as GameState["toMove"] };
    }
    expect(state.cube.value).toBe(64);
  });

  it("QA-24: only the owner (or either side while centered) may offer, before rolling", () => {
    // Centered: the player on turn may offer.
    expect(() => offerDouble(newGame("white"))).not.toThrow();
    expect(() => offerDouble(newGame("black"))).not.toThrow();

    // Owned by the opponent: offering throws.
    const blackOwns = position({
      white: { points: { 13: 2 } },
      black: { points: { 12: 2 } },
      toMove: "white",
      cube: { value: 2, owner: "black" },
    });
    expect(() => offerDouble(blackOwns)).toThrow(/does not own/);

    // Owned by the player on turn: offering is legal.
    const whiteOwns = { ...blackOwns, cube: { value: 2, owner: "white" } } as GameState;
    expect(() => offerDouble(whiteOwns)).not.toThrow();

    // Only before the roll: not while moving.
    const midTurn = position({
      white: { points: { 13: 2 } },
      black: { points: { 12: 2 } },
      dice: [3, 1],
    });
    expect(() => offerDouble(midTurn)).toThrow(/phase/);
  });

  it("QA-25: a take doubles the value, hands the cube to the taker, and play continues", () => {
    const offered = offerDouble(newGame("white"));
    const taken = takeDouble(offered);

    expect(taken.cube).toEqual({ value: 2, owner: "black" });
    expect(taken.phase).toEqual({ kind: "awaiting-roll" });
    expect(taken.toMove).toBe("white"); // the offerer still rolls this turn
  });

  it("QA-26: a drop ends the game at the pre-double stake with no multiplier", () => {
    const state = position({
      white: { points: { 13: 2 } },
      // Black has borne off nothing -- but a drop is never a gammon.
      black: { points: { 12: 2 } },
      toMove: "white",
      cube: { value: 4, owner: "white" },
    });
    const dropped = dropDouble(offerDouble(state));

    expect(dropped.phase.kind).toBe("game-over");
    if (dropped.phase.kind !== "game-over") return;
    expect(dropped.phase.result).toEqual({ winner: "white", kind: "drop", stake: 4 });
  });

  it("QA-28: the cube never rises above 64", () => {
    const maxed = position({
      white: { points: { 13: 2 } },
      black: { points: { 12: 2 } },
      toMove: "white",
      cube: { value: 64, owner: "white" },
    });
    expect(() => offerDouble(maxed)).toThrow(/64/);
  });
});
