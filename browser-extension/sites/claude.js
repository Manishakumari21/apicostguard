// Claude specific content script

window.addEventListener("message", (event) => {
  if (event.data?.type === "__COSTGUARD_USAGE__" && event.source === window) {
    chrome.runtime.sendMessage({
      type: "USAGE_DETECTED",
      data: event.data.data,
    });
  }
});
