import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dishoom — Bollywood Reviews, Rankings & News";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d0505",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Gold top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "#D4AF37", display: "flex" }} />

        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(239,72,50,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(212,175,55,0.06) 0%, transparent 60%)",
        }} />

        {/* DISHOOM wordmark */}
        <div style={{
          fontSize: 108,
          fontWeight: 900,
          color: "#EF4832",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: "0 0 80px rgba(239,72,50,0.4)",
          display: "flex",
        }}>
          DISHOOM
        </div>

        {/* Gold rule */}
        <div style={{ width: 80, height: 3, background: "#D4AF37", margin: "20px 0", display: "flex" }} />

        {/* Tagline */}
        <div style={{
          fontSize: 26,
          color: "#D4AF37",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          display: "flex",
        }}>
          BOLLYWOOD · REVIEWED
        </div>

        {/* Stats */}
        <div style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.4)",
          marginTop: 18,
          letterSpacing: "0.06em",
          display: "flex",
        }}>
          4,000+ Films · Rankings · News · Songs
        </div>

        {/* Gold bottom bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "#D4AF37", display: "flex" }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
