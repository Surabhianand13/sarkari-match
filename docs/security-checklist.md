# Security Checklist

- [x] Session cookie is httpOnly, secure in production and SameSite=Lax; AUTH_SECRET and DATABASE_URL are server-only.
- [x] Route guards created for user and admin routes.
- [x] RLS enabled in migrations.
- [x] Razorpay signature verification helper created.
- [ ] Add webhook route with idempotency checks.
- [ ] Add rate limiting to auth, checkout and report routes.
- [ ] Add production CSP after integration URLs are known.
