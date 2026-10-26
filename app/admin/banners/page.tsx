import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, Flash } from "@/components/admin/ui";
import { deleteBanner, moveBanner, toggleBanner } from "@/app/admin/banners/actions";
import { BANNER_SPECS, getBanners } from "@/lib/banners";

export const metadata = { title: "Homepage banners" };

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const banners = await getBanners(false);
  const activeCount = banners.filter((banner) => banner.active).length;
  return (
    <div>
      <AdminHeader title="Homepage banners" description={`${banners.length} banners · ${activeCount} active`} action={{ href: "/admin/banners/new", label: "+ Add banner" }} />
      <Flash notice={notice} error={error} />
      <p className="mb-5 max-w-3xl text-sm text-muted">
        These banners appear in the home page carousel and change every 3 seconds. Upload a <b>{BANNER_SPECS.desktop.ratio} desktop</b> image ({BANNER_SPECS.desktop.width} x {BANNER_SPECS.desktop.height}) and a <b>{BANNER_SPECS.mobile.ratio} mobile</b> image ({BANNER_SPECS.mobile.width} x {BANNER_SPECS.mobile.height}) for each slide. Use the arrows to reorder. Only Active banners are shown to visitors. With no active banners the home page shows its text introduction.
      </p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {banners.map((banner, index) => (
          <article key={banner.id} className="overflow-hidden rounded-2xl border border-border bg-primary text-white shadow-soft">
            <div className="relative bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/banners/${banner.id}/desktop?v=${banner.version}`} alt={`${banner.title} (desktop)`} className="aspect-[3/1] w-full object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/banners/${banner.id}/mobile?v=${banner.version}`} alt={`${banner.title} (mobile)`} className="absolute bottom-0 right-0 h-3/4 w-auto rounded-tl-lg border-l-2 border-t-2 border-white/60 object-cover" />
              <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide">Desktop</span>
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide">Mobile</span>
            </div>
            <div className="p-4">
              <h2 className="font-black">{banner.title}</h2>
              <p className="mt-1 truncate text-xs text-white/70">{banner.linkUrl ?? "No link"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/admin/banners/${banner.id}` as Route} className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-primary">Edit</Link>
                <form action={deleteBanner}><input type="hidden" name="id" value={banner.id} /><button className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-black text-white">Delete</button></form>
                <form action={toggleBanner}><input type="hidden" name="id" value={banner.id} /><button className={`rounded-lg px-3 py-1.5 text-xs font-black ${banner.active ? "bg-emerald-500 text-white" : "bg-white/20 text-white"}`}>{banner.active ? "Active" : "Inactive"}</button></form>
                <span className="ml-auto flex items-center gap-1">
                  <form action={moveBanner}><input type="hidden" name="id" value={banner.id} /><input type="hidden" name="direction" value="up" /><button disabled={index === 0} aria-label="Move up" className="rounded bg-white/15 px-2 py-1 text-xs font-black disabled:opacity-30">▲</button></form>
                  <form action={moveBanner}><input type="hidden" name="id" value={banner.id} /><input type="hidden" name="direction" value="down" /><button disabled={index === banners.length - 1} aria-label="Move down" className="rounded bg-white/15 px-2 py-1 text-xs font-black disabled:opacity-30">▼</button></form>
                  <span className="pl-1 text-xs font-black text-white/60">#{index + 1}</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!banners.length && <p className="rounded-2xl bg-white p-6 text-sm font-semibold text-muted shadow-soft">No banners yet. Add your first one.</p>}
    </div>
  );
}
