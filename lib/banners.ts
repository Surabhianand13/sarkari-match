import { getDb } from "@/lib/db";

export type Banner = { id: string; title: string; linkUrl: string | null; position: number; active: boolean; version: number };

export const BANNER_SPECS = { desktop: { width: 1800, height: 600, ratio: "3:1" }, mobile: { width: 900, height: 1200, ratio: "3:4" } } as const;
export const MAX_BANNER_BYTES = 2 * 1024 * 1024;

// Detects the real image type from the file's first bytes instead of trusting the browser-supplied type.
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length > 12 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

type Row = { id: string; title: string; link_url: string | null; position: number; active: boolean; updated_at: string };

function toBanner(row: Row): Banner {
  return { id: row.id, title: row.title, linkUrl: row.link_url, position: row.position, active: row.active, version: new Date(row.updated_at).getTime() };
}

export async function getBanners(onlyActive: boolean): Promise<Banner[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.query<Row>(
    `select id, title, link_url, position, active, updated_at::text as updated_at from banners ${onlyActive ? "where active" : ""} order by position, created_at`
  );
  return result.rows.map(toBanner);
}

export async function getBanner(id: string): Promise<Banner | null> {
  const db = await getDb();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<Row>("select id, title, link_url, position, active, updated_at::text as updated_at from banners where id = $1", [id]);
  return result.rows[0] ? toBanner(result.rows[0]) : null;
}
