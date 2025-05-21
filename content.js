// Variable to store the auto-scrape setting
let autoScrapeEnabled = false; // Default to disabled for safety

// Load the setting when content script initializes
function loadAutoScrapeSettings() {
  try {
    chrome.storage.local.get("autoScrapeEnabled", (result) => {
      // Update our global variable
      autoScrapeEnabled = result.autoScrapeEnabled !== undefined ? result.autoScrapeEnabled : false;
      console.log("🔄 Auto-scraping setting loaded:", autoScrapeEnabled);
    });
  } catch (error) {
    console.error("Error loading auto-scrape settings:", error);
    autoScrapeEnabled = false; // Default to disabled on error
  }
}

// Load settings immediately and also set up a listener for changes
loadAutoScrapeSettings();

// Listen for changes to the auto-scrape setting
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.autoScrapeEnabled) {
    autoScrapeEnabled = changes.autoScrapeEnabled.newValue;
    console.log("🔄 Auto-scraping setting updated:", autoScrapeEnabled);
  }
});

// ✅ Inject follower sniffer into the page's real JS context
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject-sniffer.js");
script.onload = () => script.remove();
document.documentElement.appendChild(script);

// ✅ Listen for messages sent from the injected sniffer
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.source === "follower-sniffer") {
    for (const handle of event.data.handles) {
      console.log("📩 Follower forwarded to background:", handle);
      chrome.runtime.sendMessage({
        type: "INSERT_FOLLOWER",
        payload: { handle }
      });
    }
  }
});

// ✅ Automatically redirect /status/... to /likes - BUT ONLY when scrape button is clicked!
let redirected = false;
let manuallyTriggeredRedirect = false;

// This function will only be called when the scrape button is clicked
const triggerRedirectToLikes = () => {
  if (redirected) return;
  
  const tweetUrlMatch = window.location.pathname.match(/^\/[^/]+\/status\/\d+$/);
  if (tweetUrlMatch && !window.location.pathname.endsWith("/likes")) {
    redirected = true;
    manuallyTriggeredRedirect = true;
    const likesUrl = window.location.pathname + "/likes";
    console.log("➡️ Manually redirecting to:", likesUrl);
    window.location.href = likesUrl;
    return true;
  }
  return false;
}

function addScrapeButton() {
  if (document.getElementById("x-scrape-btn")) return;

  const btn = document.createElement("button");
  btn.id = "x-scrape-btn";
  
  // Check if we're on a /likes page
  const isLikesPage = window.location.href.endsWith("/likes");
  
  // Set button text and color based on the current page
  if (isLikesPage) {
    btn.innerText = "Begin Scrape";
    btn.style.background = "#17bf63"; // Green color for begin scrape
  } else {
    btn.innerText = "Scrape Likers";
    btn.style.background = "#1d9bf0"; // Blue color for regular state
  }
  
  // Style the button
  btn.style.position = "fixed";
  btn.style.top = "80px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 15px";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";

  btn.onclick = async () => {
    // Check if we're already on a /likes page
    if (!window.location.href.endsWith("/likes")) {
      // Not on likes page, so redirect first
      const redirected = triggerRedirectToLikes();
      if (redirected) {
        // We'll handle the scraping after page loads
        return;
      }
      alert("Navigate to your tweet's /likes URL first, then click 'Begin Scrape'.");
      return;
    }

    console.log("🔄 Starting to scrape likers from /likes view...");
    btn.innerText = "Scrolling...";
    btn.disabled = true;
    
    try {
      // Now autoScrollLikesPage returns the mutual handles directly
      const mutuals = await autoScrollLikesPage();
      console.log("✅ Finished scrolling, collected mutuals:", mutuals);
      window.likers = mutuals;

      try {
        await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: "SET_LIKERS",
              payload: { likers: mutuals }
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("❌ Runtime error:", chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            }
          );
        });
        alert(`Scraped ${mutuals.length} likers. Check console.`);
      } catch (e) {
        console.error("❌ Failed to send likers to background:", e);
        alert("Error saving likers. Check console for details.");
      }
    } catch (error) {
      console.error("Error during scraping:", error);
      alert("Error during scraping. Check console for details.");
    } finally {
      // Reset button text based on current page
      if (window.location.href.endsWith("/likes")) {
        btn.innerText = "Begin Scrape";
        btn.style.background = "#17bf63";
      } else {
        btn.innerText = "Scrape Likers";
        btn.style.background = "#1d9bf0";
      }
      btn.disabled = false;
    }
  };

  document.body.appendChild(btn);
}

