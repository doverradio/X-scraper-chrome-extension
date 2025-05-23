console.log("🚀 popup.js loaded");

// UI elements
const listLikersBtn = document.getElementById("list-likers");
const listAllLikersBtn = document.getElementById("list-all-likers");
const pickMutualBtn = document.getElementById("pick-mutual");
const pickAnyLikerBtn = document.getElementById("pick-any-liker");
const autoScrapeToggle = document.getElementById("auto-scrape-toggle");
const toggleLabel = document.querySelector(".toggle-label");
const output = document.getElementById("output");

function log(msg) {
  output.textContent = msg;
}

// Retry logic to request data from background.js
function fetchWithRetry(type, attempts = 5, delay = 500) {
  return new Promise((resolve) => {
    const tryFetch = (count) => {
      chrome.runtime.sendMessage({ type }, (result) => {
        if (Array.isArray(result) && result.length > 0) {
          return resolve(result);
        }
        if (count > 0) {
          setTimeout(() => tryFetch(count - 1), delay);
        } else {
          resolve(result || []);
        }
      });
    };
    tryFetch(attempts);
  });
}

// Handle toggle change
autoScrapeToggle.addEventListener("change", () => {
  const isEnabled = autoScrapeToggle.checked;
  toggleLabel.textContent = isEnabled ? "Auto-Scraping Enabled" : "Auto-Scraping Disabled";
  chrome.storage.local.set({ autoScrapeEnabled: isEnabled }, () => {
    log(`Auto-scraping is now ${isEnabled ? "enabled" : "disabled"}`);
  });
});

// Mutual Likers list
listLikersBtn.addEventListener("click", async () => {
  const likers = await fetchWithRetry("GET_LIKERS");
  listLikersBtn.innerText = `List Follower Likers (${likers.length})`;
  log(`❤️ Follower Likers from DB (${likers.length}):\n${likers.join("\n")}`);
});

// All Likers list
listAllLikersBtn.addEventListener("click", async () => {
  const allLikers = await fetchWithRetry("GET_ALL_LIKERS");
  listAllLikersBtn.innerText = `List All Likers (${allLikers.length})`;
  log(`👥 All Likers from DB (${allLikers.length}):\n${allLikers.join("\n")}`);
});

// Pick Random Mutual
pickMutualBtn.addEventListener("click", async () => {
  const likers = await fetchWithRetry("GET_LIKERS");
  if (!likers.length) return log("⚠️ No follower likers found.");
  const random = likers[Math.floor(Math.random() * likers.length)];
  pickMutualBtn.innerText = `🎯 Pick Random Follower (${likers.length})`;
  navigator.clipboard.writeText(random).then(() => {
    log(`🎯 Picked: ${random}\n📋 Copied to clipboard!`);
  });
});

// Pick Any Random Liker
pickAnyLikerBtn.addEventListener("click", async () => {
  const allLikers = await fetchWithRetry("GET_ALL_LIKERS");
  if (!allLikers.length) return log("⚠️ No likers found.");
  const random = allLikers[Math.floor(Math.random() * allLikers.length)];
  pickAnyLikerBtn.innerText = `🎲 Pick Any Random Liker (${allLikers.length})`;
  navigator.clipboard.writeText(random).then(() => {
    log(`🎲 Picked: ${random}\n📋 Copied to clipboard!`);
  });
});

// Update button counts on load
async function updateLikersCount() {
  const mutuals = await fetchWithRetry("GET_LIKERS");
  const allLikers = await fetchWithRetry("GET_ALL_LIKERS");

  if (mutuals.length) {
    listLikersBtn.innerText = `List Follower Likers (${mutuals.length})`;
    pickMutualBtn.innerText = `🎯 Pick Random Follower (${mutuals.length})`;
  }

  if (allLikers.length) {
    listAllLikersBtn.innerText = `List All Likers (${allLikers.length})`;
    pickAnyLikerBtn.innerText = `🎲 Pick Any Random Liker (${allLikers.length})`;
  }

  log(`✅ X Scraper Ready!\n\n❤️ ${mutuals.length} Follower Likers\n👥 ${allLikers.length} Total Likers`);
}

// Load saved toggle setting
function loadToggleState() {
  chrome.storage.local.get("autoScrapeEnabled", (result) => {
    const isEnabled = result.autoScrapeEnabled ?? false;
    autoScrapeToggle.checked = isEnabled;
    toggleLabel.textContent = isEnabled ? "Auto-Scraping Enabled" : "Auto-Scraping Disabled";
    if (result.autoScrapeEnabled === undefined) {
      chrome.storage.local.set({ autoScrapeEnabled: false });
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateLikersCount();
  loadToggleState();
});
