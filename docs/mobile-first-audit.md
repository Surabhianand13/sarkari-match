# Mobile-First Audit

SarkariMatch is designed primarily for Android mobile browsers from 320px upward. Desktop is a responsive enhancement.

## Homepage

- Current issues: original scaffold placed desktop CTA and trust cards too early for small screens.
- Changes made: Founding offer, heading, primary CTA and search now appear in the first mobile flow; typography and spacing start from mobile sizes.
- Remaining limitations: claim count still needs live payment data.

## Job Listing

- Changes made: compact mobile cards, large save action and no desktop table.
- Remaining limitations: filters are URL-based; full bottom-sheet filter UI is still pending.

## Job Detail

- Changes made: key facts appear first, sections collapse on mobile, sticky mobile Check Eligibility and Official Apply actions are present.
- Remaining limitations: sticky action should hide during payment/checkout flows when added.

## Eligibility Onboarding

- Changes made: progress indicator, large controls, native date picker and sticky bottom Continue action.
- Remaining limitations: true multi-step persistence and auto-save are pending.

## Match Results

- Changes made: prominent status label and expandable reasoning.
- Remaining limitations: full list of result cards will come after live matching persistence.

## Authentication

- Changes made: simple mobile forms with large controls.
- Remaining limitations: Supabase client actions are pending.

## Dashboard

- Changes made: mobile bottom navigation and compact summary cards.
- Remaining limitations: full saved, application, alerts and profile subroutes are pending.

## Admin Login

- Changes made: admin route is server-guarded and avoids desktop sidebar assumptions.
- Remaining limitations: emergency mobile CRUD forms are pending.

## Pricing

- Changes made: cards stack naturally on mobile and Founding Pass terms are explicit.
- Remaining limitations: mobile checkout initiation screen is pending.

## Founding Checkout

- Current status: payment helpers and reservation limits exist.
- Remaining limitations: checkout page, loading/success/failure states and webhook route are pending.

## Legal Pages

- Changes made: single-column readable pages.
- Remaining limitations: final legal copy requires review before launch.

## Checklist

- [x] 320px mobile layout considered for core pages.
- [x] Mobile bottom navigation added with five items.
- [x] Touch targets are at least approximately 44px for primary actions.
- [x] Job detail sticky actions do not cover content due to bottom padding.
- [ ] Mobile filter bottom sheet.
- [ ] Complete multi-step eligibility persistence.
- [ ] Mobile checkout flow.
- [ ] Lighthouse mobile audit.
