console.log("🚀 popup.js loaded");

// UI elements - ONLY include elements that exist in the HTML
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

// 🎯 Pick Random Mutual (people who liked and follow you)
pickMutualBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers || likers.length === 0) {
      return log("⚠️ No mutual likers found. Scrape a /likes page first.");
    }
    
    // Directly pick a random mutual liker from the list
    const randomIndex = Math.floor(Math.random() * likers.length);
    const randomLiker = likers[randomIndex];
    
    if (!randomLiker) {
      return log("⚠️ Error selecting a random mutual liker.");
    }
    
    // Update button text with count
    pickMutualBtn.innerText = `🎯 Pick Random Mutual (${likers.length})`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(randomLiker).then(() => {
      log(`🎯 Random mutual pick: ${randomLiker}\n\n📋 Copied to clipboard!\n\nTotal mutual likers: ${likers.length}`);
    }).catch(err => {
      log(`🎯 Random mutual pick: ${randomLiker}\n\n⚠️ Failed to copy to clipboard.\n\nTotal mutual likers: ${likers.length}`);
    });
  });
});

// 🎲 Pick Any Random Liker (all people who liked the post)
pickAnyLikerBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_ALL_LIKERS" }, (allLikers) => {
    if (!allLikers || allLikers.length === 0) {
      return log("⚠️ No likers found. Scrape a /likes page first.");
    }
    
    // Directly pick a random liker from all likers
    const randomIndex = Math.floor(Math.random() * allLikers.length);
    const randomLiker = allLikers[randomIndex];
    
    if (!randomLiker) {
      return log("⚠️ Error selecting a random liker.");
    }
    
    // Update button text with count
    pickAnyLikerBtn.innerText = `🎲 Pick Any Random Liker (${allLikers.length})`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(randomLiker).then(() => {
      log(`🎲 Random pick (any liker): ${randomLiker}\n\n📋 Copied to clipboard!\n\nTotal likers: ${allLikers.length}`);
    }).catch(err => {
      log(`🎲 Random pick (any liker): ${randomLiker}\n\n⚠️ Failed to copy to clipboard.\n\nTotal likers: ${allLikers.length}`);
    });
  });
});

// List Mutual Likers (people who liked and follow you)
listLikersBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers) return log("⚠️ Failed to fetch mutual likers.");
    
    // Update the button text with count
    listLikersBtn.innerText = `List Mutual Likers (${likers.length})`;
    
    // Show the likers in the output area
    log(`❤️ Mutual Likers from DB (${likers.length}):\n${likers.join("\n")}`);
  });
});

// List All Likers (everyone who liked the post)
listAllLikersBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_ALL_LIKERS" }, (allLikers) => {
    if (!allLikers) return log("⚠️ Failed to fetch all likers.");
    
    // Update the button text with count
    listAllLikersBtn.innerText = `List All Likers (${allLikers.length})`;
    
    // Show the likers in the output area
    log(`👥 All Likers from DB (${allLikers.length}):\n${allLikers.join("\n")}`);
  });
});

// Update the button counts when popup opens
function updateLikersCount() {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (likers && likers.length > 0) {
      listLikersBtn.innerText = `List Mutual Likers (${likers.length})`;
      pickMutualBtn.innerText = `🎯 Pick Random Mutual (${likers.length})`;
    }
  });
  
  chrome.runtime.sendMessage({ type: "GET_ALL_LIKERS" }, (allLikers) => {
    if (allLikers && allLikers.length > 0) {
      listAllLikersBtn.innerText = `List All Likers (${allLikers.length})`;
      pickAnyLikerBtn.innerText = `🎲 Pick Any Random Liker (${allLikers.length})`;
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
    
    chrome.runtime.sendMessage({ type: "GET_ALL_LIKERS" }, (allLikers) => {
      const allLikersCount = allLikers ? allLikers.length : 0;
      
      log(`✅ X Scraper Ready!\n\n❤️ ${likersCount} Mutual Likers in DB\n👥 ${allLikersCount} Total Likers in DB\n\nClick "Begin Scrape" on a tweet's /likes page to collect likers, then use the buttons to pick randomly.`);
    });
  });
});