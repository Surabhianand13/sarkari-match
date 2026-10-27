# Cloudflare setup files

- `keepalive/` keeps the free Render web service awake. Deploy with `npx wrangler login` then `npx wrangler deploy` inside that folder,
  or paste `worker.js` into Workers & Pages > Create > Worker and add a Cron Trigger of `*/10 * * * *` in the dashboard.
- Full step-by-step setup (DNS, SSL, cache rules, Turnstile, email) is in `docs/launch-checklist.md`.