function addScrapeFollowersButton() {
  if (document.getElementById("x-follower-btn")) return;

  const btn = document.createElement("button");
  btn.id = "x-follower-btn";
  btn.innerText = "Scrape Followers";
  btn.style.position = "fixed";
  btn.style.top = "130px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 15px";
  btn.style.background = "#17bf63";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";

  btn.onclick = async () => {
    if (!window.location.href.endsWith("/followers")) {
      alert("Navigate to your /followers page first, then click 'Scrape Followers'.");
      return;
    }

    console.log("Scrolling and scraping followers...");
    btn.innerText = "Scrolling...";
    btn.disabled = true;
    
    try {
      const followers = await autoScrollFollowersPage();
      console.log("Scraped followers:", followers);
      window.myFollowers = followers;
      alert(`Scraped ${followers.length} followers. Check console.`);
    } finally {
      btn.innerText = "Scrape Followers";
      btn.disabled = false;
    }
  };

  document.body.appendChild(btn);
}

async function autoScrollLikesPage() {
  // Find the correct scrollable element - try multiple options
  let scrollContainer = document.querySelector('[data-testid="primaryColumn"]');
  if (!scrollContainer) scrollContainer = document.querySelector('main');
  if (!scrollContainer) scrollContainer = document.documentElement;
  
  console.log("📜 Using scroll container:", scrollContainer);
  
  let lastHeight = scrollContainer.scrollHeight;
  let lastUserCount = 0;
  let unchangedPasses = 0;
  let totalScrolls = 0;
  let pauseCount = 0;
  
  // Keep track of mutuals while scrolling
  const mutualHandles = new Set();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      // Collect current mutuals
      const likerCards = document.querySelectorAll('[data-testid="UserCell"]');
      
      likerCards.forEach(card => {
        // Check if this user follows you
        const followsYou = card.querySelector('[data-testid="userFollowIndicator"]');
        if (!followsYou) return;
        
        // Find the handle
        const spans = card.querySelectorAll('span');
        const handleSpan = Array.from(spans).find(span => 
          span.textContent && span.textContent.trim().startsWith("@")
        );
        
        if (handleSpan) {
          const handle = handleSpan.textContent.trim();
          mutualHandles.add(handle);
        }
      });
      
      console.log(`Found ${mutualHandles.size} mutual followers so far`);
      
      // Scroll down using multiple methods
      window.scrollTo(0, document.body.scrollHeight);
      scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
      scrollContainer.scrollBy(0, 1000);
      
      totalScrolls++;
      
      // Check if we've reached the bottom or if content is still loading
      const currentHeight = scrollContainer.scrollHeight;
      const currentUserCount = mutualHandles.size;
      
      console.log(`Scroll attempt ${totalScrolls}, height: ${currentHeight}px, mutuals: ${currentUserCount}`);

      if (currentHeight === lastHeight && currentUserCount === lastUserCount) {
        unchangedPasses++;
        console.log(`No new content detected (${unchangedPasses}/6)`);
        
        // Every 3 unchanged passes, let's pause a bit longer to make sure content loads
        if (unchangedPasses % 3 === 0 && pauseCount < 3) {
          pauseCount++;
          console.log(`Adding extra pause (${pauseCount}/3) to ensure content loads...`);
          
          // Jiggle the scroll a bit to trigger loading
          setTimeout(() => {
            scrollContainer.scrollBy(0, -100);
            setTimeout(() => {
              scrollContainer.scrollBy(0, 200);
            }, 500);
          }, 500);
        }
      } else {
        unchangedPasses = 0;
        if (currentHeight !== lastHeight) {
          console.log(`Height changed: ${lastHeight}px → ${currentHeight}px`);
          lastHeight = currentHeight;
        }
        if (currentUserCount !== lastUserCount) {
          console.log(`Mutual count changed: ${lastUserCount} → ${currentUserCount}`);
          lastUserCount = currentUserCount;
        }
      }

      // Stop conditions:
      // 1. 6 consecutive passes with no change (increased from 5)
      // 2. OR if we've done 75 scroll attempts total (increased from 50)
      // 3. AND we've found at least some followers
      if ((unchangedPasses >= 6 || totalScrolls >= 75) && mutualHandles.size > 0) {
        clearInterval(interval);
        console.log(`✅ Finished scrolling likes list after ${totalScrolls} scrolls. Found ${mutualHandles.size} mutual followers.`);
        resolve(Array.from(mutualHandles));
      }
    }, 1500); // Increased from 1000ms to 1500ms to give more time to load
  });
}

