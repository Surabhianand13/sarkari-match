// Cloudflare Worker (free plan) with two schedules:
//  - every 10 minutes: GET /api/ping keeps the free Render web service awake. It does not touch the database.
//  - once a day: GET /api/health runs a tiny query, so a free Supabase project sees activity and is not paused after a quiet week.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, event.cron === "0 6 * * *" ? "/api/health" : "/api/ping"));
  },
  // Visiting the worker URL in a browser runs the same checks, which helps while setting it up.
  async fetch(_request, env) {
    const results = [await run(env, "/api/ping"), await run(env, "/api/health")];
    return new Response(results.join("\n"), { headers: { "content-type": "text/plain" } });
  }
};

async function run(env, path) {
  const target = (env.TARGET_URL || "https://sarkarimatch.com").replace(/\/$/, "") + path;
  try {
    const response = await fetch(target, { headers: { "user-agent": "sarkarimatch-keepalive" }, cf: { cacheTtl: 0 } });
    return `${target} -> ${response.status}`;
  } catch (error) {
    return `${target} -> failed: ${error}`;
  }
}
