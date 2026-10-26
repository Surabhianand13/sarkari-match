import { notFound } from "next/navigation";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { requireUser } from "@/lib/auth/guards";
import { getSession } from "@/lib/practice";

export const metadata = { title: "Practice session", robots: { index: false, follow: false } };

export default async function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const session = await getSession(user.id, sessionId);
  if (!session) notFound();
  return <PracticeRunner session={session} />;
}
