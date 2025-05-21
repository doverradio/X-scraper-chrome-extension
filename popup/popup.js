console.log("🚀 popup.js loaded");

// UI elements - ONLY include elements that exist in the HTML
const listLikersBtn = document.getElementById("list-likers");
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

// List Likers button functionality
listLikersBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers) return log("⚠️ Failed to fetch likers.");
    
    // Update the button text with count
    listLikersBtn.innerText = `List Likers (${likers.length})`;
    
    // Show the likers in the output area
    log(`❤️ Likers from DB (${likers.length}):\n${likers.join("\n")}`);
  });
});

// Update the button counts when popup opens
function updateLikersCount() {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (likers && likers.length > 0) {
      // Update the button text with count
      listLikersBtn.innerText = `List Likers (${likers.length})`;
      pickMutualBtn.innerText = `🎯 Pick Random Mutual (${likers.length})`;
    }
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