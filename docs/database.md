# Database

Plain PostgreSQL (Render). Migrations live in `db/migrations`, seeds in `db/seed`.

- `0001_baseline.sql`: users and auth tables (`users`, `auth_otps`, `rate_limits`), taxonomies, organisations, recruitments, post-level job posts with `eligibility_rules` JSON, candidate profiles, qualifications, saved jobs, match results, plans, entitlements, payment events, Founding Pass reservations, audit logs, application tracking, notification preferences, referrals, reports, subscriptions, payment orders, import batches, profile groups, WhatsApp logs, extraction jobs, localisations and advanced reports.
- There is no row level security. Authorization is enforced in application code: every user-scoped query filters by the signed-in user id, and admin pages call `requireAdmin()` (role stored in `users.roles`).

Commands (`DATABASE_URL` required):

```bash
pnpm db:migrate        # applies new files in db/migrations, tracked in schema_migrations
pnpm db:seed           # taxonomies, states, departments and sample notifications (development only)
pnpm db:create-admin   # creates or promotes an admin user
```

Search uses a generated `tsvector` column on `job_posts` with a GIN index.
