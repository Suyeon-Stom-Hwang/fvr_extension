chrome.runtime.onInstalled.addListener(async () => {
  const manifest = chrome.runtime.getManifest();
  if (manifest.content_scripts) {
    for (const cs of manifest.content_scripts) {
      for (const tab of await chrome.tabs.query({ url: cs.matches })) {
        if (tab.url && tab.url.match(/(chrome|chrome-extension):\/\//gi)) {
          continue;
        }
        if (tab.id && cs.all_frames) {
          const target = { tabId: tab.id, allFrames: cs.all_frames };
          if (cs.js && cs.js[0])
            chrome.scripting.executeScript({
              files: cs.js,
              injectImmediately: cs.run_at === "document_start",
              target,
            });
          if (cs.css && cs.css[0])
            chrome.scripting.insertCSS({
              files: cs.css,
              target,
            });
        }
      }
    }
  }

  console.log("Extension Installed:", manifest.version);
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.action === "startLog" || message.action === "endLog") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Ensure the content script is injected before sending a message
        chrome.scripting
          .executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"],
          })
          .then(() => {
            try {
              if (tabs[0].id !== undefined) {
                chrome.tabs.sendMessage(tabs[0].id, message);
              }
            } catch (error) {
              console.error("Could not send message to content script:", error);
            }
          })
          .catch((error) => {
            console.error("Error injecting content script:", error);
          });
      }
    });
  } else if (message.action === "getLogs") {
    // Retrieve stored logs
    chrome.storage.local.get("logs", (data) => {
      sendResponse(data.logs || []);
    });
    return true; // Keeps the response channel open for async responses
  } else if (message.action === "getUserDifficultWords") {
    // Retrieve stored difficult words
    console.log("Getting difficult words");
    sendResponse(["announce", "inflation"]);
    // chrome.storage.local.get("difficultWords", (data) => {
    //   sendResponse(data.difficultWords || []);
    // });
    return true; // Keeps the response channel open for async responses
  } else if (message.action === "addDifficultWord") {
    // Store difficult words
    // chrome.storage.local.set({ difficultWords: message.difficultWords });
  } else if (message.action === "removeDifficultWord") {
    // Store difficult words
    // chrome.storage.local.set({ difficultWords: message.difficultWords });
  } else {
    console.log("Unknown message action:", message.action);
  }
});
