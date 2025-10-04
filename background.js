// --- background.js ---

// 💡 IMPORT: Import from external modules
import { GEMINI_PROMPT_TEXT } from "./prompt.js";
import { languages } from "./languages.js";

// --- Global State ---
const activeTabs = new Set();
let lastCroppedImageDataByTab = {}; // Store image data by tab ID

// ==========================================================
// IMAGE AND API HANDLING
// ==========================================================

function cropImageOnCanvas(dataUrl, coords) {
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => createImageBitmap(blob))
    .then((imageBitmap) => {
      const canvas = new OffscreenCanvas(coords.width, coords.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imageBitmap, coords.x, coords.y, coords.width, coords.height, 0, 0, coords.width, coords.height);
      return canvas.convertToBlob({ type: "image/png" });
    })
    .then((croppedBlob) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(croppedBlob);
      });
    })
    .catch((error) => {
      console.error("Cropping failed:", error);
      throw error;
    });
}

function sendToBackend(tabId, imageData, prompt) {
  const apiEndpoint = "http://localhost:8080/process-image";

  fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_data: imageData, prompt: prompt }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => { throw new Error(`HTTP error! Status: ${response.status}. Message: ${text}`); });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Gemini Response Received:", data);
      const resultText = data.result_text || data.message || "No recognized code found or processing failed.";
      // The modal is already open, so we always just update it.
      browser.tabs.sendMessage(tabId, {
        command: "update_display",
        text: resultText,
      });
    })
    .catch((error) => {
      console.error("Error sending image to backend:", error);
      const errorMessage = `[NETWORK ERROR] Failed to connect to local server (http://localhost:8080). Details: ${error.message}`;
      // The modal is already open, so we always just update it.
      browser.tabs.sendMessage(tabId, {
        command: "update_display",
        text: errorMessage,
      });
    });
}

// ==========================================================
// EXTENSION CORE LOGIC
// ==========================================================

function startSelectionMode(tab) {
  const tabId = tab.id;
  if (activeTabs.has(tabId)) {
    browser.tabs.sendMessage(tabId, { command: "cancel_selection" }).catch((error) => {
      console.warn("Could not send cancel message, force-removing from activeTabs.", error);
      activeTabs.delete(tabId);
    });
  } else {
    browser.scripting.executeScript({ target: { tabId: tabId }, files: ["select.js"] })
      .then(() => browser.scripting.executeScript({ target: { tabId: tabId }, func: () => { document.body.style.cursor = "crosshair"; } }))
      .then(() => { activeTabs.add(tabId); })
      .catch((error) => { console.error("Error injecting script:", error); });
  }
}

// ==========================================================
// EVENT LISTENERS
// ==========================================================

browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab.id;

  if (message.command === "screenshot_selected_area" || message.command === "selection_cancelled") {
    browser.scripting.executeScript({ target: { tabId: tabId }, func: () => { document.body.style.cursor = "default"; } });
    activeTabs.delete(tabId);
  }

  // --- Handle Initial Screenshot ---
  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;

    // Immediately show the modal with a loading state
    const langOptions = Object.keys(languages.language_configurations);
    browser.tabs.sendMessage(tabId, {
      command: "show_loading_modal",
      languages: langOptions,
    });

    browser.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => cropImageOnCanvas(dataUrl, coords))
      .then((croppedDataUrl) => {
        lastCroppedImageDataByTab[tabId] = croppedDataUrl;
        sendToBackend(tabId, croppedDataUrl, GEMINI_PROMPT_TEXT);
      })
      .catch((error) => {
        console.error("Error processing screenshot:", error);
        browser.tabs.sendMessage(tabId, {
          command: "update_display",
          text: `[ERROR] Failed to process screenshot: ${error.message}`,
        });
      });

    return true; // Indicates asynchronous response
  }

  // --- Handle Re-run OCR with a new language ---
  if (message.command === "rerun_ocr") {
    const { newLanguage } = message;
    const imageData = lastCroppedImageDataByTab[tabId];

    if (imageData && languages.language_configurations[newLanguage]) {
      const langConfig = languages.language_configurations[newLanguage];
      const policies = languages.fixed_policies;
      const newPrompt = `${policies.code_reconstruction_policy}\n\nVisual Processing Policies:\n- Indentation Inference: ${policies.visual_processing_policy.Indentation_Inference}\n- Line Number Filtering: ${policies.visual_processing_policy.Line_Number_Filtering}\n- Character Ambiguity Resolution Rules: ${JSON.stringify(policies.visual_processing_policy.Character_Ambiguity_Resolution, null, 2)}\n\nTarget Language Details:\n- Language: ${langConfig.target_language}\n- Cheatsheet: ${JSON.stringify(langConfig.language_cheatsheet, null, 2)}\n`;
      sendToBackend(tabId, imageData, newPrompt);
    } else {
      console.error(`Invalid language or missing image for re-run: ${newLanguage}`);
    }
    return true; // Indicates asynchronous response
  }
});

// Listen for toolbar icon click
browser.action.onClicked.addListener(startSelectionMode);

// Listen for keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-selection-mode") {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) startSelectionMode(tabs[0]);
    });
  }
});

// Cleanup when a tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
  delete lastCroppedImageDataByTab[tabId];
});
