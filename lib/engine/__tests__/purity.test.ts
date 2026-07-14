import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { offerDouble, takeDouble } from "../cube";
import { legalPlays, movesFrom } from "../plays";
import { newGame } from "../setup";
import { applyPlay, roll } from "../turn";
import { deepFreeze } from "./helpers";

const ENGINE_DIR = join(__dirname, "..");

const engineSourceFiles = readdirSync(ENGINE_DIR)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => join(ENGINE_DIR, name));

describe("purity (the engine imports nothing but itself)", () => {
  it("QA-29: every import in every engine source file is a relative engine import", () => {
    expect(engineSourceFiles.length).toBeGreaterThan(0);
    for (const file of engineSourceFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of specifiers) {
        // No react, no next, no node builtins, no packages -- nothing
        // but the engine's own files.
        expect(specifier, `${file} imports "${specifier}"`).toMatch(/^\.\//);
      }
    }
  });

  it("QA-29: no DOM, network, storage, or process access anywhere in the engine", () => {
    const banned = [
      /\bwindow\b/,
      /\bdocument\b/,
      /\bfetch\s*\(/,
      /\blocalStorage\b/,
      /\bXMLHttpRequest\b/,
      /\brequire\s*\(/,
      /\bprocess\b/,
    ];
    for (const file of engineSourceFiles) {
      const source = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("immutability and determinism", () => {
  it("QA-30: engine functions never mutate their inputs (deep-frozen inputs work fine)", () => {
    const start = deepFreeze(newGame("white"));
    const snapshot = JSON.parse(JSON.stringify(start));

    const offered = offerDouble(start);
    const taken = takeDouble(deepFreeze(offered));
    const rolled = roll(deepFreeze(taken), deepFreeze([3, 1] as const));
    const plays = legalPlays(deepFreeze(rolled));
    const played = applyPlay(rolled, deepFreeze(plays[0]));

    // The original state is untouched by everything above.
    expect(start).toEqual(snapshot);
    expect(played).not.toBe(rolled);
  });

  it("QA-30: identical inputs always produce identical outputs", () => {
    const state = roll(newGame("white"), [6, 1]);
    expect(legalPlays(state)).toEqual(legalPlays(state));

    const play = legalPlays(state)[0];
    expect(applyPlay(state, play)).toEqual(applyPlay(state, play));
    expect(movesFrom(state, 13)).toEqual(movesFrom(state, 13));
  });
});
