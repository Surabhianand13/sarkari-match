# Launch checklist: Render only (free plan)

Soft launch: the exam and job matcher, blog and waitlist go live first; the paid series follows.

## What runs where

| Part | Where | Cost |
|---|---|---|
| Website (Next.js) | Render **Free** web service, Singapore | Free |
| Database (Postgres) | Render **Free** Postgres, Singapore | Free for 30 days, then paid (see below) |
| Sign-in emails | Resend (optional) | Free tier |
| AI Study Guide and assistant | Anthropic API (later) | Pay as you use |

## Two limits of the free plan you must plan for

1. **The free database expires 30 days after it is created.** Put a reminder on day 25. In the Render dashboard open `sarkarimatch-db` and upgrade it to a paid plan (the Basic plan is a few dollars a month); that keeps your data. If you let it expire you lose it.
2. **The free website sleeps after 15 minutes without visitors** and takes about a minute to wake, so the first visitor after a quiet spell waits. Options, cheapest first: accept it for the soft launch; add a free uptime monitor (for example UptimeRobot) that opens `https://<your-site>/api/ping` every 5 minutes; or move the web service to the Starter plan, which never sleeps.

Free web services also have no Shell and no pre-deploy command, so migrations run during the build and the first admin is created from your own computer.

## 1. Render
1. render.com > sign up with GitHub and allow access to the `sarkari-match` repo.
2. New + > **Blueprint** > pick the repo > **Deploy Blueprint**. It creates the web service `sarkarimatch-web` and the database `sarkarimatch-db`, both free, both in Singapore. No values are needed.
3. Wait 5 to 10 minutes. The build log should show "migrations up to date" and "Compiled successfully".
4. Open the service's address (`https://sarkarimatch-web.onrender.com`) and then `/api/health`: it should show `"database":"ok"`.

## 2. Create your admin and seed data (from your computer)
In the Render dashboard open `sarkarimatch-db` > **Connections** and copy the **External Database URL**. In the project folder (Node 24, `nvm use v24.11.1`), with that URL in place of `PASTE_URL`:
```bash
DATABASE_URL='PASTE_URL' pnpm db:seed
DATABASE_URL='PASTE_URL' pnpm db:create-admin
```
`db:seed` loads taxonomies and the starter blog articles (sample notifications are skipped). `db:create-admin` asks for your email and a password of at least 12 characters: this is your production admin login. (Migrations already ran during the build.)

## 3. Environment settings
Service > **Environment** > add, then save (saving redeploys):
- `NEXT_PUBLIC_SUPPORT_EMAIL`: a real inbox you read (for example your Gmail), shown on the contact and legal pages.
- `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_GRIEVANCE_OFFICER`.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (digits with country code), optional.
- `RESEND_API_KEY` and `EMAIL_FROM` for sign-in emails (see step 6).
- Leave `TEST_CHECKOUT_URL` and `ANTHROPIC_API_KEY` out until the paid series is ready.

## 4. Your domain (sarkarimatch.com)
1. Service > **Settings > Custom Domains** > add `sarkarimatch.com` and `www.sarkarimatch.com`. Render shows the DNS records it wants.
2. At the company where you bought the domain, add exactly those records (usually a `CNAME` for `www`, and an `A` or `ALIAS` record for the root).
3. Wait until Render shows both domains as verified. Render issues the HTTPS certificate itself and redirects `www` and the root to each other.

## 5. Search and monitoring
- Google Search Console: add the domain (verify with the DNS TXT record it gives you at your registrar) and submit `https://sarkarimatch.com/sitemap.xml`. Same in Bing Webmaster Tools.
- Uptime monitor on `https://sarkarimatch.com/api/health` (checks the database too).
- Before the database expires or you load a lot of data, take a backup (`pg_dump` with the External Database URL).

## 6. Sign-in emails (Resend, optional)
Create an account, verify `sarkarimatch.com` (it gives DNS records to add at your registrar), create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Sarkari Match <hello@sarkarimatch.com>`).

## 7. Content before people arrive (the matcher is the day-one product)
- Load 15 to 30 real, verified govt notifications (Admin > CSV import, or Admin > Posts). With none, `/jobs` is empty.
- Upload homepage banners (Admin > Homepage banners): 1800x600 desktop, 900x1200 mobile.
- Add real reviews and expert details in `lib/trust.ts` if you want those sections.

## 8. When the paid series is ready (not day one)
1. Upgrade the database to a paid plan with enough space (about 1,00,000 questions with solutions is roughly 300 to 400 MB) and consider the Starter web plan so the site never sleeps.
2. Load questions for all four SSC CGL sections (Admin > Question factory or `pnpm questions:import`), review and publish them. Build tests in Admin > Test builder (preview, create as drafts, publish in bulk). See `docs/offering.md`.
3. Admin > Exams and offers > SSC CGL: Guide on and price; Admin > Test series: create the series (₹999) with a free sample test, publish.
4. Build the payment page; set `TEST_CHECKOUT_URL` and give it `ACCESS_GRANT_SECRET`. Test in the provider's test mode end to end, including a payment below the quoted amount (must be refused).
5. Set `ANTHROPIC_API_KEY` (with a monthly spend limit in the Anthropic console) to turn on the AI Study Guide and the support assistant.
6. Set `NEXT_PUBLIC_HIDE_PLATFORM_STATS` to `false` only when the learner, question and test numbers shown are true, then redeploy.

## 9. Final checks
- Sign up, sign in, sign out, eligibility matcher, blog, waitlist form.
- Open the site on a phone. Check `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
- Read the Terms, Privacy and Refund pages once and confirm they match how you will operate (they are drafts, not legal advice).

## Optional later: Cloudflare and Neon
The repo also has a Cloudflare keep-alive worker and Turnstile support (`infra/cloudflare`), and the database layer works with Neon. They are not needed for Render-only hosting.
