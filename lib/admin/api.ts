import { getOptionalUser } from "@/lib/auth/guards";

// Route handlers answer 401 instead of redirecting to a login page.
export async function adminApiUser() {
  const user = await getOptionalUser();
  return user && user.roles.includes("admin") ? user : null;
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
