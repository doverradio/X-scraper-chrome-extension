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

function addScrapeButton() {
  if (document.getElementById("x-scrape-btn")) return;

  const btn = document.createElement("button");
  btn.id = "x-scrape-btn";
  btn.innerText = "Scrape Likers";
  btn.style.position = "fixed";
  btn.style.top = "80px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 15px";
  btn.style.background = "#1d9bf0";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";

  btn.onclick = async () => {
    if (!window.location.href.endsWith("/likes")) {
      alert("Navigate to your tweet's /likes URL first, then click 'Scrape Likers'.");
      return;
    }

    console.log("Scraping likers from /likes view...");
    await autoScrollLikesPage();

    const usernames = Array.from(document.querySelectorAll('div[dir="ltr"] > span'))
      .map(el => el.textContent)
      .filter(username => username.startsWith("@"));

    console.log("Scraped usernames:", usernames);
    window.likers = usernames; // store for mutual comparison
    chrome.runtime.sendMessage({
        type: "SET_LIKERS",
        payload: { likers: usernames }
    });

    alert(`Scraped ${usernames.length} likers. Check console.`);
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
    const followers = await autoScrollFollowersPage();

    console.log("Scraped followers:", followers);
    window.myFollowers = followers;
    alert(`Scraped ${followers.length} followers. Check console.`);
  };

  document.body.appendChild(btn);
}

async function autoScrollLikesPage() {
  return new Promise(resolve => {
    const scrollContainer = document.querySelector('main');
    let lastHeight = 0;
    const interval = setInterval(() => {
      scrollContainer.scrollBy(0, 1000);
      const currentHeight = scrollContainer.scrollHeight;
      if (currentHeight === lastHeight) {
        clearInterval(interval);
        resolve();
      }
      lastHeight = currentHeight;
    }, 250);
  });
}

async function autoScrollFollowersPage() {
  const usernames = new Set();
  let lastCount = 0;
  let stablePasses = 0;

  return new Promise(resolve => {
    const interval = setInterval(() => {
      const rows = document.querySelectorAll('div[data-testid="UserCell"]');

      rows.forEach(row => {
        const handleSpan = row.querySelector('span');
        if (handleSpan) {
          const handle = handleSpan.textContent.trim();
          if (handle.startsWith("@")) {
            usernames.add(handle);
          }
        }
      });

      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        lastRow.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      if (usernames.size === lastCount) {
        stablePasses++;
      } else {
        stablePasses = 0;
        lastCount = usernames.size;
      }

      if (stablePasses >= 5) {
        clearInterval(interval);
        resolve(Array.from(usernames));
      }
    }, 800);
  });
}

let scrapeButtonInjected = false;

const observer = new MutationObserver(() => {
  const isTweetPage = window.location.href.includes("/status/");
  const isFollowersPage = window.location.href.endsWith("/followers");

  if (isTweetPage && !scrapeButtonInjected) {
    addScrapeButton();
    scrapeButtonInjected = true;
  }

  if (isFollowersPage && !document.getElementById("x-follower-btn")) {
    addScrapeFollowersButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
