import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@/lib/brand";

export const alt = `${brand.fullName}: SSC CGL mock test series and govt job notifications`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/sarkarimatch-icon-512.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0B2D63,#0D9488)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700, color: "#B9F8CD" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={icon} width={88} height={88} alt="" style={{ marginRight: 20 }} />{brand.fullName}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>SSC CGL mock tests written by experts, checked by AI</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: "rgba(255,255,255,0.8)" }}>Solutions and analysis · Free sample test · Govt job notifications</div>
      </div>
    ),
    size
  );
}
