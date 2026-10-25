import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = `${brand.fullName} - govt job notifications matched to your eligibility`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0B2D63,#0D9488)", color: "#fff" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#B9F8CD" }}>{brand.fullName}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Govt job notifications matched to your eligibility</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: "rgba(255,255,255,0.8)" }}>Verified notifications · Free eligibility check · Affordable mock tests</div>
      </div>
    ),
    size
  );
}
