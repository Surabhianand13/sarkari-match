# Admin guide

Sign in with an account that has the admin role (`pnpm db:create-admin`), then open `/admin`. All admin pages are private (`noindex`) and every change is written to the audit log.

## Notifications

1. **Organisations**: create the recruiting body first (type, department, state, website).
2. **Recruitments**: create a recruitment under an organisation and move it draft, needs review, reviewed, published. Publishing requires the official notification link, the official application link, a last date and verification notes. Publishing stamps who verified it and when.
3. **Posts**: add one post per notification page. Eligibility rules are JSON checked by the matching engine; the editor validates them and each rule needs `ruleText`, which candidates see. A post is public only when the post is published and its recruitment is published.
4. **CSV import**: bulk-create draft notifications. Tick "Check only" first. Imported rows are never published automatically.

Public pages, the sitemap and `llms.txt` refresh immediately after a change.

### Competitor leads

Notifications that other sites (for example FreeJobAlert and Adda247) have already published, collected with the browser extension and approved by a person before they go live. Nothing collected is ever public.

1. **Connect the extension** (Competitor leads, then the button at the top): install the `extension` folder in Chrome, make a token, paste it and the dashboard address into the extension settings. Tokens can only add leads; revoke one if a laptop is lost.
2. On a notification page of a competitor, click the extension and **Analyse this page**. On a home or listing page, **Collect headlines** adds each new recruitment as a "Headline only" lead to be analysed later.
3. **One notification, one lead.** The same notification found on two sites is joined into a single lead (same official notification link, same notification number, or a near-identical title), and anything already approved or rejected is never reopened. Where the sites disagree, for example on the last date, the review screen says so.
4. **Review** each lead: the fields are filled in from the pages (including the salary and a qualification written per post) and can all be edited. When a notification gives one vacancy total and no split by post, leave the post counts empty: the site shows the total with a `*` and a note that it is combined. Write the qualification as the notification does: `Any graduate` for every degree (B.E/B.Tech holders included), `B.E/B.Tech` only when the post needs that degree. Use the official notification, not the competitor's page, to settle every field. The links must be the organisation's own.
5. **Approve and publish** needs the official notification link, the official application link, a last date (a past one is fine: older notifications are kept as an archive and show as closed), at least one post, a note of what you checked, and the tick box. It creates the organisation (if new), the recruitment and its posts and puts them live. **Create a draft recruitment** hands the lead to the normal Recruitments workflow instead. **Reject** and **Duplicate** close the lead.

Only recruitments can be published. Admit cards, results and answer keys are recognised and can only be closed. Posts get a qualification rule from the qualification text; add age rules under Posts afterwards. The text captured from competitor pages is kept for checking only: do not copy it onto the site.

## Mock tests

1. **Question factory**: create a batch. Templates compute exact answers for Quantitative Aptitude with no AI cost. AI batches need a provider key (`ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` + `OPENAI_MODEL`, or `GEMINI_API_KEY` + `GEMINI_MODEL`); pick a different provider as the checker than the writer. From a terminal: `pnpm factory --subject "Quantitative Aptitude" --count 200 --strategy template`, and `pnpm factory:benchmark --models anthropic,openai --count 100` to compare models with a blind review sheet.
2. **Question review**: AI output never publishes itself. Approve in bulk or one by one, then publish. Editing an approved or published question sends it back to review. General Awareness and Computer questions always need a human fact check.
3. **Test series**: add an exam, a series (price in rupees, optional MRP), then tests with duration and marking. Attach approved questions, put them into sections, publish the test, then publish the series. A test can only publish when all its questions are published in the bank.

## Business

Payments, subscriptions and test access are read-only views. Error reports from candidates can be resolved under Reports.

### One-click sync and the 6-month backfill

In the extension popup, **Check for new and updated notifications** reads FreeJobAlert's and Adda247's latest listings, opens each notification from the last 30 days that is new or was updated, and sends it to the review queue. A notification the site has updated since it was last read is read again; one that has not changed is skipped. **Bring in the last 6 months** (a link at the bottom of the popup) does the same once across the category and state pages, for the archive. It opens pages in background tabs, two at a time, so keep its tab open (it can take an hour or more). Stop it whenever you like and run it again: pages already read are skipped.

Nothing is published by the sync. When a notification's own page changes (a last date extended, a vacancy count revised), the lead shows **Changed on the source** with the old and new value. A pending lead follows the change for any field you have not edited yourself. For a lead that is already published, **Apply the dates and vacancies to the recruitment** copies the new last date, start date and vacancy total onto the live recruitment after you have checked the official notification. The Overview shows how many are waiting.

To publish many at once, open the Pending tab: leads marked Ready have every detail the site needs. Tick them (or **Select all ready**), write what you checked, tick the confirmation and **Publish ticked leads**. A lead missing something is skipped and listed, never half published.

### Open and past notifications

Nobody moves a notification to past by hand. The site works out open, upcoming or past from the application start and last dates every time: a notification stays open through its last date and shows as past the next day. Open ones are listed first, the home page shows only open ones, and `/jobs` has an Open now / Past switch. A post you set to Closed stays closed whatever its dates say. The admin Overview shows how many notifications are active (and how many posts are open), how many are not open yet, and how many are past.
