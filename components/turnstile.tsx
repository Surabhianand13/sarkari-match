"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; theme?: string }) => string; remove: (id: string) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Cloudflare Turnstile widget. Renders nothing when no site key is configured.
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let widget: string | undefined;
    const mount = () => {
      if (!box.current || !window.turnstile || widget) return;
      widget = window.turnstile.render(box.current, { sitekey: SITE_KEY, callback: onToken, "expired-callback": () => onToken(""), theme: "light" });
    };
    if (window.turnstile) mount();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" />;
}

export const turnstileConfigured = Boolean(SITE_KEY);
