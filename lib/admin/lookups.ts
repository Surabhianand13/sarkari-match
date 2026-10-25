import { adminDb } from "@/lib/admin/db";

export async function listDepartments() {
  const db = await adminDb();
  return (await db.query<{ id: string; name: string }>("select id, name from departments order by name")).rows;
}

export async function listStates() {
  const db = await adminDb();
  return (await db.query<{ id: string; name: string }>("select id, name from states order by name")).rows;
}

export async function listOrganisationOptions() {
  const db = await adminDb();
  return (await db.query<{ id: string; name: string }>("select id, name from organisations order by name")).rows;
}
