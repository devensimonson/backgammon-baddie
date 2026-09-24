import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
const prompt = readFileSync(join(ROOT, "app", "game", "MobileGate.tsx"), "utf8");
const layout = readFileSync(join(ROOT, "app", "layout.tsx"), "utf8");
const dock = readFileSync(join(ROOT, "app", "game", "Dock.tsx"), "utf8");

function cssBlock(source: string, header: string): string {
  const headerStart = source.indexOf(header);
  if (headerStart < 0) return "";
  const open = source.indexOf("{", headerStart);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(headerStart, i + 1);
  }
  return "";
}

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

  it("QA-24: short tablet landscapes switch as one height-aware composition", () => {
    const compact = cssBlock(
      css,
      "@media (orientation: landscape) and (max-width: 1366px) and (max-height: 700px)",
    );

    expect(compact).not.toBe("");
    expect(compact).toContain("--compact-rail: clamp(220px, 25vw, 300px)");
    expect(compact).toContain("grid-template-rows: var(--compact-topbar) var(--compact-status) minmax(0, 1fr)");
    expect(compact).toContain("height: 100dvh");
    expect(compact).toContain("overscroll-behavior: contain");
    expect(compact).toMatch(/\.point\[role="button"\]::after\s*{[\s\S]*?width: 44px/);
  });

  it("QA-25: wide phones retain a denser rail without reducing touch targets", () => {
    expect(css).toContain("--compact-rail: clamp(156px, 22vw, 184px)");
    expect(css).toContain(".legal { width: 44px; height: 44px");
    expect(css).toContain(".btn { width: 100%; min-height: 44px");
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
