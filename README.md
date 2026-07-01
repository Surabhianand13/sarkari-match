# SarkariMatch

SarkariMatch is a Next.js App Router application for matching candidates with government job posts based on deterministic, published eligibility rules.

## P0 Scope

- Branded public homepage, job listing, job detail, taxonomy pages, pricing, legal pages, auth shells, dashboard, admin shell.
- Supabase schema and RLS migration for P0 tables.
- Rule-based matching engine with structured explanations.
- Central entitlement and Founding Pass reservation/payment abstractions.
- SEO routes, health endpoint, analytics adapter, and deployment documentation.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Run validation:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

External integrations are production-shaped but require Supabase and Razorpay credentials before real auth, persistence, or payments can be enabled.
