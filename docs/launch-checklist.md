# Launch checklist: free-tier setup (Render free + Neon free + Cloudflare)

Soft launch: the exam and job matcher, blog and waitlist go live first; the paid series follows.

## What runs where

| Part | Where | Cost |
|---|---|---|
| Website (Next.js) | Render **Free** web service, Singapore | Free |
| Database (Postgres) | **Neon** free (0.5 GB, scales to zero) | Free |
| DNS, HTTPS, CDN cache, bot protection, email forwarding, keep-alive | **Cloudflare** | Free |
| Sign-in emails | Resend | Free tier |
| AI Study Guide and assistant | Anthropic API | Pay as you use |

**Why Neon and not Render's free database:** a free Render database expires after 30 days. A free Render web service also goes to sleep after 15 minutes without traffic and takes about a minute to wake. Two parts of the setup below deal with that: the Cloudflare cache and the Cloudflare keep-alive worker.

**Limits to know:** Render free gives 750 instance hours a month (one always-awake service uses about 744). Neon free gives 0.5 GB of storage, so move to a paid plan before loading lakhs of questions. Free Render services have no Shell and no pre-deploy command, so migrations run during the build and the first admin and seed data are created from your own computer (step 3).

## 1. GitHub
Repo: `Surabhianand13/sarkari-match`, deploy branch `main`.

## 2. Neon (database)
1. neon.com > sign up > Create project (region Singapore, `ap-southeast-1`, or the closest).
2. Dashboard > Connect: copy the **direct** connection string (it ends with `sslmode=require`). Keep it private.

## 3. Create your admin and seed data (from your computer)
In the project folder (Node 24), with the Neon string in place of `postgres://...`:
```bash
DATABASE_URL='postgres://...' pnpm db:migrate
DATABASE_URL='postgres://...' pnpm db:seed
DATABASE_URL='postgres://...' pnpm db:create-admin
```
`db:seed` loads taxonomies and the starter blog articles (sample notifications are skipped). `db:create-admin` asks for your email and password.

## 4. Render (website)
1. render.com > New > **Blueprint** > pick the repo. It creates `sarkarimatch-web` on the Free plan.
2. Paste the Neon string as `DATABASE_URL`. Fill the business details (`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_GRIEVANCE_OFFICER`) and `RESEND_API_KEY` / `EMAIL_FROM`. Leave `TEST_CHECKOUT_URL` and `ANTHROPIC_API_KEY` empty until the paid series is ready.
3. After the deploy, open `https://<service>.onrender.com/api/health`: it should show `"database":"ok"`.
4. Settings > Custom Domains: add `sarkarimatch.com` and `www.sarkarimatch.com`.
5. If the free build runs out of memory, tell me: the fix is a lighter build or the Starter plan.

## 5. Cloudflare
1. **Add the site** `sarkarimatch.com` (change the nameservers at your registrar if it is registered elsewhere).
2. **DNS:** `CNAME @ -> <service>.onrender.com` and `CNAME www -> <service>.onrender.com`. After Render verifies the domain and issues its certificate, turn the proxy (orange cloud) on.
3. **SSL/TLS:** mode **Full (strict)**; turn on **Always Use HTTPS**.
4. **Redirect Rule:** `www.sarkarimatch.com` to `https://sarkarimatch.com` (permanent).
5. **Cache Rule (this is what makes the free site fast):** Caching > Cache Rules > Create rule.
   - If: hostname equals `sarkarimatch.com` and the path does **not** start with `/api`, `/admin`, `/dashboard`, `/login`, `/signup`, `/checkout`, `/guide`, `/practice/`, `/tests/attempt`.
   - Then: **Eligible for cache**, Edge TTL: **Use cache-control header if present**, Browser TTL: respect origin.
   - The site marks personal pages as not cacheable and public pages as cacheable for 5 to 10 minutes, so most visitors are served from Cloudflare and never wake Render.
6. **Keep-alive worker:** Workers & Pages > Create > Worker. Paste `infra/cloudflare/keepalive/worker.js`, set the variable `TARGET_URL` to `https://sarkarimatch.com` (or the onrender.com address until the domain is connected), and add a Cron Trigger `*/10 * * * *`. Visit the worker's URL once to check it answers `.../api/ping -> 200`.
7. **Turnstile (free bot check):** Turnstile > Add site > your domain > Managed. Put the **site key** in Render as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **secret key** as `TURNSTILE_SECRET_KEY`, then redeploy. It protects signup and the waitlist. Leave both empty to switch it off.
8. **Security:** Bot Fight Mode on. **Turn off "Block AI bots" / AI crawl control** so Google, Bing, ChatGPT, Claude and Perplexity can read the site.
9. **Email Routing:** create `support@sarkarimatch.com` and forward it to your inbox (the site shows this address).
10. **Web Analytics (free, no cookies):** Analytics > Web Analytics > enable for the site.
11. **Resend DNS:** add the SPF and DKIM records Resend gives you here so sign-in emails are delivered.

## 6. Email sending (Resend)
Create an account, verify `sarkarimatch.com`, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Sarkari Match <hello@sarkarimatch.com>`) in Render.

## 7. Search and monitoring
- Google Search Console: add the domain (verify with a DNS TXT record in Cloudflare) and submit `https://sarkarimatch.com/sitemap.xml`. Do the same in Bing Webmaster Tools.
- Uptime monitor (for example UptimeRobot, free) on `https://sarkarimatch.com/api/health`. Use `/api/health` here, not for the keep-alive: it checks the database too.
- Neon free keeps only a short restore window. Take a manual backup (`pg_dump`) before big changes.

## 8. Content before people arrive
- Load 15 to 30 real, verified govt notifications (Admin > CSV import, or Admin > Posts). With none, `/jobs` is empty.
- Upload homepage banners (Admin > Homepage banners): 1800x600 desktop, 900x1200 mobile.
- Add real reviews and expert details in `lib/trust.ts` if you want those sections.

## 9. When the paid series is ready (not day one)
1. Load questions for all four SSC CGL sections (Admin > Question factory or `pnpm questions:import`), review and publish them.
2. Admin > Exams and offers > SSC CGL: Guide on and price; Admin > Test series: create the series (₹999) with a free sample test, publish.
3. Build the payment page; set `TEST_CHECKOUT_URL` and give it `ACCESS_GRANT_SECRET`. Test in the provider's test mode end to end, including a payment below the quoted amount (must be refused).
4. Set `ANTHROPIC_API_KEY` (with a monthly spend limit in the Anthropic console) to turn on the AI Study Guide and the support assistant.
5. Set `NEXT_PUBLIC_HIDE_PLATFORM_STATS` to `false` only when the learner, question and test numbers shown are true, then redeploy.
6. Move the database to a paid plan before loading lakhs of questions, and consider the Render Starter plan so the site never sleeps.

## 10. Final checks
- Sign up, sign in, sign out, eligibility matcher, blog, waitlist form.
- Open the site on a phone. Check `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
- Read the Terms, Privacy and Refund pages once and confirm they match how you will operate (they are drafts, not legal advice).
