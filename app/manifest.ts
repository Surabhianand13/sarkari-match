import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.fullName,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F9FC",
    theme_color: "#0B2D63",
    lang: "en-IN",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/sarkarimatch-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/sarkarimatch-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
