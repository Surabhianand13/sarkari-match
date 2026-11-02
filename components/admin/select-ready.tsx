"use client";

// Ticks or clears every "ready" checkbox in the bulk form.
export function SelectReady({ formId }: { formId: string }) {
  const toggle = (checked: boolean) => document.querySelectorAll<HTMLInputElement>(`#${formId} input[name="ids"]`).forEach((box) => (box.checked = checked));
  return (
    <span className="flex gap-2 text-xs font-black">
      <button type="button" onClick={() => toggle(true)} className="rounded-full bg-white px-3 py-1.5 text-primary shadow-soft">Select all ready</button>
      <button type="button" onClick={() => toggle(false)} className="rounded-full bg-white px-3 py-1.5 text-muted shadow-soft">Clear</button>
    </span>
  );
}
