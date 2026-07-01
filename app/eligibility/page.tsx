import { MapPinned, ShieldCheck, Sparkles, UserRound } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

export default async function EligibilityPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const step = Math.min(Math.max(Number(value(params, "step")) || 1, 1), 3);

  return (
    <div className="bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 pb-28 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
          <Sparkles className="text-[#B9F8CD]" size={30} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black tracking-tight">Let’s find the right notifications for you.</h1>
          <p className="mt-3 leading-7 text-white/75">Build a candidate profile once. SarkariMatch checks it against post-level govt job and exam notification rules.</p>
          <div className="mt-6 rounded-2xl bg-white/12 p-4">
            <p className="text-sm font-black">Your privacy matters</p>
            <p className="mt-1 text-sm leading-6 text-white/70">We use these details only for eligibility matching and do not publish private profile data.</p>
          </div>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-white/75">
            {["Step 1: Basic details", "Step 2: Location and preferences", "Step 3: Review profile"].map((item, index) => (
              <div key={item} className={`rounded-2xl px-4 py-3 ${step === index + 1 ? "bg-white text-primary" : "bg-white/10"}`}>{item}</div>
            ))}
          </div>
        </aside>
        <section className="rounded-[2rem] bg-white p-5 shadow-lift sm:p-7">
          <div className="h-3 rounded-full bg-border" aria-label={`Step ${step} of 3`}>
            <div className="h-3 rounded-full bg-[linear-gradient(90deg,#18B943,#32D66B)]" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          {step === 1 && <BasicDetailsStep params={params} />}
          {step === 2 && <PreferenceStep params={params} />}
          {step === 3 && <ReviewStep params={params} />}
        </section>
      </div>
    </div>
  );
}

function BasicDetailsStep({ params }: { params: Record<string, string | string[] | undefined> }) {
  return (
    <>
      <p className="mt-3 text-sm font-black text-success">Step 1 of 3: Basic details</p>
      <h2 className="mt-2 text-2xl font-black text-primary">Tell us the basics</h2>
      <form action="/eligibility" className="mt-6 grid gap-5">
        <input type="hidden" name="step" value="2" />
        <Field label="Date of birth"><input type="date" name="dateOfBirth" defaultValue={value(params, "dateOfBirth")} className="form-input" /></Field>
        <Field label="Category">
          <select name="category" defaultValue={value(params, "category") || "General"} className="form-input">
            {["General", "EWS", "OBC", "SC", "ST", "Other/Not specified"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Highest qualification"><input name="qualification" defaultValue={value(params, "qualification")} placeholder="Graduate, B.Tech/B.E, ITI..." className="form-input" /></Field>
        <PrivacyNote />
        <StickyAction label="Continue" />
      </form>
    </>
  );
}

function PreferenceStep({ params }: { params: Record<string, string | string[] | undefined> }) {
  return (
    <>
      <p className="mt-3 text-sm font-black text-success">Step 2 of 3: Location and preferences</p>
      <h2 className="mt-2 text-2xl font-black text-primary">Add matching preferences</h2>
      <form action="/eligibility" className="mt-6 grid gap-5">
        <input type="hidden" name="step" value="3" />
        <Hidden name="dateOfBirth" params={params} />
        <Hidden name="category" params={params} />
        <Hidden name="qualification" params={params} />
        <Field label="Domicile / preferred state"><input name="state" defaultValue={value(params, "state") || "Karnataka"} className="form-input" /></Field>
        <Field label="Preferred department or exam"><input name="department" defaultValue={value(params, "department")} placeholder="SSC, UPSC, Railways, Banking..." className="form-input" /></Field>
        <Field label="Experience"><select name="experience" defaultValue={value(params, "experience") || "Fresher"} className="form-input">{["Fresher", "1-3 years", "3+ years"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <div className="rounded-2xl bg-indigo-soft p-4 text-sm font-bold leading-6 text-indigo">
          <MapPinned className="mb-2" size={19} aria-hidden="true" />
          Location is used to surface state-wise notifications and domicile rules where they apply.
        </div>
        <StickyAction label="Review profile" />
      </form>
    </>
  );
}

function ReviewStep({ params }: { params: Record<string, string | string[] | undefined> }) {
  const rows = [
    ["Date of birth", value(params, "dateOfBirth") || "Not provided"],
    ["Category", value(params, "category") || "General"],
    ["Qualification", value(params, "qualification") || "Not provided"],
    ["State", value(params, "state") || "Karnataka"],
    ["Department", value(params, "department") || "Any"],
    ["Experience", value(params, "experience") || "Fresher"]
  ];
  return (
    <>
      <p className="mt-3 text-sm font-black text-success">Step 3 of 3: Review profile</p>
      <h2 className="mt-2 text-2xl font-black text-primary">Submit your match profile</h2>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {rows.map(([label, item]) => (
          <div key={label} className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-black text-primary">{item}</p>
          </div>
        ))}
      </div>
      <form action="/eligibility/results" className="mt-6 grid gap-5">
        {["dateOfBirth", "category", "qualification", "state", "department", "experience"].map((name) => <Hidden key={name} name={name} params={params} />)}
        <div className="rounded-2xl bg-mint p-4 text-sm font-bold text-success">
          <UserRound className="mb-2" size={19} aria-hidden="true" />
          Your profile will be checked against age, education, category, domicile and preference rules.
        </div>
        <StickyAction label="View Matches" />
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 font-bold text-primary">{label}{children}</label>;
}

function Hidden({ name, params }: { name: string; params: Record<string, string | string[] | undefined> }) {
  return <input type="hidden" name={name} value={value(params, name)} />;
}

function PrivacyNote() {
  return (
    <div className="rounded-2xl bg-mint p-4 text-sm font-bold text-success">
      <ShieldCheck className="mb-2" size={19} aria-hidden="true" />
      Phone number is not required before you see basic matching value.
    </div>
  );
}

function StickyAction({ label }: { label: string }) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-white/70 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_34px_rgba(11,45,99,0.12)] md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      <button className="min-h-12 w-full rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 font-black text-white shadow-green">{label}</button>
    </div>
  );
}
