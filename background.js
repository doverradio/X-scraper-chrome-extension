importScripts('lib/sqljs/sql-asm.js');

let latestLikers = [];
let allLatestLikers = [];

let db;

// Initialize SQLite in memory
initSqlJs().then(SQL => {
  db = new SQL.Database();
  db.run("CREATE TABLE IF NOT EXISTS followers (handle TEXT PRIMARY KEY)");
  db.run("CREATE TABLE IF NOT EXISTS likers (handle TEXT PRIMARY KEY)");
  db.run("CREATE TABLE IF NOT EXISTS all_likers (handle TEXT PRIMARY KEY)");
  console.log("✅ SQLite initialized in background.");
}).catch(error => {
  console.error("❌ Failed to initialize SQLite:", error);
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📩 Background received message:", msg.type);
  
  if (!db) {
    console.error("❌ Database not initialized");
    sendResponse(null);
    return true;
  }

  try {
    if (msg.type === "INSERT_FOLLOWER") {
      const handle = msg.payload.handle;
      db.run("INSERT OR IGNORE INTO followers VALUES (?);", [handle]);
      console.log("📩 Inserted follower in background:", handle);
      sendResponse(true);
      return true;
    }

    if (msg.type === "GET_ALL_FOLLOWERS") {
      const stmt = db.prepare("SELECT handle FROM followers");
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject().handle);
      }
      stmt.free();
      console.log("📤 Returning followers:", results.length);
      sendResponse(results);
      return true;
    }

    if (msg.type === "EXPORT_DB") {
      const binaryArray = db.export();
      sendResponse(binaryArray);
      return true;
    }

    if (msg.type === "SET_LIKERS") {
      const mutuals = msg.payload.mutuals || [];
      const allLikers = msg.payload.allLikers || [];

      console.log("💾 Storing likers:", { mutuals: mutuals.length, allLikers: allLikers.length });

      // Store mutuals (people who liked and follow you)
      latestLikers = mutuals;
      db.run("DELETE FROM likers");
      const mutualStmt = db.prepare("INSERT OR IGNORE INTO likers VALUES (?)");
      latestLikers.forEach(handle => {
        mutualStmt.run([handle]);
      });
      mutualStmt.free();

      // Store all likers (everyone who liked the post)
      allLatestLikers = allLikers;
      db.run("DELETE FROM all_likers");
      const allStmt = db.prepare("INSERT OR IGNORE INTO all_likers VALUES (?)");
      allLatestLikers.forEach(handle => {
        allStmt.run([handle]);
      });
      allStmt.free();

      console.log("✅ Stored in DB:", mutuals.length, "mutuals and", allLikers.length, "total likers");
      sendResponse(true);
      return true;
    }

    if (msg.type === "GET_LIKERS") {
      console.log("📤 GET_LIKERS request received");
      const stmt = db.prepare("SELECT handle FROM likers");
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject().handle);
      }
      stmt.free();
      console.log("📤 Returning mutual likers:", results.length);
      sendResponse(results);
      return true;
    }

    if (msg.type === "GET_ALL_LIKERS") {
      console.log("📤 GET_ALL_LIKERS request received");
      const stmt = db.prepare("SELECT handle FROM all_likers");
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject().handle);
      }
      stmt.free();
      console.log("📤 Returning all likers:", results.length);
      sendResponse(results);
      return true;
    }

    console.log("❓ Unknown message type:", msg.type);
    sendResponse(null);
    
  } catch (error) {
    console.error("❌ Error in background script:", error);
    sendResponse(null);
  }
  
  return true;
});