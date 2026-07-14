import { describe, expect, it } from "vitest";
import { applyPlay, legalPlays, movesFrom, newGame, roll } from "../../engine";
import type { GameState, Play, Point } from "../../engine";
import {
  commitStaged,
  isForfeit,
  maxPlayLength,
  resolveDie,
  stageMove,
  stagingOptions,
} from "../moves";

describe("moves: staging matches the engine", () => {
  it("QA-06: stagingOptions offers exactly what movesFrom returns per source", () => {
    const state = roll(newGame("white"), [6, 4]);
    const options = stagingOptions(state, []);
    for (const [from, destinations] of options) {
      expect([...destinations].sort()).toEqual([...movesFrom(state, from, [])].sort());
    }
    // From the opening 24-point, a 6 lands on 18 and a 4 lands on 20.
    expect(new Set(options.get(24))).toEqual(new Set([18, 20]));
  });

  it("QA-06: resolveDie returns the exact die geometry for point moves", () => {
    const state = roll(newGame("white"), [6, 4]);
    expect(resolveDie(state, [], 24, 18, "white")).toBe(6);
    expect(resolveDie(state, [], 24, 20, "white")).toBe(4);
  });

  it("QA-09: maxPlayLength is four for doubles and the turn is not a forfeit", () => {
    const state = roll(newGame("white"), [2, 2]);
    expect(maxPlayLength(state)).toBe(4);
    expect(isForfeit(state)).toBe(false);
  });

  it("QA-07: every legal play can be staged step by step and commits to an engine play", () => {
    const state = roll(newGame("white"), [3, 1]);
    const plays = legalPlays(state);
    expect(plays.length).toBeGreaterThan(0);

    for (const play of plays) {
      let staged: Play = [];
      for (const move of play) {
        const next = stageMove(state, staged, move.from, move.to);
        expect(next, `staging ${JSON.stringify(move)}`).not.toBeNull();
        staged = next as Play;
      }
      expect(staged.length).toBe(play.length);

      const committed = commitStaged(state, staged);
      expect(committed).not.toBeNull();
      // The committed play is one the engine offered, and applying it never throws.
      expect(legalPlays(state)).toContainEqual(committed);
      expect(() => applyPlay(state, committed as Play)).not.toThrow();
      // It reaches the same position the original play does.
      expect(applyPlay(state, committed as Play)).toEqual(applyPlay(state, play));
    }
  });

  it("QA-13: a bear-off overshoot resolves to the larger die the engine charges", () => {
    // White: 14 borne off and one checker on point 2 (its highest home
    // point). A 5 overshoots and bears it off.
    const points: Point[] = new Array(24).fill(null);
    points[1] = { owner: "white", count: 1 }; // absolute point 2
    points[12] = { owner: "black", count: 15 }; // parked out of the way
    const state: GameState = {
      board: { points, bar: { white: 0, black: 0 }, off: { white: 14, black: 0 } },
      toMove: "white",
      phase: { kind: "moving", dice: [5, 5] },
      cube: { value: 1, owner: "centered" },
    };
    expect(maxPlayLength(state)).toBe(1);
    expect(resolveDie(state, [], 2, "off", "white")).toBe(5);

    const staged = stageMove(state, [], 2, "off");
    expect(staged).not.toBeNull();
    const committed = commitStaged(state, staged as Play);
    expect(committed).not.toBeNull();
    const after = applyPlay(state, committed as Play);
    expect(after.phase.kind).toBe("game-over");
  });
});

describe("moves: forfeit detection", () => {
  it("QA-12: a stuck-on-the-bar roll reports a forfeit with no legal play", () => {
    const points: Point[] = new Array(24).fill(null);
    points[0] = { owner: "white", count: 14 }; // absolute point 1
    points[18] = { owner: "black", count: 2 }; // point 19 blocks the only 6-entry
    points[19] = { owner: "black", count: 13 }; // point 20
    const state: GameState = {
      board: { points, bar: { white: 1, black: 0 }, off: { white: 0, black: 0 } },
      toMove: "white",
      phase: { kind: "moving", dice: [6, 6] },
      cube: { value: 1, owner: "centered" },
    };
    expect(legalPlays(state)).toEqual([]);
    expect(isForfeit(state)).toBe(true);
    expect(maxPlayLength(state)).toBe(0);
  });
});
