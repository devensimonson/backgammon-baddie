import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
const prompt = readFileSync(join(ROOT, "app", "game", "MobileGate.tsx"), "utf8");
const layout = readFileSync(join(ROOT, "app", "layout.tsx"), "utf8");
const dock = readFileSync(join(ROOT, "app", "game", "Dock.tsx"), "utf8");

describe("mobile play responsive contract", () => {
  it("QA-01 / QA-02 / QA-04: gates phone portrait only and keeps landscape playable", () => {
    expect(css).toContain("(orientation: portrait) and (max-width: 640px)");
    expect(css).toContain("(orientation: landscape) and (max-width: 899px) and (max-height: 540px)");
    expect(prompt).toContain("Turn sideways to");
    expect(prompt).not.toContain("laptop or tablet");
  });

  it("QA-12 / QA-16: preserves 44px actions, safe areas, and dynamic viewport fit", () => {
    expect(css).toMatch(/min-(?:width|height): 44px/);
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
    expect(css).toContain("100dvh");
    expect(layout).toContain('viewportFit: "cover"');
  });

  it("QA-22: keeps the New game control in the shared visible focus treatment", () => {
    expect(css).toContain(".top-btn:focus-visible,");
  });

  it("QA-03 / QA-19 / QA-23: orientation is presentation-only with reduced-motion fallback", () => {
    expect(prompt).toContain('window.matchMedia("(orientation: portrait) and (max-width: 640px)")');
    expect(prompt).not.toMatch(/saveGame|clearGame|setGame|localStorage/);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".phone-rotate { animation: none; transform: rotate(90deg); }");
  });

  it("QA-06: a completed staged play exposes an explicit End turn action", () => {
    expect(dock).toContain("canEndTurn");
    expect(dock).toContain("End turn");
  });
});
