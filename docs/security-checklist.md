# Security Checklist

- [x] Server-only Supabase service-role key documented and not used in client modules.
- [x] Route guards created for user and admin routes.
- [x] RLS enabled in migrations.
- [x] Razorpay signature verification helper created.
- [ ] Add webhook route with idempotency checks.
- [ ] Add rate limiting to auth, checkout and report routes.
- [ ] Add production CSP after integration URLs are known.
