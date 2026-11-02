import { absoluteUrl, getSiteUrl } from "@/lib/brand";

// IndexNow tells Bing (and through it ChatGPT search, DuckDuckGo, Yandex) that a URL changed. Google does not use it.
// Switched off until INDEXNOW_KEY is set and the site URL is a real host, so local work and previews never ping anyone.
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 100;

export function indexNowKey() {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}

export function indexNowPayload(paths: ReadonlyArray<string>, key: string, siteUrl = getSiteUrl()) {
  const host = new URL(siteUrl).host;
  return {
    host,
    key,
    keyLocation: `${siteUrl}/indexnow-key.txt`,
    urlList: [...new Set(paths)].slice(0, MAX_URLS).map((path) => absoluteUrl(path))
  };
}

function isLocalHost(siteUrl: string) {
  const { hostname } = new URL(siteUrl);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost") || hostname.endsWith(".test");
}

// Fire and forget: a failed ping must never fail the admin action that published the page.
export function notifyIndexNow(paths: ReadonlyArray<string>) {
  const key = indexNowKey();
  if (!key || !paths.length || isLocalHost(getSiteUrl())) return;
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(paths, key)),
    signal: AbortSignal.timeout(5000)
  }).catch(() => undefined);
}
