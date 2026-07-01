export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">Report Incorrect Notification Information</h1>
      <form action="/report-error/thanks" className="mt-6 grid gap-4 rounded-lg border border-border bg-white p-5">
        <label className="grid gap-2 font-semibold text-primary">Issue type<select name="issue" className="rounded-md border border-border px-3 py-2 font-normal"><option>Wrong date</option><option>Wrong qualification</option><option>Broken official link</option><option>Incorrect age criteria</option><option>Duplicate notification</option><option>Suspicious information</option><option>Other</option></select></label>
        <label className="grid gap-2 font-semibold text-primary">Details<textarea name="details" className="min-h-32 rounded-md border border-border px-3 py-2 font-normal" /></label>
        <button className="rounded-md bg-primary px-5 py-3 font-semibold text-white">Submit report</button>
      </form>
    </div>
  );
}
