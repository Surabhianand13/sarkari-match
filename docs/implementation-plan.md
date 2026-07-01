# Implementation Plan

## P0

- [x] Project setup with Next.js App Router, TypeScript, Tailwind, Vitest and Playwright config.
- [x] Supabase migrations for core job, profile, entitlement, payment and admin tables.
- [x] RLS baseline for public, user-owned and admin data.
- [x] Branded mobile-first homepage using the supplied SVG logo.
- [x] Public job listing, detail, qualification, state and department pages.
- [x] Eligibility profile shell and match results shell.
- [x] Deterministic matching engine with unit tests.
- [x] Central entitlement service.
- [x] Founding Pass reservation and Razorpay signature helpers.
- [x] SEO sitemap, robots and health endpoint.
- [x] Legal/disclaimer pages.
- [ ] Live Supabase Auth forms.
- [ ] Full admin CRUD forms for organisations, recruitments and posts.
- [ ] Razorpay Checkout UI and webhook route.
- [ ] Application tracker.

## P1

- [x] Application tracker schema, service rules and dashboard route.
- [x] Email provider abstraction with Resend support and development no-op.
- [x] Referral rules, code generation and dashboard route.
- [x] CSV import validation template and admin import route.
- [x] Admin reports summary service and route.
- [x] Candidate calendar event builder and route.
- [x] Compare jobs route and entitlement-backed feature key.
- [x] Regular subscription helpers and Razorpay webhook signature endpoint.
- [ ] Persist P1 form submissions through live Supabase server actions.
- [ ] Full Razorpay subscription checkout creation UI.

## P2

- [x] Pro Plus feature-flagged pricing and entitlement surfaces.
- [x] Multiple candidate profile limits and family dashboard route.
- [x] WhatsApp provider interface and delivery log schema.
- [x] Advanced eligibility report service and route.
- [x] Admin advanced reporting route.
- [x] Human-reviewed extraction assistance schema, service and admin route.
- [x] Multilingual locale helpers, preference schema and language route.
- [ ] Connect WhatsApp to a production provider.
- [ ] Add reviewed translations for public SEO pages.
- [ ] Add real PDF extraction pipeline behind admin review.
