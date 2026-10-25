# SarkariMatch Claude Code Handover

Copy/paste this opening prompt into Claude Code:

```text
You are taking over the SarkariMatch project in /Users/surabhia/Documents/Codex/2026-06-21/att.

Read AGENTS.md first and preserve production intent. This is not a prototype. Keep public pages server-rendered by default, do not use live AI for eligibility decisions, do not expose secrets, and run pnpm lint, pnpm typecheck, pnpm test, and pnpm build before shipping.

SarkariMatch is a mobile-first govt job and exam notification matching platform. The language should consistently say "Govt Job Notifications", "Exam Notifications", "notifications", "eligibility matching", and "official application links", not generic "roles/jobs" language.
```

## Project Location

- Workspace: `/Users/surabhia/Documents/Codex/2026-06-21/att`
- Current usable local URL: `http://localhost:3001`
- The app is a Next.js App Router project using React 19, Tailwind, lucide-react, Vitest, and Playwright.
- Package manager: `pnpm`

## Important Repo Instructions

From `AGENTS.md`:

- Preserve production intent: this is not a visual prototype.
- Keep public pages server-rendered by default.
- Do not use live AI for eligibility decisions.
- Do not expose service-role, Razorpay, email, or webhook secrets to clients.
- Add tables through SQL files in `db/migrations` (Render Postgres); authorization lives in application code, not RLS. (Supabase was replaced in Oct 2026.)
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before shipping a phase.

## Product Context

SarkariMatch helps candidates find government job and exam notifications they are actually eligible to apply for. The core promise is:

- Create a candidate profile once.
- Match it against post-level eligibility rules.
- Surface verified govt job and exam notifications.
- Send users to official application links.
- Avoid fake counters, fake urgency, and misleading government affiliation.

Brand language:

- Use "Govt Job Notifications" and "Exam Notifications".
- Avoid saying "roles" for listings.
- Listings are notifications, not offers or placements.
- Always include the disclaimer idea: SarkariMatch is independent and does not guarantee eligibility or selection.

## Current Navigation Model

The latest requested navigation redesign has been implemented:

- Desktop nav has no standalone `States` tab.
- `Govt Job Notifications` is now a hover dropdown with:
  - `Central Govt Job Notifications` -> `/jobs/central`
  - `State Govt Job Notifications` -> `/jobs/state`
  - popular state shortcuts
  - `View all latest notifications` -> `/jobs`
- `Qualifications` is a dropdown with qualification-wise links and a hub:
  - Hub: `/jobs/qualification`
  - Examples: `/jobs/qualification/10th-pass`, `/jobs/qualification/graduate`
- `Departments` is a dropdown with department-wise links and a hub:
  - Hub: `/jobs/department`
  - Examples: `/jobs/department/ssc`, `/jobs/department/upsc`
- `Pricing` remains a simple link.
- Mobile menu was updated with the same discovery journey.

Key files:

- `components/header.tsx`
- `components/header-nav.tsx`
- `app/menu/page.tsx`
- `components/footer.tsx`

## Main Public Routes

- `/` home page
- `/jobs` all latest notifications with discovery cards and filters
- `/jobs/central` central govt notifications only
- `/jobs/state` state selection hub
- `/jobs/state/[slug]` state-wise notifications
- `/jobs/qualification` qualification selection hub
- `/jobs/qualification/[slug]` qualification-wise notifications
- `/jobs/department` department selection hub
- `/jobs/department/[slug]` department-wise notifications
- `/jobs/[slug]` notification detail
- `/eligibility` 3-step eligibility flow
- `/eligibility/results` submitted profile and matched notifications
- `/login` password + OTP sign-in UI
- `/login/otp-sent` OTP verification UI
- `/signup` create account UI
- `/pricing` monthly/annual pricing with working query-param toggle
- `/checkout/founding` founding pass checkout status
- Legal/support routes: `/privacy`, `/terms`, `/refund-policy`, `/contact`, `/report-error`, `/editorial-policy`, `/corrections`, `/about`

## Data Model State

Current data is demo/static in:

- `lib/data/catalog.ts`

Important exports:

- `demoJobs`
- `states`
- `departments`
- `qualificationPages`
- `stateLabels`
- `departmentLabels`
- `qualificationLabels`

Current demo jobs:

- `Demo SSC Assistant Officer 2026`
  - state: `Central Government`
  - department: `SSC`
  - qualification: `Graduate`
- `Demo Railway Technician 2026`
  - state: `Karnataka`
  - department: `Railways`
  - qualification: `ITI`

Filtering was recently tightened so filtered pages no longer show every demo notification by default.

