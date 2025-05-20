(function () {
  if (window._followerSnifferInjected) return;
  window._followerSnifferInjected = true;

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (url.includes("/Followers?") && url.includes("/graphql/")) {
      this.addEventListener("load", function () {
        try {
          const json = JSON.parse(this.responseText);

          const entries = json?.data?.user?.result?.timeline?.timeline?.instructions
            ?.flatMap(inst => inst.entries || []) || [];

          const handles = entries
            .map(entry => entry?.content?.itemContent?.user_results?.result?.legacy?.screen_name)
            .filter(Boolean)
            .map(h => "@" + h);

          if (handles.length > 0) {
            window.postMessage({
              source: "follower-sniffer",
              handles
            }, "*");
          }
        } catch (e) {
          console.warn("❌ Failed to parse /Followers XHR:", e);
        }
      });
    }

    return originalOpen.apply(this, arguments);
  };

  console.log("✅ Injected follower sniffer (page context).");
})();
