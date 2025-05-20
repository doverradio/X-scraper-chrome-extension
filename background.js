importScripts('lib/sqljs/sql-asm.js');

let latestLikers = [];

let db;

// Step 1: Initialize SQLite in memory
initSqlJs().then(SQL => {
  db = new SQL.Database();
  db.run("CREATE TABLE IF NOT EXISTS followers (handle TEXT PRIMARY KEY)");
  console.log("✅ SQLite initialized in background.");
});

// Step 2: Listen for insert, query, export requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!db) return;

  if (msg.type === "INSERT_FOLLOWER") {
    const handle = msg.payload.handle;
    db.run("INSERT OR IGNORE INTO followers VALUES (?);", [handle]);
    console.log("📩 Inserted in background:", handle);
  }

  if (msg.type === "GET_ALL_FOLLOWERS") {
    const stmt = db.prepare("SELECT handle FROM followers");
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject().handle);
    }
    stmt.free();
    sendResponse(results);
    return true; // mark as async
  }

  if (msg.type === "EXPORT_DB") {
    const binaryArray = db.export();
    sendResponse(binaryArray);
    return true; // mark as async
  }

  if (msg.type === "SET_LIKERS") {
    latestLikers = msg.payload.likers || [];
    console.log("💾 Stored likers in memory:", latestLikers.length);
  }

  if (msg.type === "GET_LIKERS") {
    sendResponse(latestLikers);
  }
  
});
