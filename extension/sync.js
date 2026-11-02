import { extractPage } from "./extract.js";
import { BACKFILL_LISTINGS, CHECK_LISTINGS, SITE_ORIGINS, WINDOWS, sinceDate } from "./sources.js";

// One click: read the listing pages, ask the dashboard which notifications are new or changed, open each of those in a background
// tab, and send it. It publishes nothing; everything lands in the review queue. This page must stay open while it runs.

const mode = new URLSearchParams(location.search).get("mode") === "backfill" ? "backfill" : "check";
const listings = mode === "backfill" ? BACKFILL_LISTINGS : CHECK_LISTINGS;
const window_ = WINDOWS[mode];

const $ = (id) => document.getElementById(id);
const counts = { new: 0, updated: 0, joined: 0, unchanged: 0, failed: 0, skipped: 0 };
const countLabels = { new: "New leads", updated: "Changed on the source", joined: "Joined an existing lead", unchanged: "Already up to date", skipped: "Older than the window", failed: "Could not read" };
let stopRequested = false;
let server = "";
let token = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function showCounts() {
  const list = $("counts");
  list.hidden = false;
  list.replaceChildren();
  for (const [key, label] of Object.entries(countLabels)) {
    const box = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const value = document.createElement("dd");
    value.textContent = String(counts[key]);
    box.append(term, value);
    list.append(box);
  }
}

function log(text, kind = "") {
  const item = document.createElement("li");
  item.textContent = text;
  if (kind) item.className = kind;
  $("log").prepend(item);
  while ($("log").children.length > 150) $("log").lastChild.remove();
}

const status = (text) => ($("status").textContent = text);

async function api(path, body, attempt = 0) {
  const response = await fetch(`${server}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    await sleep(response.status === 429 ? 60000 : 3000 * (attempt + 1));
    return api(path, body, attempt + 1);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `The server answered ${response.status}.`);
  return data;
}

// Opens the page in a background tab, reads it the same way Analyse does, and closes the tab.
async function readPage(url, readMode) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    for (let waited = 0; waited < 45000; waited += 500) {
      const current = await chrome.tabs.get(tab.id);
      if (current.status === "complete") break;
      await sleep(500);
    }
    await sleep(1200);
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPage, args: [readMode] });
    return injection && injection.result;
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function planListing(url, since) {
  status(`Reading ${url}`);
  const page = await readPage(url, "list");
  if (!page || !page.links.length) throw new Error("No links on this page.");
  const todo = [];
  for (let start = 0; start < page.links.length; start += 500) {
    const plan = await api("/api/ingest/plan", { ...page, links: page.links.slice(start, start + 500), since });
    counts.new += plan.created;
    counts.joined += plan.seenOnAnotherSite;
    counts.unchanged += plan.unchanged;
    counts.skipped += plan.tooOld;
    todo.push(...plan.todo);
  }
  log(`${url.replace(/^https:\/\/(www\.)?/, "")}: ${todo.length} to read`);
  showCounts();
  return todo;
}

async function analyse(item) {
  const page = await readPage(item.url, "page");
  if (!page || page.text.length < 200) throw new Error("The page did not load.");
  const result = await api("/api/ingest/capture", { ...page, ...(item.listingDate ? { listingDate: item.listingDate } : {}) });
  if (result.changes && result.changes.length) {
    counts.updated++;
    log(`${result.title}: ${result.changes.map((change) => `${change.label} ${change.from} to ${change.to}`).join(", ")}`, "changed");
  } else {
    log(`${result.title}: ${result.outcome === "created" ? "added" : result.outcome === "merged" ? "joined a lead" : "already reviewed"}`);
  }
}

async function run() {
  $("start").hidden = true;
  $("stop").hidden = false;
  $("bar").hidden = false;
  const since = sinceDate(window_.days);
  try {
    const todo = new Map();
    for (const url of listings) {
      if (stopRequested) break;
      try {
        for (const item of await planListing(url, since)) if (!todo.has(item.url)) todo.set(item.url, item);
      } catch (error) {
        log(`${url}: ${error.message}`, "failed");
      }
    }
    const queue = [...todo.values()];
    $("bar").max = Math.max(queue.length, 1);
    let done = 0;
    // Two pages at a time, with a pause, so the sites are read the way a person browsing would.
    async function worker() {
      while (queue.length && !stopRequested) {
        const item = queue.shift();
        status(`Reading ${done + 1} of ${todo.size}: ${item.title}`);
        try {
          await analyse(item);
        } catch (error) {
          counts.failed++;
          log(`${item.title}: ${error.message}`, "failed");
        }
        $("bar").value = ++done;
        showCounts();
        await sleep(900);
      }
    }
    await Promise.all([worker(), worker()]);
    status(stopRequested ? `Stopped. Read ${done} of ${todo.size}. Run it again to carry on; pages already read are skipped.` : `Done. Read ${done} pages.`);
  } catch (error) {
    status(error instanceof Error ? error.message : "Something went wrong.");
  } finally {
    $("stop").hidden = true;
    $("start").hidden = false;
    $("start").textContent = "Run again";
    $("links").replaceChildren();
    for (const [label, path] of [["Review the new leads", "/admin/leads"], ["See what changed on the source", "/admin/leads?status=updated"]]) {
      const anchor = document.createElement("a");
      anchor.href = `${server}${path}`;
      anchor.target = "_blank";
      anchor.textContent = label;
      $("links").append(anchor, " · ");
    }
  }
}

async function begin() {
  ({ server, token } = await chrome.storage.local.get({ server: "", token: "" }));
  if (!server || !token) {
    status("Add the server address and token in Settings first.");
    return;
  }
  // The permission has to be asked for from a click, which is why there is a Start button.
  const granted = await chrome.permissions.request({ origins: SITE_ORIGINS });
  if (!granted) {
    status("Allow access to the two sites to read their pages.");
    return;
  }
  stopRequested = false;
  Object.keys(counts).forEach((key) => (counts[key] = 0));
  $("log").replaceChildren();
  showCounts();
  run();
}

$("heading").textContent = mode === "backfill" ? "Bring in the last 6 months" : "Check for new and updated notifications";
$("intro").textContent =
  mode === "backfill"
    ? `One time: reads ${listings.length} listing pages on FreeJobAlert and Adda247, then opens each notification from ${window_.label} that is not in the dashboard yet. It can take an hour or more. Keep this tab open; it opens pages in the background. Nothing is published.`
    : `Reads the latest listings on FreeJobAlert and Adda247, then opens each notification from ${window_.label} that is new or was updated, and sends it to the review queue. Nothing is published.`;
$("start").addEventListener("click", begin);
$("stop").addEventListener("click", () => {
  stopRequested = true;
  status("Stopping after the current page...");
});
