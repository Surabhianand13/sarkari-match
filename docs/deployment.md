# Deployment

1. Create a Supabase project.
2. Apply migrations in `supabase/migrations`.
3. Seed taxonomies and plans.
4. Create the first admin in `admin_roles`.
5. Configure Supabase auth redirect URLs.
6. Create a Vercel project.
7. Add all variables from `.env.example`.
8. Configure `sarkarimatch.com`.
9. Configure Razorpay test mode keys and webhooks.
10. Run payment tests.
11. Import first verified jobs.
12. Connect Search Console and analytics.
13. Enable production payments only after webhook verification is confirmed.

Rollback: disable payments, unpublish affected posts, revert the Vercel deployment and restore database from Supabase backup when needed.
