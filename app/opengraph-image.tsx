import { ImageResponse } from "next/og";

// Branded social share card (Open Graph). Next renders this to a real PNG at
// build time and wires the og:image meta automatically. Sleek modern-dark,
// magenta for The Baddie, cyan for you, per the design system.
export const alt =
  "The Backgammon Baddie: play backgammon free against a cheeky computer opponent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Die({ pips }: { pips: [number, number][] }) {
  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: 20,
        background: "linear-gradient(160deg, #faf5ea, #ded5c2)",
        position: "relative",
        display: "flex",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
      }}
    >
      {pips.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#191325",
          }}
        />
      ))}
    </div>
  );
}

function Checker({ mine }: { mine: boolean }) {
  return (
    <div
      style={{
        width: 66,
        height: 66,
        borderRadius: 33,
        display: "flex",
        background: mine
          ? "radial-gradient(circle at 35% 28%, #fbf7ee, #ddd4c1)"
          : "radial-gradient(circle at 35% 28%, #37315e, #141127)",
        boxShadow: mine
          ? "0 6px 14px rgba(0,0,0,0.4), 0 0 0 3px rgba(66,227,211,0.55)"
          : "0 6px 14px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,61,132,0.6)",
      }}
    />
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f2effc",
          background:
            "radial-gradient(900px 500px at 82% -10%, rgba(255,61,132,0.28), transparent 60%), radial-gradient(900px 520px at -8% 110%, rgba(66,227,211,0.22), transparent 58%), linear-gradient(160deg, #211c40, #17142d)",
        }}
      >
        {/* eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            color: "#a29dc8",
            textTransform: "uppercase",
          }}
        >
          Play now · No signup · No doubling cube
        </div>

        {/* middle: title + motif */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
              The Backgammon
            </div>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: "#ff3d84" }}>
              Baddie
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 32, lineHeight: 1.35, color: "#bcb7dc", maxWidth: 640 }}>
              One click into a real game against a cheeky, honest computer opponent. It saves in your browser. Beat it if you can.
            </div>
          </div>

          {/* motif: dice + checkers */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            <div style={{ display: "flex", gap: 18 }}>
              <Die pips={[[16, 16], [66, 16], [16, 66], [66, 66], [41, 41]]} />
              <Die pips={[[16, 16], [66, 66], [41, 41]]} />
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <Checker mine={true} />
              <Checker mine={false} />
              <Checker mine={true} />
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex", color: "#a29dc8" }}>
            Built with <span style={{ color: "#ff3d84", marginLeft: 8 }}>Weft</span>
          </div>
          <div style={{ display: "flex", color: "#42e3d3", letterSpacing: 1 }}>thebackgammonbaddie.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
