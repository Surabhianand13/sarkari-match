# Production Launch Checklist

- [ ] Replace demo listings with verified official job data.
- [ ] Create Render web service and Postgres from render.yaml, set AUTH_SECRET and NEXT_PUBLIC_SITE_URL.
- [ ] Create first admin.
- [ ] Configure Razorpay keys, plans and webhook.
- [ ] Verify Founding Pass reservation and webhook entitlement grant.
- [ ] Review legal, refund and privacy copy.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- [ ] Run mobile Lighthouse and fix major accessibility or layout failures.
- [ ] Connect Search Console and analytics.
