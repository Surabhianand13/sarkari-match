# P1 Implementation

P1 adds production-shaped foundations for:

- Application tracker
- Email alerts
- Referral system
- CSV import
- Admin reports
- Calendar
- Compare jobs
- Regular Pro subscriptions

The current implementation intentionally avoids silently mocking production behavior. When Supabase service-role access, Resend and Razorpay are not configured, UI surfaces explain the configured capability and service modules return safe development behavior.

## External Configuration

- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` for email.
- `RAZORPAY_PLAN_PRO_MONTHLY`, `RAZORPAY_PLAN_PRO_ANNUAL`, `RAZORPAY_PLAN_PRO_PLUS_MONTHLY`, `RAZORPAY_PLAN_PRO_PLUS_ANNUAL` for subscriptions.
- `RAZORPAY_WEBHOOK_SECRET` for webhook verification.

## Manual Work Before Launch

- Connect dashboard forms to Supabase server actions.
- Store webhook events idempotently in `payment_events`.
- Grant subscription entitlements from verified webhooks.
- Add admin import dry-run confirmation and batch persistence.
- Add email scheduling jobs guarded by `CRON_SECRET`.
