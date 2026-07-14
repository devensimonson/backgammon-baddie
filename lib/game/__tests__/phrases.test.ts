import { describe, expect, it } from "vitest";
import { BADDIE_PHRASES, createBaddieVoice, type PhraseCategory } from "../phrases";

const CATEGORIES = Object.keys(BADDIE_PHRASES) as PhraseCategory[];

/** A deterministic rng that cycles through a fixed sequence of floats. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("phrases: the Baddie voice", () => {
  it("QA-15: never repeats a category's line twice in immediate succession", () => {
    // An rng that would otherwise return index 0 every time forces the
    // no-repeat guard to advance to a different line.
    const voice = createBaddieVoice(seqRng([0, 0, 0.5, 0.5, 0.9, 0.9]));
    for (const category of CATEGORIES) {
      let previous = "";
      for (let i = 0; i < 30; i++) {
        const line = voice.pick(category);
        if (BADDIE_PHRASES[category].length > 1) {
          expect(line, `repeat in "${category}"`).not.toBe(previous);
        }
        previous = line;
      }
    }
  });

  it("QA-15: always returns a line from the requested category", () => {
    const voice = createBaddieVoice(seqRng([0.1, 0.4, 0.7, 0.95]));
    for (const category of CATEGORIES) {
      for (let i = 0; i < 10; i++) {
        expect(BADDIE_PHRASES[category]).toContain(voice.pick(category));
      }
    }
  });

  it("QA-24: no user-facing line contains an em dash", () => {
    for (const category of CATEGORIES) {
      for (const line of BADDIE_PHRASES[category]) {
        expect(line, `em dash in "${line}"`).not.toContain("—");
      }
    }
  });

  it("QA-24: opponent copy never claims to be unbeatable", () => {
    for (const category of CATEGORIES) {
      for (const line of BADDIE_PHRASES[category]) {
        expect(line.toLowerCase()).not.toContain("unbeatable");
        expect(line.toLowerCase()).not.toContain("grandmaster");
      }
    }
  });

  it("frequent categories are deep enough for a long game", () => {
    for (const category of ["yourRoll", "goodMove", "riskyMove", "baddieTurn"] as PhraseCategory[]) {
      expect(BADDIE_PHRASES[category].length).toBeGreaterThanOrEqual(20);
    }
  });
});
