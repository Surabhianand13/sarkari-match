# Launch checklist: Render (website + database) with Cloudflare in front

Soft launch: the exam and job matcher, blog and waitlist go live first; the paid series follows.

## What runs where

| Part | Where | Cost |
|---|---|---|
| Website (Next.js) | Render **Free** web service, Singapore | Free |
| Database (Postgres) | Render **Free** Postgres, Singapore | Free for 30 days, then paid (see below) |
| DNS, HTTPS, cache, bot protection, email forwarding, keep-alive | **Cloudflare** | Free |
| Sign-in emails | Resend (optional) | Free tier |
| AI Study Guide and assistant | Anthropic API (later) | Pay as you use |

## Two limits of the free plan you must plan for

1. **The free database expires 30 days after it is created.** Put a reminder on day 25. In the Render dashboard open `sarkarimatch-db` and upgrade it to a paid plan (the Basic plan is a few dollars a month); that keeps your data. If you let it expire you lose it.
2. **The free website sleeps after 15 minutes without visitors** and takes about a minute to wake. Cloudflare handles this two ways: its cache serves most pages without waking Render (step 5, rule 6), and a free keep-alive worker pings the site every 10 minutes (step 5, rule 7). If you want it never to sleep, move the web service to the Starter plan.

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
- `NEXT_PUBLIC_SUPPORT_EMAIL`: leave the default `support@sarkarimatch.com` once Cloudflare Email Routing (step 5, rule 10) forwards it to your inbox; until then set it to an inbox you read.
- `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_GRIEVANCE_OFFICER`.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (digits with country code), optional.
- `RESEND_API_KEY` and `EMAIL_FROM` for sign-in emails (see step 6).
- Leave `TEST_CHECKOUT_URL` and `ANTHROPIC_API_KEY` out until the paid series is ready.

## 4. Add the domain to Render
1. Service > **Settings > Custom Domains** > add `sarkarimatch.com` and `www.sarkarimatch.com`. Render shows the DNS records it wants. Keep them for step 5.

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
7. **Keep-alive worker:** Workers & Pages > Create > Worker, name `sarkarimatch-keepalive`, deploy, **Edit code**, paste `infra/cloudflare/keepalive/worker.js`, deploy. Settings > Variables: `TARGET_URL` = `https://sarkarimatch.com` (use the onrender.com address until the domain works). Settings > Triggers > Cron Triggers: `*/10 * * * *`. Open the worker's address: it should say `.../api/ping -> 200`.
8. **Turnstile (free bot check):** Turnstile > Add widget > your domain > Managed. Copy the site key and secret key into Render's Environment tab as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` and save. It protects signup and the waitlist.
9. **Security > Settings:** Bot Fight Mode on. **Security > Bots:** set the AI crawlers and scrapers option to **allow**, so Google and AI search can read the site.
10. **Email > Email Routing:** create `support@sarkarimatch.com` and forward it to your own inbox. Click the verification email. (The site already shows this address.)
11. **Analytics & Logs > Web Analytics:** add the site and turn it on (free, no cookies).

## 5. Search and monitoring
- Google Search Console: add the domain (verify with the DNS TXT record it gives you, added in Cloudflare > DNS) and submit `https://sarkarimatch.com/sitemap.xml`. Same in Bing Webmaster Tools.
- Uptime monitor on `https://sarkarimatch.com/api/health` (checks the database too).
- Before the database expires or you load a lot of data, take a backup (`pg_dump` with the External Database URL).

## 6. Sign-in emails (Resend, optional)
Create an account, verify `sarkarimatch.com` (it gives DNS records: add them in Cloudflare > DNS, set to DNS only), create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Sarkari Match <hello@sarkarimatch.com>`).

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

## Optional later
If you want a database that never expires without paying Render, the database layer also works with a free Neon Postgres: set `DATABASE_URL` in Render to the Neon address and remove the database from `render.yaml`. Not needed for this plan.
