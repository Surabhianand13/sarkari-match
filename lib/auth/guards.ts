import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") return demoUser();
    redirect("/login");
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

export async function getOptionalUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireAdmin() {
  const user = await requireUser();
  const roles = (user.app_metadata?.roles ?? []) as string[];
  if (!roles.includes("admin")) redirect("/dashboard");
  return user;
}

function demoUser() {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    app_metadata: { roles: ["admin"] },
    user_metadata: { full_name: "Demo User" },
    aud: "authenticated",
    created_at: new Date(0).toISOString()
  };
}
