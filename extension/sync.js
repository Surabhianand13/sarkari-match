import { extractPage } from "./extract.js";
import { BACKFILL_LISTINGS, CHECK_LISTINGS, SITE_ORIGINS, WINDOWS, sinceDate } from "./sources.js";

// One click: read the listing pages, ask the dashboard which notifications are new or changed, open each of those in a background
// tab, and send it. It publishes nothing; everything lands in the review queue. This page must stay open while it runs.

// Three ways in: "here" reads the listing page you had open and follows its links; "check" and "backfill" read preset listings.
const params = new URLSearchParams(location.search);
const mode = ["here", "backfill"].includes(params.get("mode")) ? params.get("mode") : "check";
const hereUrl = params.get("url") || "";
const hereTab = Number(params.get("tab")) || 0;
const listings = mode === "here" ? [hereUrl] : mode === "backfill" ? BACKFILL_LISTINGS : CHECK_LISTINGS;
const defaultWindow = mode === "backfill" || mode === "here" ? "183" : "30";
const MAX_LISTING_PAGES = 40;

// A problem that will repeat on every page (the dashboard has no sync yet, or the token is wrong), so the run stops instead of listing it 47 times.
class Fatal extends Error {}

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
  if (response.status === 404) throw new Fatal("Your dashboard does not have one-click sync yet. Wait until its latest deploy says Live in Render, then run this again.");
  if (response.status === 401) throw new Fatal(data.error || "The token is not valid. Make a new one in the dashboard and paste it in Settings.");
  if (!response.ok) throw new Error(data.error || `The server answered ${response.status}.`);
  return data;
}

// Opens the page in a background tab, reads it the same way Analyse does, and closes the tab.
async function readPage(url, readMode, openTabId = 0) {
  // A tab that is already open is read as it is and left open.
  const tab = openTabId ? await chrome.tabs.get(openTabId).catch(() => null) : null;
  const own = !tab;
  const target = tab || (await chrome.tabs.create({ url, active: false }));
  try {
    for (let waited = 0; waited < 45000; waited += 500) {
      const current = await chrome.tabs.get(target.id);
      if (current.status === "complete") break;
      await sleep(500);
    }
    await sleep(own ? 1200 : 0);
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: target.id }, func: extractPage, args: [readMode] });
    return injection && injection.result;
  } finally {
    if (own) chrome.tabs.remove(target.id).catch(() => {});
  }
}

// Reads one listing page and asks the dashboard what to do with its notifications. Long listings are followed to their next page
// while the pages still hold notifications inside the window.
async function planListing(url, since, openTabId = 0) {
  const todo = [];
  let next = url;
  for (let pageNumber = 1; next && pageNumber <= MAX_LISTING_PAGES && !stopRequested; pageNumber++) {
    status(`Reading ${next}`);
    const page = await readPage(next, "list", pageNumber === 1 ? openTabId : 0);
    if (!page || !page.links.length) {
      if (pageNumber === 1) throw new Error("No links on this page.");
      break;
    }
    let spotted = 0;
    let tooOld = 0;
    let added = 0;
    for (let start = 0; start < page.links.length; start += 500) {
      const plan = await api("/api/ingest/plan", { ...page, links: page.links.slice(start, start + 500), since });
      counts.new += plan.created;
      counts.joined += plan.seenOnAnotherSite;
      counts.unchanged += plan.unchanged;
      counts.skipped += plan.tooOld;
      spotted += plan.spotted;
      tooOld += plan.tooOld;
      added += plan.todo.length;
      todo.push(...plan.todo);
    }
    log(`${next.replace(/^https:\/\/(www\.)?/, "")}: ${spotted} notifications, ${added} to read`);
    showCounts();
    // Stop following pages once everything on one is older than the window.
    next = spotted > 0 && tooOld === spotted ? "" : page.next || "";
  }
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
  const chosen = WINDOWS.find((option) => option.key === $("window").value) || WINDOWS[2];
  const since = sinceDate(chosen.days);
  try {
    const todo = new Map();
    for (const url of listings) {
      if (stopRequested) break;
      try {
        for (const item of await planListing(url, since, mode === "here" ? hereTab : 0)) if (!todo.has(item.url)) todo.set(item.url, item);
      } catch (error) {
        if (error instanceof Fatal) throw error;
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
    log(error instanceof Error ? error.message : "Something went wrong.", "failed");
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
  const origins = mode === "here" ? [...new Set([...SITE_ORIGINS, `${new URL(hereUrl).origin}/*`])] : SITE_ORIGINS;
  const granted = await chrome.permissions.request({ origins });
  if (!granted) {
    status("Allow access to the site to read its pages.");
    return;
  }
  stopRequested = false;
  Object.keys(counts).forEach((key) => (counts[key] = 0));
  $("log").replaceChildren();
  showCounts();
  run();
}

for (const option of WINDOWS) {
  const choice = document.createElement("option");
  choice.value = option.key;
  choice.textContent = option.label;
  $("window").append(choice);
}
$("window").value = defaultWindow;
$("heading").textContent = mode === "here" ? "Read every notification on this page" : mode === "backfill" ? "Bring in the archive" : "Check for new and updated notifications";
$("intro").textContent =
  mode === "here"
    ? `Reads the listing you had open (${hereUrl}), follows its next pages, and opens each notification linked from it that is new or was updated. Everything goes to the review queue; nothing is published.`
    : mode === "backfill"
      ? `One time: reads ${listings.length} listing pages on FreeJobAlert and Adda247, then opens each notification in the chosen period that is not in the dashboard yet. It can take an hour or more. Keep this tab open; it opens pages in the background. Nothing is published.`
      : "Reads the latest listings on FreeJobAlert and Adda247, then opens each notification that is new or was updated, and sends it to the review queue. Nothing is published.";
$("start").addEventListener("click", begin);
$("stop").addEventListener("click", () => {
  stopRequested = true;
  status("Stopping after the current page...");
});
