import { notFound } from "next/navigation";
import { AdminHeader, Flash } from "@/components/admin/ui";
import { BannerForm } from "@/components/admin/banner-form";
import { getBanner } from "@/lib/banners";

export const metadata = { title: "Edit banner" };

export default async function EditBannerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const banner = await getBanner(id);
  if (!banner) notFound();
  return (
    <div>
      <AdminHeader title="Edit banner" />
      <Flash error={error} />
      <BannerForm banner={banner} />
    </div>
  );
}
