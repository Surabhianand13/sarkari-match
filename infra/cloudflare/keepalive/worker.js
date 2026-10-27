// Cloudflare Worker (free plan). Every 10 minutes it asks the site for /api/ping so the free Render web service
// (which sleeps after 15 minutes without traffic) stays awake. /api/ping does not touch the database, so the
// free database can still sleep when nobody is using the site.
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // Visiting the worker URL in a browser runs the same check, which helps while setting it up.
  async fetch(_request, env) {
    return new Response(await ping(env), { headers: { "content-type": "text/plain" } });
  }
};

async function ping(env) {
  const target = (env.TARGET_URL || "https://sarkarimatch.com").replace(/\/$/, "") + "/api/ping";
  try {
    const response = await fetch(target, { headers: { "user-agent": "sarkarimatch-keepalive" }, cf: { cacheTtl: 0 } });
    return `${target} -> ${response.status}`;
  } catch (error) {
    return `${target} -> failed: ${error}`;
  }
}
