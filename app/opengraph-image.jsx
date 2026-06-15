import { ImageResponse } from "next/og";

export const alt = "Lazio24 — la tua giornata biancoceleste";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a4da2",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 130, fontWeight: 700 }}>Lazio</span>
          <span
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              background: "#7ec8f0",
              color: "#0a4da2",
              padding: "6px 32px",
              borderRadius: 24,
            }}
          >
            24
          </span>
          <span style={{ fontSize: 72, fontWeight: 700, color: "#7ec8f0" }}>
            .news
          </span>
        </div>
        <div style={{ fontSize: 42, marginTop: 28, color: "#bfe0f5" }}>
          La tua giornata biancoceleste
        </div>
      </div>
    ),
    { ...size }
  );
}
