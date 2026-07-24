// ChatGPT specific content script
// Listens for postMessage from inject.js and forwards to background

window.addEventListener("message", (event) => {
  if (event.data?.type === "__COSTGUARD_USAGE__" && event.source === window) {
    chrome.runtime.sendMessage({
      type: "USAGE_DETECTED",
      data: event.data.data,
    });
  }
});
