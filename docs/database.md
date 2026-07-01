# Database

Migrations live in `supabase/migrations`.

- `0001_initial_schema.sql`: core taxonomies, organisations, recruitments, post-level jobs, candidate profiles, qualifications, saved jobs, match results, plans, entitlements, payment events, Founding Pass reservations, admin roles and audit logs.
- `0002_rls_and_functions.sql`: RLS policies and `reserve_founding_pass`.
- `0003_p1_features.sql`: application tracking, notification preferences, email logs, referrals, reports, subscriptions, payment orders and import batches.
- `0004_p2_features.sql`: candidate profile groups, WhatsApp logs, extraction jobs, reviewed content localizations and advanced report storage.

Search uses a generated PostgreSQL `tsvector` column on `job_posts` with a GIN index. Later phases should expand the vector with organisation, department, qualification and state joins through a trigger or materialized search table.

Run:

```bash
supabase db push
supabase db execute --file supabase/seed/0001_taxonomies.sql
```
