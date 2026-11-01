import { extractPage } from "./extract.js";

const result = document.getElementById("result");
const buttons = [document.getElementById("analyse"), document.getElementById("list")];

function show(kind, heading, lines = [], link) {
  result.replaceChildren();
  const card = document.createElement("div");
  card.className = `card ${kind}`;
  const title = document.createElement("strong");
  title.textContent = heading;
  card.append(title);
  if (lines.length) {
    const list = document.createElement("ul");
    for (const line of lines) {
      const item = document.createElement("li");
      item.textContent = typeof line === "string" ? line : line.text;
      if (typeof line !== "string" && line.missing) item.className = "missing";
      list.append(item);
    }
    card.append(list);
  }
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      chrome.tabs.create({ url: link.href });
    });
    card.append(anchor);
  }
  result.append(card);
}

function describePage(data, server) {
  const found = data.found;
  const checks = [
    { text: found.organisation ? `Organisation: ${found.organisation}` : "Organisation not found", missing: !found.organisation },
    { text: found.lastDate ? `Last date: ${found.lastDate}` : "Last date not found", missing: !found.lastDate },
    { text: found.vacancies ? `Vacancies: ${found.vacancies}` : "Vacancies not found", missing: !found.vacancies },
    { text: found.posts ? `${found.posts} ${found.posts === 1 ? "post" : "posts"}` : "No posts found", missing: !found.posts },
    { text: found.officialNotification ? "Official notification link found" : "No official notification link", missing: !found.officialNotification },
    { text: found.officialApplication ? "Official apply link found" : "No official apply link", missing: !found.officialApplication }
  ];
  let heading;
  let kind = "ok";
  if (data.outcome === "created") heading = "Added to the review queue";
  else if (data.outcome === "merged") heading = `Joined an existing lead. Seen on ${data.sources} ${data.sources === 1 ? "site" : "sites"} now.`;
  else {
    heading = `Already ${data.status}. Nothing was changed.`;
    kind = "warn";
  }
  if (data.alreadyLive) {
    kind = "warn";
    heading += ` It may already be live: ${data.alreadyLive.title}.`;
  }
  show(kind, heading, data.outcome === "already_reviewed" ? [] : checks, { href: `${server}/admin/leads/${data.leadId}`, label: "Open in the dashboard" });
}

function describeList(data, server) {
  if (!data.spotted) {
    show("warn", "No recruitment headlines found on this page. Open a listing of notifications, or use Analyse on a single notification.");
    return;
  }
  show(
    "ok",
    `Found ${data.spotted} recruitment ${data.spotted === 1 ? "headline" : "headlines"}`,
    [`${data.created} new`, `${data.seenOnAnotherSite} also on another site`, `${data.alreadyKnown} already known`, `${data.alreadyReviewed} already reviewed`],
    { href: `${server}/admin/leads`, label: "Open the review queue" }
  );
}

async function run(mode) {
  const { server, token } = await chrome.storage.local.get({ server: "", token: "" });
  if (!server || !token) {
    show("error", "Add the server address and token in Settings first.");
    return;
  }
  buttons.forEach((button) => (button.disabled = true));
  show("", "Reading the page...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !/^https?:/i.test(tab.url || "")) throw new Error("Open a notification page in this tab first.");
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPage, args: [mode] });
    const page = injection && injection.result;
    if (!page) throw new Error("Could not read this page.");
    show("", "Sending to the dashboard...");
    const response = await fetch(`${server}/api/ingest/capture`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(page)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `The server answered ${response.status}.`);
    if (data.mode === "list") describeList(data, server);
    else describePage(data, server);
  } catch (error) {
    show("error", error instanceof Error ? error.message : "Something went wrong.");
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

document.getElementById("analyse").addEventListener("click", () => run("page"));
document.getElementById("list").addEventListener("click", () => run("list"));
document.getElementById("settings").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});
