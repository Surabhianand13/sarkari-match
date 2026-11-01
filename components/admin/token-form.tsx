"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { createToken, type TokenState } from "@/app/admin/leads/actions";
import { Field, inputClass } from "@/components/admin/ui";

export function TokenForm() {
  const [state, action, pending] = useActionState<TokenState, FormData>(createToken, {});
  const [copied, setCopied] = useState(false);

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1"><Field label="Who or which browser is this for?"><input name="label" required minLength={2} maxLength={80} placeholder="Office laptop" className={inputClass} /></Field></div>
        <button disabled={pending} className="min-h-11 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green disabled:opacity-60">{pending ? "Creating..." : "Create token"}</button>
      </form>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-error">{state.error}</p>}
      {state.token && (
        <div role="status" className="rounded-xl bg-mint p-4">
          <p className="text-sm font-black text-success">Copy this token now. It is shown once and cannot be looked up again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary">{state.token}</code>
            <button type="button" onClick={() => copy(state.token!)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-black text-primary">
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
