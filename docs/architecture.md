# Architecture

SarkariMatch uses Next.js App Router with React Server Components by default. Public SEO routes render from database-backed job and taxonomy data, with local demo data only for development scaffolding.

Core modules:

- `lib/matching`: deterministic eligibility engine.
- `lib/entitlements`: central feature and limit checks.
- `lib/payments`: Razorpay-facing helpers and Founding Pass reservation rules.
- `lib/applications`, `lib/calendar`, `lib/email`, `lib/referrals`, `lib/import`, `lib/reports`: P1 domain services for tracking, alerts, referrals, CSV import and admin reporting.
- `lib/profiles`, `lib/whatsapp`, `lib/extraction`, `lib/i18n`, `lib/reports/advanced`: P2 services for Pro Plus profile limits, WhatsApp adapters, reviewed extraction assistance, localization and advanced reports.
- `lib/supabase`: server-side Supabase client setup.
- `lib/auth`: server-side route guards.
- `lib/analytics`: privacy-safe event abstraction.

Private routes use server-side guards. Admin authorization must come from secure app metadata or the protected `admin_roles` table, never user-editable profile fields.
