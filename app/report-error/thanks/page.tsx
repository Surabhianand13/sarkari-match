import { ButtonLink, EmptyState } from "@/components/design-system";

export default function ReportThanksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState title="Report received" body="Thanks for helping improve SarkariMatch. This demo flow confirms the correction request and returns you to current notifications." />
      <div className="mt-5 flex justify-center">
        <ButtonLink href="/jobs">Back to notifications</ButtonLink>
      </div>
    </div>
  );
}
