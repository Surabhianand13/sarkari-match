# Offering and pricing

Everything is priced **per exam**. Set it in Admin > Exams and offers (Pass price is the price of the exam's test series, set in Admin > Test series).

## Products

| | Free | Exam Pass | AI Study Guide |
|---|---|---|---|
| Price | ₹0 | Per exam (SSC CGL: ₹999) | Per exam (SSC CGL: ₹1,999 a year) |
| Payment | | One-time, 12 months access | One-time, 12 months access, no auto-renewal |
| Includes | Free sample test for every exam, exam and job matcher with email alerts, 1 new practice session a day, results and progress | All mocks and sectional tests, solutions, analysis, unlimited adaptive practice, weekly 7-day study plan and progress insights | An AI tutor that knows the learner's results for that exam, deeper explanations, plan follow-up |
| Needs | Nothing | Nothing | A Pass for the **same exam**. Never sold standalone |

- **Second-exam discount:** a learner who already bought (paid, not a manual grant) a Pass for a different exam gets the discount on this exam's Pass. The percent is per exam, default 20%. Rounded to whole rupees.
- **Validity:** every grant ends after the exam's validity (default 365 days) unless an explicit end date is given.
- **Taxes:** there is no GST registration yet, so prices carry no tax. When turnover requires registration, decide with your accountant whether prices become tax-inclusive; the amount sent to the payment page comes from the same quote, so it changes in one place.

## Price bands (suggested, test them)

| Tier | Examples | Pass | Guide |
|---|---|---|---|
| Volume | SSC CHSL/MTS, clerk-level | ₹499-₹799 | ₹999-₹1,499 |
| Flagship | SSC CGL, IBPS PO, RRB NTPC | ₹999 | ₹1,999 |
| Premium | UPSC CSE, state PCS | ₹2,499-₹3,999 | ₹3,999-₹4,999 |

## Adding a new exam

1. Admin > Exams and offers > New exam.
2. Set its offer (validity, second-exam discount, Guide on/off and price, daily AI limits) and its exam pattern.
3. Create its test series in Admin > Test series, set the Pass price, add tests, publish.
4. Load questions (admin or `pnpm questions:import`).

The pricing page, series page, checkout, grant API and the AI Study Guide pick the exam up automatically.

## AI Study Guide cost control

- Fast model (default `claude-haiku-5-5`) for everyday chat; stronger model (default `claude-sonnet-5-5`) only when the learner taps "Explain deeper".
- Per exam, per learner, per day: default 30 fast messages and 2 deeper explanations. Change them per exam.
- Every turn records tokens in `ai_usage`, so real cost per learner can be reported.
- Provider and models are configuration: `AI_PROVIDER`, `GUIDE_MODEL_FAST`, `GUIDE_MODEL_DEEP`. `AI_PROVIDER=mock` gives canned replies in development.
- Rough cost per turn at today's prices: about ₹0.05 on the fast model and about ₹1 on the stronger one (3,500 tokens in, 400 out, ₹90 per dollar). Check current provider prices before changing models.

## Payment integration

Your payment page receives `?product=pass|guide&series=<slug>|exam=<slug>&amount=<paise>&ref=<signed>` from `TEST_CHECKOUT_URL`. After a successful payment, call `POST /api/internal/grant-access` with `Authorization: Bearer ACCESS_GRANT_SECRET` and `{ "paymentRef", "ref", "amountPaise" }`. The grant is refused if `amountPaise` is lower than the quoted amount in `ref`, and it is idempotent on `paymentRef`.
