const serverInput = document.getElementById("server");
const tokenInput = document.getElementById("token");
const status = document.getElementById("status");

function say(kind, message) {
  status.replaceChildren();
  const card = document.createElement("div");
  card.className = `card ${kind}`;
  card.textContent = message;
  status.append(card);
}

// The dashboard must be https, or this computer for local testing.
function readOrigin(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
  return url.origin;
}

chrome.storage.local.get({ server: "", token: "" }).then(({ server, token }) => {
  serverInput.value = server;
  tokenInput.value = token;
});

document.getElementById("save").addEventListener("click", async () => {
  const origin = readOrigin(serverInput.value);
  const token = tokenInput.value.trim();
  if (!origin) return say("error", "Enter the dashboard address starting with https:// (http://localhost is fine for testing).");
  if (!/^smx_[A-Za-z0-9_-]{20,}$/.test(token)) return say("error", "That does not look like a collector token. Make one in the admin dashboard.");

  // Chrome asks once, and the extension can then talk to this one address and nothing else.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) return say("error", "Permission to reach the dashboard was not given.");

  try {
    const response = await fetch(`${origin}/api/ingest/capture`, { headers: { authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return say("error", data.error || `The server answered ${response.status}.`);
    await chrome.storage.local.set({ server: origin, token });
    say("ok", `Connected as "${data.label}". You can close this tab.`);
  } catch {
    say("error", "Could not reach the dashboard. Check the address.");
  }
});
