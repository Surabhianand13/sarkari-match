import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { TestPlayer } from "@/components/tests/test-player";
import { requireUser } from "@/lib/auth/guards";
import { getPlayerData } from "@/lib/tests/attempts";

export const metadata = { title: "Test in progress", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser();
  const data = await getPlayerData(user.id, attemptId);
  if (!data) notFound();
  if (data.status === "submitted") redirect(`/tests/attempt/${attemptId}/result` as Route);
  return <TestPlayer data={data} />;
}
