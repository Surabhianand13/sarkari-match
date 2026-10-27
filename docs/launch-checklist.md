# Launch checklist: Render (website) + Supabase (database) + Cloudflare in front

Soft launch: the exam and job matcher, blog and waitlist go live first; the paid series follows.

## What runs where

| Part | Where | Cost |
|---|---|---|
| Website (Next.js) | Render **Free** web service, Singapore | Free |
| Database (Postgres) | A **new, separate Supabase project** for Sarkari Match (not Jaspal's), Singapore | Free plan |
| DNS, HTTPS, CDN cache, bot protection, keep-alive | **Cloudflare** | Free |
| Email (sign-in codes, support address) | Later, not set up yet | - |
| AI Study Guide and assistant | Anthropic API (later) | Pay as you use |

## Limits of the free plans you must plan for

1. **Supabase free: 500 MB of data, and a free project pauses after a week without activity** (the data is kept, but the site stops working until you restore it in the Supabase dashboard). The Cloudflare worker's daily database touch (step 5, rule 7) prevents this. Supabase's free plan also allows only 2 active projects: Jaspal's uses one. About 1,00,000 questions with solutions is roughly 300 to 400 MB, so upgrade the project to Pro (about $25 a month) before the bulk import.
2. **The free Render website sleeps after 15 minutes without visitors** and takes about a minute to wake. Cloudflare handles this two ways: its cache serves most pages without waking Render (step 5, rule 6), and the keep-alive worker pings the site every 10 minutes (rule 7). Render also gives 750 free instance hours a month for the whole workspace, so check that your other Render services are not free and always awake; if they are, put this one on the Starter plan.
3. **Supabase publishes tables over a public web API.** `pnpm db:migrate` automatically turns on row level security for every table and removes the API roles' access, so nothing is readable through that API. As an extra layer you can also turn the Data API off: Supabase project > Settings > API (or Data API) > disable. The app talks to the database directly and does not need it.

Free Render web services have no Shell and no pre-deploy command, so migrations run during the build and the first admin is created from your own computer.

## 1. Supabase (the database, about 10 minutes)
1. supabase.com > New project. Name `sarkarimatch`, region **Southeast Asia (Singapore)**, and set a strong database password (save it in your password manager).
2. Click **Connect** > **Session pooler** and copy the connection string (port **5432**). It looks like `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-...pooler.supabase.com:5432/postgres`. Replace `[YOUR-PASSWORD]` with your password. This is your `DATABASE_URL`. Use the Session pooler string (it works from Render); do not use the "Direct connection" one, and not the Transaction pooler (port 6543).

## 2. Create your admin and seed data (from your computer)
In the project folder (Node 24, `nvm use v24.11.1`), with that `DATABASE_URL` in place of `PASTE_URL`:
```bash
DATABASE_URL='PASTE_URL' pnpm db:migrate
DATABASE_URL='PASTE_URL' pnpm db:seed
DATABASE_URL='PASTE_URL' pnpm db:create-admin
```
`db:migrate` creates the tables and secures them. `db:seed` loads taxonomies and the starter blog articles (sample notifications are skipped). `db:create-admin` asks for your email and a password of at least 12 characters: this is your production admin login.

## 3. Render (the website)
Use **New + > Blueprint** and pick the repo (it fills everything), or the manual form with these values:
- Region **Singapore**, instance type **Free**, branch `main`.
- Build command: `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm db:migrate && pnpm build`. Start command: `pnpm run start`. Health check path: `/api/ping`.
- Environment: `NODE_VERSION` = `24`, `DATABASE_URL` = the Supabase Session pooler string, `NEXT_PUBLIC_SITE_URL` = `https://sarkarimatch.com`, `NEXT_PUBLIC_HIDE_PLATFORM_STATS` = `true`, `NEXT_PUBLIC_SUPPORT_EMAIL` = an inbox you read, and two different long random strings (`openssl rand -base64 48`) as `AUTH_SECRET` and `ACCESS_GRANT_SECRET` (a Blueprint generates these for you).
- After the deploy, open `https://<service>.onrender.com/api/health`: it should show `"database":"ok"`.
- Later in the Environment tab: `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_GRIEVANCE_OFFICER` (shown on the legal pages), and optionally `NEXT_PUBLIC_WHATSAPP_NUMBER`. Leave `TEST_CHECKOUT_URL` and `ANTHROPIC_API_KEY` out until the paid series is ready.
- Email is not set up, so set `NEXT_PUBLIC_SUPPORT_EMAIL` to an inbox you already read instead of the default `support@sarkarimatch.com`, which has no mailbox yet.

## 4. Add the domain to Render
Service > **Settings > Custom Domains** > add `sarkarimatch.com` and `www.sarkarimatch.com`. Render shows the DNS records it wants. Keep them for step 5.

## 5. Cloudflare
Do rule 1 and 2 as early as you can: changing nameservers can take from minutes to a few hours.
1. dash.cloudflare.com > **Add a domain** > `sarkarimatch.com` > **Free** plan.
2. At the company where you bought the domain, replace its nameservers with the two Cloudflare gives you. Wait until Cloudflare shows the site as **Active**.
3. **DNS > Records:** add the records Render showed in step 4 (usually `CNAME @` and `CNAME www` pointing to `sarkarimatch-web.onrender.com`; if Render asks for an `A` record for the root, add that instead). Set them to **DNS only** (grey cloud). When Render shows both domains verified with a certificate, switch both to **Proxied** (orange cloud).
4. **SSL/TLS > Overview:** mode **Full (strict)**. **Edge Certificates:** turn on **Always Use HTTPS**.
5. **Rules > Redirect Rules:** use the template **Redirect from WWW to Root**.
6. **Caching > Cache Rules > Create rule** ("Cache public pages"). Expression:
   `(http.host eq "sarkarimatch.com") and not starts_with(http.request.uri.path, "/api") and not starts_with(http.request.uri.path, "/admin") and not starts_with(http.request.uri.path, "/dashboard") and not starts_with(http.request.uri.path, "/login") and not starts_with(http.request.uri.path, "/signup") and not starts_with(http.request.uri.path, "/checkout") and not starts_with(http.request.uri.path, "/guide") and not starts_with(http.request.uri.path, "/practice/") and not starts_with(http.request.uri.path, "/tests/attempt")`
   Then: **Eligible for cache**; Edge TTL **Use cache-control header if present, bypass cache if not**; Browser TTL **Respect origin**. The site marks personal pages as never-cache and public pages as cacheable for 5 to 10 minutes, so most visitors are served by Cloudflare and never wake Render.
7. **Keep-alive worker:** Workers & Pages > Create > Worker, name `sarkarimatch-keepalive`, deploy, **Edit code**, paste `infra/cloudflare/keepalive/worker.js`, deploy. Settings > Variables: `TARGET_URL` = `https://sarkarimatch.com` (use the onrender.com address until the domain works). Settings > Triggers > Cron Triggers: add **two**: `*/10 * * * *` (keeps the web service awake) and `0 6 * * *` (a daily database touch, so a free Supabase project is not paused). Open the worker's address: it should show `/api/ping -> 200` and `/api/health -> 200`.
8. **Turnstile (free bot check):** Turnstile > Add widget > your domain > Managed. Copy the site key and secret key into Render's Environment tab as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` and save. It protects signup and the waitlist.
9. **Security > Settings:** Bot Fight Mode on. **Security > Bots:** set the AI crawlers and scrapers option to **allow**, so Google and AI search can read the site.
10. **Analytics & Logs > Web Analytics:** add the site and turn it on (free, no cookies).

Email (Cloudflare Email Routing, Resend) is left for later: see the last section.

## 6. Search and monitoring
- Google Search Console: add the domain (verify with the DNS TXT record it gives you, added in Cloudflare > DNS) and submit `https://sarkarimatch.com/sitemap.xml`. Same in Bing Webmaster Tools.
- Uptime monitor on `https://sarkarimatch.com/api/health` (checks the database too).
- Before you load a lot of data or make big changes, take a backup (`pg_dump` with your Supabase connection string). Free Supabase projects have no automatic backups.

## 7. Content before people arrive (the matcher is the day-one product)
- Load 15 to 30 real, verified govt notifications (Admin > CSV import, or Admin > Posts). With none, `/jobs` is empty.
- Upload homepage banners (Admin > Homepage banners): 1800x600 desktop, 900x1200 mobile.
- Add real reviews and expert details in `lib/trust.ts` if you want those sections.

## 8. When the paid series is ready (not day one)
1. Upgrade the Supabase project to Pro (the free plan is 500 MB, and about 1,00,000 questions with solutions is roughly 300 to 400 MB, with room needed for tests and attempts) and consider the Render Starter plan so the site never sleeps.
2. Load questions for all four SSC CGL sections (Admin > Question factory or `pnpm questions:import`), review and publish them. Build tests in Admin > Test builder (preview, create as drafts, publish in bulk). See `docs/offering.md`.
3. Admin > Exams and offers > SSC CGL: Guide on and price; Admin > Test series: create the series (₹999) with a free sample test, publish.
4. Build the payment page; set `TEST_CHECKOUT_URL` and give it `ACCESS_GRANT_SECRET`. Test in the provider's test mode end to end, including a payment below the quoted amount (must be refused).
5. Set `ANTHROPIC_API_KEY` (with a monthly spend limit in the Anthropic console) to turn on the AI Study Guide and the support assistant.
6. Set `NEXT_PUBLIC_HIDE_PLATFORM_STATS` to `false` only when the learner, question and test numbers shown are true, then redeploy.

## 9. Final checks
- Sign up, sign in, sign out, eligibility matcher, blog, waitlist form.
- Open the site on a phone. Check `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
- Read the Terms, Privacy and Refund pages once and confirm they match how you will operate (they are drafts, not legal advice).

## Later: email
Not set up yet, on purpose. Until it is, learners sign in with email and password only: the "Sign in with OTP" option is hidden automatically.
1. Cloudflare > Email > Email Routing: create `support@sarkarimatch.com` and forward it to your inbox (then set `NEXT_PUBLIC_SUPPORT_EMAIL` back to it).
2. Resend: create an account, verify `sarkarimatch.com` (add its DNS records in Cloudflare, set to DNS only), create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Sarkari Match <hello@sarkarimatch.com>`) in Render. The OTP option then appears by itself.
