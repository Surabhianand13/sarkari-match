import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { FactoryMonitor } from "@/components/admin/factory-monitor";
import { adminDb } from "@/lib/admin/db";
import { uuidPattern } from "@/lib/admin/api";
import { batchSnapshot } from "@/lib/question-factory/monitor";

export const metadata = { title: "Question factory run" };

export default async function FactoryRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const snapshot = await batchSnapshot(await adminDb(), id);
  if (!snapshot) notFound();
  return (
    <div className="grid gap-4">
      <AdminHeader title="Question factory run" description="Watch each AI worker as questions move from writing to checking, fixing and review. Leave this page open while it runs." action={{ href: "/admin/factory", label: "All runs" }} />
      <FactoryMonitor id={id} initial={snapshot} />
    </div>
  );
}
