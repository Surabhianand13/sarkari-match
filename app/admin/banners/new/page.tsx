import { AdminHeader, Flash } from "@/components/admin/ui";
import { BannerForm } from "@/components/admin/banner-form";

export const metadata = { title: "Add banner" };

export default async function NewBannerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <AdminHeader title="Add banner" description="One desktop image (3:1) and one mobile image (3:4) per slide." />
      <Flash error={error} />
      <BannerForm />
    </div>
  );
}
