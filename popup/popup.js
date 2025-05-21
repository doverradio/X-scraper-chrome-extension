console.log("🚀 popup.js loaded");

// UI elements
const addBtn = document.getElementById("add");
const listBtn = document.getElementById("list");
const listLikersBtn = document.getElementById("list-likers");
const exportBtn = document.getElementById("export");
const pickMutualBtn = document.getElementById("pick-mutual");
const autoScrapeToggle = document.getElementById("auto-scrape-toggle");
const toggleLabel = document.querySelector(".toggle-label");
const output = document.getElementById("output");

function log(msg) {
  output.textContent = msg;
}

// Handle toggle switch change
autoScrapeToggle.addEventListener("change", () => {
  const isEnabled = autoScrapeToggle.checked;
  
  // Update the label text
  toggleLabel.textContent = isEnabled ? "Auto-Scraping Enabled" : "Auto-Scraping Disabled";
  
  // Save the setting to Chrome storage
  chrome.storage.local.set({ autoScrapeEnabled: isEnabled }, () => {
    log(`Auto-scraping is now ${isEnabled ? "enabled" : "disabled"}`);
    
    // Default to disabled (false) for safety
    if (isEnabled === undefined) {
      chrome.storage.local.set({ autoScrapeEnabled: false });
    }
  });
});

// Insert manually
addBtn.addEventListener("click", () => {
  const username = prompt("Add follower handle:");
  if (!username) return;
  chrome.runtime.sendMessage({
    type: "INSERT_FOLLOWER",
    payload: { handle: username.startsWith("@") ? username : "@" + username }
  });
  log(`Added: ${username}`);
});

// List all
listBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_ALL_FOLLOWERS" }, (followers) => {
    if (!followers) return log("⚠️ Failed to fetch");
    log(`📋 All followers (${followers.length}):\n${followers.join("\n")}`);
  });
});

// Export to .txt file
exportBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_ALL_FOLLOWERS" }, (followers) => {
    if (!followers || followers.length === 0) return log("⚠️ No followers to export.");
    const blob = new Blob([followers.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "followers.txt";
    a.click();
    URL.revokeObjectURL(url);
    log(`📤 Exported ${followers.length} followers to followers.txt`);
  });
});

// 🎯 Pick Random Mutual
pickMutualBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers || likers.length === 0) {
      return log("⚠️ No likers found. Scrape a /likes page first.");
    }
    
    // Directly pick a random liker from the list
    const randomIndex = Math.floor(Math.random() * likers.length);
    const randomLiker = likers[randomIndex];
    
    if (!randomLiker) {
      return log("⚠️ Error selecting a random liker.");
    }
    
    // Update button text with count
    pickMutualBtn.innerText = `🎯 Pick Random Mutual (${likers.length})`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(randomLiker).then(() => {
      log(`🎯 Random pick: ${randomLiker}\n\n📋 Copied to clipboard!\n\nTotal likers: ${likers.length}`);
    }).catch(err => {
      log(`🎯 Random pick: ${randomLiker}\n\n⚠️ Failed to copy to clipboard.\n\nTotal likers: ${likers.length}`);
    });
  });
});

// Update the List Likers button and functionality
listLikersBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers) return log("⚠️ Failed to fetch likers.");
    
    // Update the button text with count
    listLikersBtn.innerText = `List Likers (${likers.length})`;
    
    // Show the likers in the output area
    log(`❤️ Likers from DB (${likers.length}):\n${likers.join("\n")}`);
  });
});

// Update the Pick Random Mutual button with count when popup opens
function updateLikersCount() {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (likers && likers.length > 0) {
      // Update the button text with count
      listLikersBtn.innerText = `List Likers (${likers.length})`;
      pickMutualBtn.innerText = `🎯 Pick Random Mutual (${likers.length})`;
    }
  });
}

// Update the Pick Random Mutual button with count when popup opens
function updateMutualsCount() {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers || likers.length === 0) return;
    
    chrome.runtime.sendMessage({ type: "GET_ALL_FOLLOWERS" }, (followers) => {
      if (!followers) return;
      
      const mutuals = likers.filter(liker => followers.includes(liker));
      if (mutuals.length > 0) {
        pickMutualBtn.innerText = `🎯 Pick Random Mutual (${mutuals.length})`;
      }
    });
  });
}

// Load toggle state from storage
function loadToggleState() {
  chrome.storage.local.get("autoScrapeEnabled", (result) => {
    // Default to disabled (false) if not found in storage
    const isEnabled = result.autoScrapeEnabled !== undefined ? result.autoScrapeEnabled : false;
    
    // Update the UI
    autoScrapeToggle.checked = isEnabled;
    toggleLabel.textContent = isEnabled ? "Auto-Scraping Enabled" : "Auto-Scraping Disabled";
    
    // Make sure we have a valid setting saved
    if (result.autoScrapeEnabled === undefined) {
      chrome.storage.local.set({ autoScrapeEnabled: false });
    }
  });
}

// Call initialization functions when popup loads
document.addEventListener('DOMContentLoaded', () => {
  updateLikersCount();
  loadToggleState();
  
  // Show startup message
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    const likersCount = likers ? likers.length : 0;
    
    log(`✅ X Scraper Ready!\n\n❤️ ${likersCount} Likers in DB\n\nClick "Scrape Likers" on a tweet page to collect likers, then use "Pick Random Mutual" to randomly select one.`);
  });
});