// Update for better span handling in content.js
// Update for better span handling in content.js
// Final ultra-robust version of safelyProcessUserCells
function safelyProcessUserCells(rows) {
  // Create a set to store usernames
  const usernames = new Set();
  
  try {
    // Early return if rows is invalid
    if (!rows) {
      console.log("No rows provided");
      return usernames;
    }
    
    // Check if rows has a length property and it's a number
    if (typeof rows.length !== 'number') {
      console.log("Rows doesn't have a valid length property");
      return usernames;
    }
    
    // Check if rows is empty
    if (rows.length === 0) {
      console.log("Empty rows collection");
      return usernames;
    }
    
    // Loop through rows using index-based iteration (safer than for...of)
    let i = 0;
    const rowsLength = rows.length;
    
    while (i < rowsLength) {
      try {
        // Get the current row
        const row = rows[i];
        
        // Skip if row is invalid
        if (!row) {
          console.log(`Row at index ${i} is invalid`);
          i++;
          continue;
        }
        
        // Safely get spans
        let spans = null;
        try {
          // Check if querySelectorAll is available on this object
          if (typeof row.querySelectorAll !== 'function') {
            console.log(`Row at index ${i} doesn't have querySelectorAll method`);
            i++;
            continue;
          }
          
          spans = row.querySelectorAll('span');
        } catch (spanError) {
          console.log(`Error getting spans from row ${i}:`, spanError);
          i++;
          continue;
        }
        
        // Check if spans is valid
        if (!spans || typeof spans.length !== 'number') {
          console.log(`Invalid spans collection at row ${i}`);
          i++;
          continue;
        }
        
        // Process each span individually
        let j = 0;
        const spansLength = spans.length;
        
        while (j < spansLength) {
          try {
            const span = spans[j];
            
            // Skip invalid spans
            if (!span) {
              j++;
              continue;
            }
            
            // Check for textContent property
            if (!span.textContent) {
              j++;
              continue;
            }
            
            const text = span.textContent;
            
            // Verify it's a string and starts with @
            if (typeof text === 'string' && text.trim().startsWith('@')) {
              const handle = text.trim();
              usernames.add(handle);
            }
          } catch (spanProcessError) {
            console.log(`Error processing span ${j} in row ${i}:`, spanProcessError);
          }
          
          j++;
        }
      } catch (rowError) {
        console.log(`Error processing row at index ${i}:`, rowError);
      }
      
      i++;
    }
  } catch (globalError) {
    console.error("Global error in safelyProcessUserCells:", globalError);
  }
  
  return usernames;
}

// Updated function to use the safer processing
async function autoScrollFollowersPage() {
  let allUsernames = new Set();
  let lastCount = 0;
  let stablePasses = 0;
  let totalScrolls = 0;
  
  // Find the correct scrollable element
  let scrollContainer = document.querySelector('[data-testid="primaryColumn"]');
  if (!scrollContainer) scrollContainer = document.querySelector('main');
  if (!scrollContainer) scrollContainer = document.documentElement;
  
  console.log("📜 Using scroll container for followers:", scrollContainer);

  return new Promise(resolve => {
    const interval = setInterval(() => {
      // Try multiple scroll methods
      window.scrollTo(0, document.body.scrollHeight);
      if (scrollContainer) {
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
      }
      
      try {
        // Safely get and process user cells
        const rows = document.querySelectorAll('div[data-testid="UserCell"]');
        const newUsernames = safelyProcessUserCells(rows);
        
        // Add all new usernames to our main set
        newUsernames.forEach(name => allUsernames.add(name));
        
        console.log(`Found ${rows.length} user cells, currently have ${allUsernames.size} usernames`);
        
        // Scroll the last row into view
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            lastRow.scrollIntoView({ behavior: "smooth", block: "end" });
          }
        }
      } catch (error) {
        console.error("Error during scroll processing:", error);
      }
      
      totalScrolls++;

      if (allUsernames.size === lastCount) {
        stablePasses++;
        console.log(`No new users found (${stablePasses}/5)`);
      } else {
        stablePasses = 0;
        lastCount = allUsernames.size;
        console.log(`Found ${allUsernames.size} users so far`);
      }

      if (stablePasses >= 5 || totalScrolls >= 50) {
        clearInterval(interval);
        console.log(`✅ Finished scrolling followers after ${totalScrolls} scrolls`);
        resolve(Array.from(allUsernames));
      }
    }, 1000);
  });
}

let scrapeButtonInjected = false;

// Set up a mutation observer to watch for page changes and add our buttons
const observer = new MutationObserver(() => {
  const isTweetPage = window.location.href.includes("/status/");
  const isFollowersPage = window.location.href.endsWith("/followers");
  const isLikesPage = window.location.href.endsWith("/likes");

  // Add appropriate buttons based on the page type
  if (isTweetPage && !scrapeButtonInjected) {
    addScrapeButton();
    scrapeButtonInjected = true;
  }

  if (isFollowersPage && !document.getElementById("x-follower-btn")) {
    addScrapeFollowersButton();
  }

  // If we just got redirected to the likes page and it was a manual redirect,
  // automatically click the scrape button
  if (isLikesPage && manuallyTriggeredRedirect) {
    manuallyTriggeredRedirect = false; // Reset the flag
    
    // Small delay to ensure the page is fully loaded
    setTimeout(() => {
      const scrapeBtn = document.getElementById("x-scrape-btn");
      if (scrapeBtn) {
        console.log("🔄 Auto-clicking Scrape Likers button after manual redirect");
        scrapeBtn.click();
      }
    }, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Add some helpful logging
console.log("✅ X-Scraper content script loaded", {
  url: window.location.href,
  isTweetPage: window.location.href.includes("/status/"),
  isFollowersPage: window.location.href.endsWith("/followers"),
  isLikesPage: window.location.href.endsWith("/likes")
});