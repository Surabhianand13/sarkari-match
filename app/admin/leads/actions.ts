"use server";

import { uuidPattern } from "@/lib/admin/api";
import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { checkbox, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { jobPathsForRecruitment, revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";
import { leadFieldsFromForm } from "@/lib/ingest/fields";
import { LeadError, approveLead, closeLead, saveLead } from "@/lib/ingest/leads";
import { createIngestToken, revokeIngestToken } from "@/lib/ingest/tokens";

const LIST = "/admin/leads";

// One form, several buttons: save, publish, create a draft, reject, or mark as a duplicate. Each button binds its own intent,
// because a button's name and value do not reach a server action.
export async function reviewLead(intent: string, formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!uuidPattern.test(id)) goTo(withMessage(LIST, "error", "Lead not found."));
  const base = `${LIST}/${id}`;
  const note = text(formData, "note");
  const fields = leadFieldsFromForm(formData);
  const db = await adminDb();

  let destination: string;
  try {
    if (intent === "save") {
      await saveLead(db, id, fields, admin.id);
      destination = withMessage(base, "notice", "Saved.");
    } else if (intent === "reject" || intent === "duplicate") {
      await closeLead(db, { id, actorId: admin.id, status: intent === "reject" ? "rejected" : "duplicate", note });
      destination = withMessage(LIST, "notice", intent === "reject" ? "Rejected. It will not come back if it is spotted again." : "Marked as a duplicate.");
    } else if (intent === "publish" || intent === "draft") {
      if (intent === "publish" && !checkbox(formData, "verified")) throw new LeadError("Tick the box to confirm you checked these details against the official notification.");
      const { recruitmentId } = await approveLead(db, { id, actorId: admin.id, mode: intent, fields, note });
      if (intent === "publish") revalidatePublicContent(await jobPathsForRecruitment(db, recruitmentId));
      destination = withMessage(`/admin/recruitments/${recruitmentId}`, "notice", intent === "publish" ? "Published. It is live on the site now." : "Draft created. Review it here, then publish it from this page.");
    } else {
      throw new LeadError("Unknown action.");
    }
  } catch (error) {
    destination = withMessage(base, "error", error instanceof LeadError ? error.message : friendlyDbError(error));
  }
  goTo(destination);
}

export type TokenState = { token?: string; error?: string };

// Returns the new token once, to be copied into the extension. Only its hash is kept.
export async function createToken(_previous: TokenState, formData: FormData): Promise<TokenState> {
  const admin = await requireAdmin();
  const label = text(formData, "label");
  if (label.length < 2) return { error: "Name the browser or person this token is for." };
  try {
    const db = await adminDb();
    const { id, token } = await createIngestToken(db, label, admin.id);
    await writeAudit(db, { actorId: admin.id, action: "ingest_token.create", entityType: "ingest_token", entityId: id, after: { label } });
    return { token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the token." };
  }
}

export async function revokeToken(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const base = `${LIST}/extension`;
  if (!uuidPattern.test(id)) goTo(withMessage(base, "error", "Token not found."));
  const db = await adminDb();
  await revokeIngestToken(db, id);
  await writeAudit(db, { actorId: admin.id, action: "ingest_token.revoke", entityType: "ingest_token", entityId: id });
  goTo(withMessage(base, "notice", "Token revoked. The extension using it stops working."));
}
