import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/banners";

describe("banner image detection", () => {
  it("recognises PNG, JPEG and WebP by their bytes", () => {
    expect(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/png");
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0]))).toBe("image/webp");
  });

  it("rejects other files even when they are named like images", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a......."))).toBeNull();
  });
});
