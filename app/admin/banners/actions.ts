"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";
import { MAX_BANNER_BYTES, sniffImageType } from "@/lib/banners";

const BASE = "/admin/banners";

async function readImage(formData: FormData, field: string) {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BANNER_BYTES) throw new Error(`${field === "desktop" ? "Desktop" : "Mobile"} image is over 2 MB. Compress it and upload again.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new Error(`${field === "desktop" ? "Desktop" : "Mobile"} image must be a PNG, JPG or WebP file.`);
  return { bytes, type };
}

function safeLink(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function saveBanner(formData: FormData) {
  const admin = await requireAdmin();
  const id = optionalText(formData, "id");
  const title = text(formData, "title");
  const link = optionalText(formData, "link_url");
  const linkUrl = safeLink(link);
  const active = formData.get("active") === "on";
  const back = id ? `${BASE}/${id}` : `${BASE}/new`;
  if (link && !linkUrl) goTo(withMessage(back, "error", "The link must be a page on this site (starting with /) or a full https:// address."));
  const db = await adminDb();
  let savedId = id;
  try {
    const desktop = await readImage(formData, "desktop");
    const mobile = await readImage(formData, "mobile");
    if (!id) {
      if (!desktop || !mobile) throw new Error("Upload both a desktop (3:1) and a mobile (3:4) image.");
      const next = (await db.query<{ n: number }>("select coalesce(max(position), -1) + 1 as n from banners")).rows[0].n;
      savedId = (await db.query<{ id: string }>(
        `insert into banners (title, link_url, desktop_image, desktop_type, mobile_image, mobile_type, position, active) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [title, linkUrl, desktop.bytes, desktop.type, mobile.bytes, mobile.type, next, active]
      )).rows[0].id;
    } else {
      await db.query("update banners set title = $2, link_url = $3, active = $4, updated_at = now() where id = $1", [id, title, linkUrl, active]);
      if (desktop) await db.query("update banners set desktop_image = $2, desktop_type = $3, updated_at = now() where id = $1", [id, desktop.bytes, desktop.type]);
      if (mobile) await db.query("update banners set mobile_image = $2, mobile_type = $3, updated_at = now() where id = $1", [id, mobile.bytes, mobile.type]);
    }
  } catch (error) {
    goTo(withMessage(back, "error", friendlyDbError(error)));
  }
  await writeAudit(db, { actorId: admin.id, action: id ? "banner.update" : "banner.create", entityType: "banner", entityId: savedId, after: { title, linkUrl, active } });
  revalidatePublicContent();
  goTo(withMessage(BASE, "notice", id ? "Banner updated." : "Banner added."));
}

export async function toggleBanner(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const db = await adminDb();
  const row = (await db.query<{ active: boolean }>("update banners set active = not active, updated_at = now() where id = $1 returning active", [id])).rows[0];
  if (row) await writeAudit(db, { actorId: admin.id, action: "banner.toggle", entityType: "banner", entityId: id, after: { active: row.active } });
  revalidatePublicContent();
  goTo(BASE);
}

export async function moveBanner(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const direction = text(formData, "direction") === "up" ? -1 : 1;
  const db = await adminDb();
  const rows = (await db.query<{ id: string }>("select id from banners order by position, created_at")).rows.map((row) => row.id);
  const from = rows.indexOf(id);
  const to = from + direction;
  if (from >= 0 && to >= 0 && to < rows.length) {
    [rows[from], rows[to]] = [rows[to], rows[from]];
    for (const [position, bannerId] of rows.entries()) await db.query("update banners set position = $2 where id = $1", [bannerId, position]);
  }
  revalidatePublicContent();
  goTo(BASE);
}

export async function deleteBanner(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const db = await adminDb();
  await db.query("delete from banners where id = $1", [id]);
  await writeAudit(db, { actorId: admin.id, action: "banner.delete", entityType: "banner", entityId: id });
  revalidatePublicContent();
  goTo(withMessage(BASE, "notice", "Banner deleted."));
}
