import { Field, SubmitButton, inputClass } from "@/components/admin/ui";
import { saveBanner } from "@/app/admin/banners/actions";
import { BANNER_SPECS, type Banner } from "@/lib/banners";

export function BannerForm({ banner }: { banner?: Banner }) {
  const editing = Boolean(banner);
  return (
    <form action={saveBanner} className="grid max-w-3xl gap-5 rounded-2xl border border-border bg-white p-5 shadow-soft">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field label="Title" hint="Used as the image description for screen readers and search engines.">
        <input name="title" required maxLength={120} defaultValue={banner?.title} className={inputClass} />
      </Field>
      <Field label="Link (optional)" hint="A page on this site such as /tests/ssc-cgl/ssc-cgl-tier-1-mock-test-series, or a full https:// address.">
        <input name="link_url" maxLength={500} defaultValue={banner?.linkUrl ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={`Desktop image (${BANNER_SPECS.desktop.ratio})`} hint={`${BANNER_SPECS.desktop.width} x ${BANNER_SPECS.desktop.height} px, PNG, JPG or WebP, up to 2 MB.${editing ? " Leave empty to keep the current image." : ""}`}>
          <input type="file" name="desktop" accept="image/png,image/jpeg,image/webp" required={!editing} className={inputClass} />
        </Field>
        <Field label={`Mobile image (${BANNER_SPECS.mobile.ratio})`} hint={`${BANNER_SPECS.mobile.width} x ${BANNER_SPECS.mobile.height} px, PNG, JPG or WebP, up to 2 MB.${editing ? " Leave empty to keep the current image." : ""}`}>
          <input type="file" name="mobile" accept="image/png,image/jpeg,image/webp" required={!editing} className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-black text-primary">
        <input type="checkbox" name="active" defaultChecked={banner?.active ?? true} className="size-4" /> Active (shown on the home page)
      </label>
      <div><SubmitButton>{editing ? "Save banner" : "Add banner"}</SubmitButton></div>
    </form>
  );
}
