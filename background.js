chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "analyzeJob") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ["content.js"]
    });
  }
});
