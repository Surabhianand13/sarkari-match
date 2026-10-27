# Cloudflare setup files

- `keepalive/` keeps the free Render web service awake. Deploy with `npx wrangler login` then `npx wrangler deploy` inside that folder,
  or paste `worker.js` into Workers & Pages > Create > Worker and add two Cron Triggers in the dashboard: `*/10 * * * *` (keeps the web service awake) and `0 6 * * *` (a daily database touch so a free Supabase project is not paused).
- Full step-by-step setup (DNS, SSL, cache rules, Turnstile, email) is in `docs/launch-checklist.md`.
