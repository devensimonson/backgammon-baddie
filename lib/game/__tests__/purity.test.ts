import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GAME_DIR = join(__dirname, "..");

const gameSourceFiles = readdirSync(GAME_DIR)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => join(GAME_DIR, name));

describe("purity (lib/game imports only the engine and bot public APIs)", () => {
  it("QA-31: every import is a sibling file or exactly ../engine or ../bot", () => {
    expect(gameSourceFiles.length).toBeGreaterThan(0);
    for (const file of gameSourceFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of specifiers) {
        expect(specifier, `${file} imports "${specifier}"`).toMatch(
          /^(\.\/[\w-]+|\.\.\/engine|\.\.\/bot)$/,
        );
      }
    }
  });

  it("QA-31: no DOM, network, storage, or process access anywhere in lib/game", () => {
    const banned = [
      /\bwindow\b/,
      /\bdocument\b/,
      /\bfetch\s*\(/,
      /\blocalStorage\b/,
      /\bXMLHttpRequest\b/,
      /\brequire\s*\(/,
      /\bprocess\b/,
    ];
    for (const file of gameSourceFiles) {
      const source = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
