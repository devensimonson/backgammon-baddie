import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BOT_DIR = join(__dirname, "..");

const botSourceFiles = readdirSync(BOT_DIR)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => join(BOT_DIR, name));

describe("purity (the bot imports nothing but the engine's public API and itself)", () => {
  it("QA-12: every import is a sibling bot file or the engine's public index", () => {
    expect(botSourceFiles.length).toBeGreaterThan(0);
    for (const file of botSourceFiles) {
      const source = readFileSync(file, "utf8");
      const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const specifier of specifiers) {
        // No react, no next, no node builtins, no packages, no engine
        // internals -- only "./sibling" or exactly "../engine".
        expect(specifier, `${file} imports "${specifier}"`).toMatch(
          /^(\.\/[\w-]+|\.\.\/engine)$/,
        );
      }
    }
  });

  it("QA-12: no DOM, network, storage, or process access anywhere in the bot", () => {
    const banned = [
      /\bwindow\b/,
      /\bdocument\b/,
      /\bfetch\s*\(/,
      /\blocalStorage\b/,
      /\bXMLHttpRequest\b/,
      /\brequire\s*\(/,
      /\bprocess\b/,
    ];
    for (const file of botSourceFiles) {
      const source = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("QA-05: no source of randomness anywhere in the bot", () => {
    const banned = [/Math\.random/, /\bcrypto\b/];
    for (const file of botSourceFiles) {
      const source = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
