# Admin guide

Sign in with an account that has the admin role (`pnpm db:create-admin`), then open `/admin`. All admin pages are private (`noindex`) and every change is written to the audit log.

## Notifications

1. **Organisations**: create the recruiting body first (type, department, state, website).
2. **Recruitments**: create a recruitment under an organisation and move it draft, needs review, reviewed, published. Publishing requires the official notification link, the official application link, a last date and verification notes. Publishing stamps who verified it and when.
3. **Posts**: add one post per notification page. Eligibility rules are JSON checked by the matching engine; the editor validates them and each rule needs `ruleText`, which candidates see. A post is public only when the post is published and its recruitment is published.
4. **CSV import**: bulk-create draft notifications. Tick "Check only" first. Imported rows are never published automatically.

Public pages, the sitemap and `llms.txt` refresh immediately after a change.

## Mock tests

1. **Question factory**: create a batch. Templates compute exact answers for Quantitative Aptitude with no AI cost. AI batches need a provider key (`ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` + `OPENAI_MODEL`, or `GEMINI_API_KEY` + `GEMINI_MODEL`); pick a different provider as the checker than the writer. From a terminal: `pnpm factory --subject "Quantitative Aptitude" --count 200 --strategy template`, and `pnpm factory:benchmark --models anthropic,openai --count 100` to compare models with a blind review sheet.
2. **Question review**: AI output never publishes itself. Approve in bulk or one by one, then publish. Editing an approved or published question sends it back to review. General Awareness and Computer questions always need a human fact check.
3. **Test series**: add an exam, a series (price in rupees, optional MRP), then tests with duration and marking. Attach approved questions, put them into sections, publish the test, then publish the series. A test can only publish when all its questions are published in the bank.

## Business

Payments, subscriptions and test access are read-only views. Error reports from candidates can be resolved under Reports.
