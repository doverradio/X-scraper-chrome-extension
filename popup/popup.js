console.log("🚀 popup.js loaded");

// UI elements
const initBtn = document.getElementById("init");
const addBtn = document.getElementById("add");
const listBtn = document.getElementById("list");
const exportBtn = document.getElementById("export");
const output = document.getElementById("output");

function log(msg) {
  output.textContent = msg;
}

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
    log(`📋 All followers:\n${followers.join("\n")}`);
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
document.getElementById("pick-mutual").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_LIKERS" }, (likers) => {
    if (!likers || likers.length === 0) {
      return log("⚠️ No likers found. Scrape a /likes page first.");
    }

    chrome.runtime.sendMessage({ type: "GET_ALL_FOLLOWERS" }, (followers) => {
      if (!followers) return log("⚠️ Failed to load followers from DB.");

      const mutuals = likers.filter(liker => followers.includes(liker));
      if (mutuals.length === 0) {
        return log("😢 No mutuals found.");
      }

      const random = mutuals[Math.floor(Math.random() * mutuals.length)];
      navigator.clipboard.writeText(random).then(() => {
        log(`📋 Copied to clipboard:\n${random}\n\nTotal mutuals: ${mutuals.length}`);
      }).catch(err => {
        log(`🎯 Random mutual: ${random}\n⚠️ Failed to copy to clipboard.`);
      });
    });
  });
});



