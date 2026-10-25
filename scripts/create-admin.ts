import "./_env";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/auth/password";
import { getDb } from "../lib/db";

// Usage: pnpm db:create-admin  (prompts for email and password; nothing is stored in the repo)
async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = (process.env.ADMIN_EMAIL ?? (await rl.question("Admin email: "))).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? (await rl.question("Admin password (min 12 characters): "));
  rl.close();
  if (password.length < 12) throw new Error("Password must be at least 12 characters");
  const hash = await hashPassword(password);
  await db.query(
    `insert into users (email, password_hash, roles, email_verified_at) values ($1, $2, array['admin'], now())
     on conflict ((lower(email))) do update set password_hash = excluded.password_hash, roles = (select array(select distinct unnest(users.roles || array['admin']))), updated_at = now()`,
    [email, hash]
  );
  console.log(`admin ready: ${email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
