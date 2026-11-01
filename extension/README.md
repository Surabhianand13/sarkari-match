# SarkariMatch Collector

A Chrome extension for the admin team. On a notification page of another site (for example FreeJobAlert or Adda247), click **Analyse this page**. The page's text, links and tables go to the SarkariMatch admin dashboard as a lead. An admin checks the lead against the official notification and approves it. Nothing is published by the extension.

## Install (Chrome, Edge, Brave)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. **Load unpacked** and choose this `extension` folder. There is no build step.
3. Pin the extension. Open **Settings** from the popup.
4. In the admin dashboard open **Competitor leads, Connect the extension**, make a token, and paste it here with the dashboard address. Chrome asks once to allow that one address.

## Use

- **Analyse this page** on a single notification page. The result says what was found (organisation, last date, vacancies, posts, official links) and what is missing, with a link to the lead.
- **Collect headlines from this listing page** on a home or listing page. Each new recruitment headline becomes a lead marked "Headline only"; open its page and Analyse to fill in the details. Admit cards, results and menu links are skipped.
- The same notification seen on two sites becomes one lead. Where the sites disagree (a last date, a vacancy count) the dashboard shows both.

## What it reads and sends

- Only when you click, and only the tab you are on (`activeTab`). It runs no code in the background and reads no other tabs.
- It sends the page address, title, visible text, links (with the label next to each) and tables to your dashboard, signed with your token. Nothing goes anywhere else.
- A token can only add leads. Revoke it from the dashboard and the extension stops working.

## Files

- `extract.js` reads the page. `popup.js` runs the popup and sends the capture. `options.js` stores the address and token.
- The server turns the capture into fields in `lib/ingest/parse.ts`, so improving the reading rules never needs a new extension.
