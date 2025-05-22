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

// ✅ Redirect logic - only for moving from tweet to /likes
let redirected = false;

// This function will only be called when we need to redirect to /likes
const triggerRedirectToLikes = () => {
  if (redirected) return false;
  
  const tweetUrlMatch = window.location.pathname.match(/^\/[^/]+\/status\/\d+$/);
  if (tweetUrlMatch && !window.location.pathname.endsWith("/likes")) {
    redirected = true;
    const likesUrl = window.location.pathname + "/likes";
    console.log("➡️ Redirecting to likes page:", likesUrl);
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
    const currentUrl = window.location.href;
    console.log("🔘 Button clicked on URL:", currentUrl);
    
    // Check if we're already on a /likes page
    if (currentUrl.endsWith("/likes")) {
      // We're on the likes page, start scraping immediately
      console.log("🔄 Starting to scrape likers from /likes view...");
      btn.innerText = "Scrolling...";
      btn.disabled = true;
      
      try {
        // Now autoScrollLikesPage returns both mutuals and all likers
        const scrapedData = await autoScrollLikesPage();
        console.log("✅ Finished scrolling, collected data:", scrapedData);
        
        // Store both sets of data globally for backup
        window.mutualLikers = scrapedData.mutuals;
        window.allLikers = scrapedData.allLikers;

        // Check if extension context is available
        console.log("🔍 Checking extension context...");
        if (!chrome.runtime || !chrome.runtime.id) {
          console.error("❌ Extension context is not available");
          alert(`Scraped ${scrapedData.mutuals.length} mutual likers and ${scrapedData.allLikers.length} total likers, but cannot save to extension. Data is available in console as window.mutualLikers and window.allLikers.`);
          return;
        }

        console.log("📤 Attempting to send data to background script...");
        
        // Simple timeout-based approach instead of complex retry logic
        const sendDataWithTimeout = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("Timeout after 10 seconds"));
            }, 10000);
            
            try {
              chrome.runtime.sendMessage(
                {
                  type: "SET_LIKERS",
                  payload: { 
                    mutuals: scrapedData.mutuals,
                    allLikers: scrapedData.allLikers
                  }
                },
                (response) => {
                  clearTimeout(timeoutId);
                  
                  if (chrome.runtime.lastError) {
                    console.error("❌ Runtime error:", chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    console.log("✅ Successfully sent data to background");
                    resolve(response);
                  }
                }
              );
            } catch (error) {
              clearTimeout(timeoutId);
              reject(error);
            }
          });
        };
        
        try {
          await sendDataWithTimeout();
          alert(`✅ Success! Scraped ${scrapedData.mutuals.length} mutual likers and ${scrapedData.allLikers.length} total likers.`);
        } catch (error) {
          console.error("❌ Failed to send data:", error);
          alert(`⚠️ Scraped ${scrapedData.mutuals.length} mutual likers and ${scrapedData.allLikers.length} total likers, but failed to save. Data is available in console as window.mutualLikers and window.allLikers.\n\nError: ${error.message}`);
        }
        
      } catch (error) {
        console.error("❌ Error during scraping:", error);
        alert("Error during scraping. Check console for details.");
      } finally {
        // Reset button text - we know we're on a likes page
        btn.innerText = "Begin Scrape";
        btn.style.background = "#17bf63";
        btn.disabled = false;
      }
      
    } else {
      // We're NOT on a likes page, so redirect first
      console.log("🔄 Not on likes page, redirecting...");
      const wasRedirected = triggerRedirectToLikes();
      if (wasRedirected) {
        // Successfully triggered redirect, the page will reload
        return;
      } else {
        // Couldn't redirect for some reason
        alert("Unable to redirect to likes page. Please navigate to the tweet's /likes URL manually and try again.");
        return;
      }
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
  
  // Keep track of mutuals AND all likers while scrolling
  const mutualHandles = new Set();
  const allLikerHandles = new Set();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      // Collect current likers
      const likerCards = document.querySelectorAll('[data-testid="UserCell"]');
      
      likerCards.forEach(card => {
        // Find the handle first
        const spans = card.querySelectorAll('span');
        const handleSpan = Array.from(spans).find(span => 
          span.textContent && span.textContent.trim().startsWith("@")
        );
        
        if (handleSpan) {
          const handle = handleSpan.textContent.trim();
          
          // Add to all likers regardless
          allLikerHandles.add(handle);
          
          // Check if this user follows you (for mutuals)
          const followsYou = card.querySelector('[data-testid="userFollowIndicator"]');
          if (followsYou) {
            mutualHandles.add(handle);
          }
        }
      });
      
      console.log(`Found ${mutualHandles.size} mutual followers and ${allLikerHandles.size} total likers so far`);
      
      // Scroll down using multiple methods
      window.scrollTo(0, document.body.scrollHeight);
      scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
      scrollContainer.scrollBy(0, 1000);
      
      totalScrolls++;
      
      // Check if we've reached the bottom or if content is still loading
      const currentHeight = scrollContainer.scrollHeight;
      const currentUserCount = allLikerHandles.size; // Use all likers for progress tracking
      
      console.log(`Scroll attempt ${totalScrolls}, height: ${currentHeight}px, total likers: ${currentUserCount}`);

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
          console.log(`Total liker count changed: ${lastUserCount} → ${currentUserCount}`);
          lastUserCount = currentUserCount;
        }
      }

      // Stop conditions
      if ((unchangedPasses >= 6 || totalScrolls >= 75) && allLikerHandles.size > 0) {
        clearInterval(interval);
        console.log(`✅ Finished scrolling likes list after ${totalScrolls} scrolls. Found ${mutualHandles.size} mutual followers and ${allLikerHandles.size} total likers.`);
        
        // Return both sets of data
        resolve({
          mutuals: Array.from(mutualHandles),
          allLikers: Array.from(allLikerHandles)
        });
      }
    }, 1500);
  });
}

let scrapeButtonInjected = false;

// Set up a mutation observer to watch for page changes and add our buttons
const observer = new MutationObserver(() => {
  const isTweetPage = window.location.href.includes("/status/");

  // Reset button injection flag when navigating away from tweet pages
  if (!isTweetPage) {
    scrapeButtonInjected = false;
  }

  // Add appropriate buttons based on the page type
  if (isTweetPage && !scrapeButtonInjected) {
    addScrapeButton();
    scrapeButtonInjected = true;
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
  isLikesPage: window.location.href.endsWith("/likes")
});