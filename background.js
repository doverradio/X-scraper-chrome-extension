importScripts('lib/sqljs/sql-asm.js');

let latestLikers = [];

let db;

// Step 1: Initialize SQLite in memory
initSqlJs().then(SQL => {
  db = new SQL.Database();
  db.run("CREATE TABLE IF NOT EXISTS followers (handle TEXT PRIMARY KEY)");
  db.run("CREATE TABLE IF NOT EXISTS likers (handle TEXT PRIMARY KEY)");
  console.log("✅ SQLite initialized in background.");
});

// Step 2: Listen for insert, query, export requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!db) return true; // Keep service worker alive just in case

  if (msg.type === "INSERT_FOLLOWER") {
    const handle = msg.payload.handle;
    db.run("INSERT OR IGNORE INTO followers VALUES (?);", [handle]);
    console.log("📩 Inserted in background:", handle);
    return true;
  }

  if (msg.type === "GET_ALL_FOLLOWERS") {
    const stmt = db.prepare("SELECT handle FROM followers");
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject().handle);
    }
    stmt.free();
    sendResponse(results);
    return true;
  }

  if (msg.type === "EXPORT_DB") {
    const binaryArray = db.export();
    sendResponse(binaryArray);
    return true;
  }

  if (msg.type === "SET_LIKERS") {
    latestLikers = msg.payload.likers || [];

    db.run("DELETE FROM likers");
    const stmt = db.prepare("INSERT OR IGNORE INTO likers VALUES (?)");
    latestLikers.forEach(handle => stmt.run([handle]));
    stmt.free();

    console.log("💾 Stored likers in DB:", latestLikers.length);
    sendResponse(true); // <--- ✅ this is crucial for popup.js to continue
    return true;
  }



  if (msg.type === "GET_LIKERS") {
    const stmt = db.prepare("SELECT handle FROM likers");
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject().handle);
    }
    stmt.free();
    sendResponse(results);
    return true;
  }


  return true; // Fallback: keep service worker alive
});
