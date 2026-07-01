# UI/UX Redesign Audit

Baseline screenshots were captured in `work/ui-audit-before`.

## Current Issues

- The interface reads as a default Tailwind scaffold with repeated white cards and little product-specific identity.
- Navy is overused for every primary action, while SarkariMatch green is not carrying the matching/success story.
- Homepage hero explains the product in text but does not visually show profile-to-job matching.
- Founding Offer contains visible development copy and feels like a system notice.
- Job cards have weak hierarchy and do not emphasize match state, urgency or official verification.
- Qualification, department and state grids are visually identical and easy to skim past.
- Eligibility onboarding is functional but does not feel supportive or aspirational.
- Match results do not create a strong value moment.
- Pricing does not separate the Founding Pass from regular recurring plans strongly enough.
- Dashboard, saved jobs and profile pages feel like placeholders rather than aspirant-facing surfaces.
- Motion is nearly absent. Existing transitions do not reinforce matching, verification or progress.

## Design Direction

Create a premium consumer product language for Indian government-job aspirants:

- Green and teal for matching, progress and primary CTAs.
- Navy for trust, page structure and high-contrast feature areas.
- Amber for deadline urgency.
- Indigo for “information needed” and secondary discovery states.
- Warm and cool background bands to avoid endless white sections.
- Product-specific visual metaphors: profile chips, matching lines, verified-source badges, deadline badges and match previews.

## Component Changes

- Add reusable `ButtonLink`, `SectionHeading`, `MatchStatusBadge`, `DeadlineBadge`, `VerificationBadge`.
- Add `FoundingOfferBanner` without development text or fake counters.
- Add `SearchCommandBar` with popular search chips and accessible static labels.
- Add `AnimatedHeroMatchPreview` to communicate Profile -> Matching Engine -> Eligible Jobs.
- Add `QualificationCard`, `HowItWorksTimeline`, `PricingCard`, `EmptyState`, and `ProfileCompletionCard`.
- Redesign `JobCard`, `Header`, `Footer`, and `MobileBottomNav` around the same tokens.

## Mobile Considerations

- Start all layouts at 320-390px, then enhance upward.
- Keep hero CTA, search and Founding Offer early on mobile.
- Use large touch targets, bottom-safe-area padding and sticky job actions that do not cover content.
- Avoid horizontal overflow and desktop table patterns.
- Use short badges/chips instead of large blocks on small screens.

## Animation Plan

- Use CSS transitions/keyframes only to avoid new heavy JavaScript dependencies.
- Ambient motion is limited to hero match cards, scanning line and small status chips.
- Hover/press motion is transform/opacity based.
- All motion is disabled or simplified under `prefers-reduced-motion`.

## Performance Risks

- Avoid network font fetching during build; use a tuned system stack with Manrope/Inter fallbacks.
- Avoid large raster backgrounds and repeated backdrop blurs.
- Keep public pages server-rendered.
- Keep animations transform/opacity based.

## Implementation Stages

1. Tokens, typography, surfaces, buttons, badges, header, footer.
2. Homepage hero, offer, search, qualification cards, job cards and sections.
3. Job listing/detail mobile refinement.
4. Eligibility onboarding and match results.
5. Pricing, auth, dashboard and empty states.
6. Screenshot review, tests, build and mobile checks.

## Screenshot Review Findings

After-redesign screenshots were captured in `work/ui-audit-after`.

- Homepage mobile: strong first-screen hierarchy, Founding Offer is concise, CTA and search are visible early, and the match-preview visual communicates the product concept below the fold.
- Job listing mobile: search, filter disclosure, count and first job card are clear; placeholder text truncates on narrow mobile but the search intent remains understandable.
- Job detail mobile: match, deadline and official-source badges are visible; sticky actions sit above bottom navigation and do not cover the primary summary.
- Pricing mobile: plan hierarchy is clear and Founding Pass is visually highlighted; the Founding card starts just below the initial viewport, which is acceptable because the offer is repeated on the homepage.
- Desktop homepage: hero and animated match preview create a more premium product story without relying on stock imagery or government motifs.
