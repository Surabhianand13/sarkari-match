import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B2D63", color: "#32D66B", fontSize: 96, fontWeight: 800 }}>
        SM
      </div>
    ),
    size
  );
}
