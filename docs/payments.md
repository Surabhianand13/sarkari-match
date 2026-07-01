# Payments

Founding Pass uses Razorpay Orders and an atomic reservation flow.

- Limit: first 1,000 successful purchasers, with active unexpired reservations counted for availability.
- Reservation expiry: 15 minutes.
- Price: ₹99 one-time.
- Entitlement: 3 years of Pro from successful payment.
- No automatic renewal.

The client success callback is never authoritative. Server signature verification and webhook processing must grant access. Webhook event IDs are stored in `payment_events` to prevent replay.

Regular Pro subscriptions are deferred from this P0 foundation and should use Razorpay Subscriptions.

## P1 Regular Subscriptions

P1 adds subscription plan mapping and webhook signature verification for Razorpay subscription events. Entitlements must still be granted only from server-side webhook processing, never from the client success callback.