## Recent Implemented Work

Home page:

- Revised hero copy to focus on eligible govt job and exam notifications.
- Added/kept animated workflow preview that emphasizes:
  - Sign in
  - Build profile
  - See eligible notifications
  - Apply through official links
- Moved "Freshly added" section upward and added `View all latest notifications`.
- Proof cards now present:
  - Post-level eligibility rules
  - Official application links
  - Mobile-first matching flow
  - No fake offer counters
- Qualification cards updated:
  - `ITI`
  - `B.Tech/B.E`
  - `Post Graduates`

Listing pages:

- Job cards changed to multi-card grid instead of one full-width card per row.
- `/jobs` now has discovery cards:
  - Central Govt
  - State Govt
  - Qualifications
  - Departments
- `/jobs` filter form now includes:
  - search
  - state
  - qualification
  - department

Pricing:

- Founding offer changed to `₹49` for `3 months`.
- Annual toggle now works via `/pricing?billing=annual`.
- Checkout copy updated for founding pass.

Auth:

- `/login` now supports:
  - password login
  - OTP sign-in request
- `/login/otp-sent` added for OTP verification demo flow.
- `/signup` expanded with name, email, phone, password.

Eligibility:

- `/eligibility` is now a 3-step server-rendered flow:
  - Step 1: basic details
  - Step 2: location/preferences
  - Step 3: review profile
- `/eligibility/results` now shows submitted candidate profile summary plus matched notification cards.

Footer:

- Rebuilt into grouped footer sections:
  - Explore
  - Product
  - Legal
  - Support
- Includes Privacy, Terms, Refund Policy, Report Error, etc.

## Local Dev Notes

Port `3000` has repeatedly been unreliable because an older Node process was seen holding it. A clean fallback dev server was started on:

- `http://localhost:3001`

Command used:

```bash
PATH=/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec next dev -p 3001 -H 0.0.0.0
```

Normal commands:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

In this Codex environment, use the bundled runtime path when needed:

```bash
CI=true PATH=/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm lint
```

If `node_modules` is recreated and registry DNS fails, rerun:

```bash
CI=true PATH=/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
/Users/surabhia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm install
```

## Last Validation Run

After the navigation/user-journey changes:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Build showed 61 generated routes including the new hub pages.

## Known Caveats

- Data is still demo/static. Supabase-backed notification ingestion and RLS-backed data tables are not connected yet.
- Eligibility matching UI is functional as a server-rendered demo flow, but real rule storage/evaluation integration still needs production work.
- Auth forms are UI/demo flows. Real Supabase OTP/password auth is not wired yet.
- Checkout pages are status/demo pages. Razorpay production flow needs secret-safe server integration.
- `git status` in this workspace appears to be rooted far above this project and shows many unrelated/untracked home-directory paths. Be careful with git operations. Do not stage broad paths.
- The current app files may appear untracked depending on the git root; use precise file paths if staging.

## Suggested Next Priorities

1. Data foundation:
   - Add Supabase migrations for organisations, recruitments, posts/notifications, eligibility rules, application links, audit logs.
   - Enable RLS on exposed tables.
   - Keep service role only on server.

2. Real listing backend:
   - Replace `demoJobs` with server data access.
   - Preserve ISR/SSR behavior for public pages.
   - Add filters for central/state/qualification/department/search/deadline.

3. Eligibility engine integration:
   - Store post-level eligibility rules.
   - Evaluate candidate profile deterministically.
   - Do not call live AI for decisions.
   - Show rule-by-rule explanations for Pro entitlements.

4. Auth:
   - Wire Supabase OTP and password login.
   - Add session-aware header state.
   - Protect dashboard routes.

5. Payments:
   - Implement Razorpay server checkout/subscription flows.
   - Keep webhook secret server-only.
   - Preserve founding offer: `₹49` for `3 months`, no auto-renewal.

6. UX polish:
   - Verify the new mega menu on desktop and mobile.
   - Consider click-to-open menu behavior if hover is not enough.
   - Add empty-state content for states/departments with no demo notifications.
   - Continue mobile-first QA.

## Important Files To Read First

- `AGENTS.md`
- `app/page.tsx`
- `components/header-nav.tsx`
- `components/design-system.tsx`
- `lib/data/catalog.ts`
- `app/jobs/page.tsx`
- `app/jobs/central/page.tsx`
- `app/jobs/state/page.tsx`
- `app/jobs/qualification/page.tsx`
- `app/jobs/department/page.tsx`
- `app/eligibility/page.tsx`
- `app/eligibility/results/page.tsx`
- `app/pricing/page.tsx`
- `components/footer.tsx`

