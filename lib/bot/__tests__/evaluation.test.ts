import { describe, expect, it } from "vitest";
import { applyPlay, legalPlays } from "../../engine";
import { playKey, position } from "../../engine/__tests__/helpers";
import { chooseMove } from "../index";

describe("positional judgment (the bot evaluates, it does not just grab)", () => {
  it("QA-06: picks a better play even when it is not the first the engine lists", () => {
    // The engine enumerates from White's low points up, so the quiet
    // 13/8 line is listed before the hit from 21. The bot must find
    // the hit anyway.
    const state = position({
      white: { points: { 13: 2, 21: 2 } },
      black: { points: { 16: 1, 4: 2 } },
      dice: [5, 2],
    });
    const plays = legalPlays(state);
    const chosen = chooseMove(state)!;

    // Premise: the first-listed play does not hit...
    expect(applyPlay(state, plays[0]).board.bar.black).toBe(0);
    // ...and the bot did not settle for it: it chose a later, hitting play.
    expect(chosen).not.toEqual(plays[0]);
    expect(applyPlay(state, chosen).board.bar.black).toBe(1);
  });

  it("QA-07: prefers hitting an opponent blot over a quiet alternative", () => {
    // Black's blot on 5 can be hit with the 3 from White's 8-point;
    // quiet plays (like clearing the 6-point) exist and must lose.
    const state = position({
      white: { points: { 8: 2, 6: 2 } },
      black: { points: { 5: 1, 19: 2, 20: 2 } },
      dice: [3, 4],
    });
    const plays = legalPlays(state);
    const chosen = chooseMove(state)!;

    // Premise: a non-hitting play is on offer.
    expect(plays.some((play) => applyPlay(state, play).board.bar.black === 0)).toBe(true);
    // The bot hits anyway.
    expect(applyPlay(state, chosen).board.bar.black).toBe(1);
  });

  it("QA-08: prefers the safe play over one leaving a blot in range", () => {
    // Black's back checkers on point 1 shoot at anything on points 2-7.
    // Alternatives strand a blot in that range (e.g. on 4) or leave two
    // blots; 13/11 13/8 makes the 11-point and leaves only a blot on 8,
    // out of every direct shot.
    const state = position({
      white: { points: { 13: 2, 11: 1, 6: 2 } },
      black: { points: { 1: 2, 19: 2 } },
      dice: [5, 2],
    });
    const plays = legalPlays(state);
    const chosen = chooseMove(state)!;

    expect(plays.length).toBeGreaterThan(1);
    expect(playKey(chosen)).toBe(
      playKey([
        { from: 13, to: 11, die: 2 },
        { from: 13, to: 8, die: 5 },
      ]),
    );
  });

  it("QA-09: in a pure race, bears off two checkers instead of shuffling", () => {
    // 6/off 1/off takes two checkers off; the legal alternative
    // 6/5 5/off takes only one for the same pips.
    const state = position({
      white: { points: { 6: 1, 1: 3 }, off: 11 },
      black: { points: { 19: 2, 20: 2 } },
      dice: [6, 1],
    });
    const plays = legalPlays(state);
    const chosen = chooseMove(state)!;

    expect(plays.length).toBeGreaterThan(1);
    expect(applyPlay(state, chosen).board.off.white).toBe(13);
  });

  it("QA-11: a play that wins the game outright is never passed over", () => {
    // 6/off 1/off bears off White's last two checkers and wins;
    // 6/5 5/off leaves one on the board.
    const state = position({
      white: { points: { 6: 1, 1: 1 }, off: 13 },
      black: { points: { 19: 2, 20: 2 }, off: 1 },
      dice: [6, 1],
    });
    const plays = legalPlays(state);
    const chosen = chooseMove(state)!;

    expect(plays.length).toBeGreaterThan(1);
    const after = applyPlay(state, chosen);
    expect(after.phase.kind).toBe("game-over");
    expect(after.phase.kind === "game-over" && after.phase.result.winner).toBe("white");
  });
});
