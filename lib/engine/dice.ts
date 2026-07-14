/**
 * A seedable dice roller for CONSUMERS (the game loop, the bot's
 * self-play, tests). The engine itself never rolls dice: dice are
 * inputs to every engine function, which is what keeps the engine
 * deterministic. No file in the engine core imports this one.
 */

import type { Die, Roll } from "./types";

/**
 * Returns a function producing rolls from a deterministic PRNG
 * (mulberry32). The same seed always yields the same roll sequence.
 */
export function createRoller(seed: number = Date.now()): () => Roll {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const die = (): Die => (Math.floor(next() * 6) + 1) as Die;
  return () => [die(), die()];
}
