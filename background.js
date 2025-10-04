// --- background.js ---

// 💡 IMPORT: Import from external modules
import { GEMINI_PROMPT_TEXT } from "./prompt.js";
import { languages } from "./languages.js";
import { lang } from "./langs.js";

// --- Global State ---
const activeTabs = new Set();
let lastCroppedImageDataByTab = {}; // Store image data by tab ID

// ==========================================================
// HELPER FUNCTIONS
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
    .catch((error) => { console.error("Cropping failed:", error); throw error; });
}

function sendToBackend(tabId, imageData, prompt) {
  const apiEndpoint = "http://localhost:8080/process-image";
  fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_data: imageData, prompt: prompt }),
  })
    .then(response => {
      if (!response.ok) return response.text().then(text => { throw new Error(`HTTP error! Status: ${response.status}. Message: ${text}`); });
      return response.json();
    })
    .then(data => {
      const resultText = data.result_text || data.message || "Processing failed.";
      browser.tabs.sendMessage(tabId, { command: "update_display", text: resultText });
    })
    .catch(error => {
      const errorMessage = `[NETWORK ERROR] Failed to connect to backend. Details: ${error.message}`;
      browser.tabs.sendMessage(tabId, { command: "update_display", text: errorMessage });
    });
}

function constructPromptForLanguage(language) {
    const langConfig = languages.language_configurations[language];
    if (!langConfig) return GEMINI_PROMPT_TEXT; // Fallback

    const policies = languages.fixed_policies;
    return `${policies.code_reconstruction_policy}\n\nVisual Processing Policies:\n- Indentation Inference: ${policies.visual_processing_policy.Indentation_Inference}\n- Line Number Filtering: ${policies.visual_processing_policy.Line_Number_Filtering}\n- Character Ambiguity Resolution Rules: ${JSON.stringify(policies.visual_processing_policy.Character_Ambiguity_Resolution, null, 2)}\n\nTarget Language Details:\n- Language: ${langConfig.target_language}\n- Cheatsheet: ${JSON.stringify(langConfig.language_cheatsheet, null, 2)}\n`;
}

// ==========================================================
// EXTENSION CORE LOGIC
// ==========================================================

function startSelectionMode(tab) {
  const tabId = tab.id;
  if (activeTabs.has(tabId)) {
    browser.tabs.sendMessage(tabId, { command: "cancel_selection" }).catch(() => activeTabs.delete(tabId));
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

  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;

    const langOptions = Object.keys(languages.language_configurations);
    browser.tabs.sendMessage(tabId, { command: "show_loading_modal", languages: langOptions, allLangs: lang });

    browser.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then(dataUrl => cropImageOnCanvas(dataUrl, coords))
      .then(async (croppedDataUrl) => {
        lastCroppedImageDataByTab[tabId] = croppedDataUrl;
        
        const settings = await browser.storage.local.get("codeocr_lang_preset");
        const langPreset = settings.codeocr_lang_preset;

        let prompt = GEMINI_PROMPT_TEXT;
        if (langPreset && langPreset !== "default") {
            prompt = constructPromptForLanguage(langPreset);
        }

        // Retrieve selected languages from storage
        const selectedLangsResult = await browser.storage.local.get("selectedLanguages");
        const selectedLanguages = selectedLangsResult.selectedLanguages || [];

        if (selectedLanguages.length > 0) {
            const langInfo = selectedLanguages.map(l => ({
                index: l.index,
                name: l.name,
                id: l.id
            }));
            prompt += `\n\nUser's potential languages: ${JSON.stringify(langInfo)}`;
        }

        sendToBackend(tabId, croppedDataUrl, prompt);
      })
      .catch(error => {
        browser.tabs.sendMessage(tabId, { command: "update_display", text: `[ERROR] Failed to process screenshot: ${error.message}` });
      });

    return true; // Indicates asynchronous response
  }

  if (message.command === "rerun_ocr") {
    const { newLanguage } = message;
    const imageData = lastCroppedImageDataByTab[tabId];
    if (imageData) {
      const prompt = constructPromptForLanguage(newLanguage);
      sendToBackend(tabId, imageData, prompt);
    } 
    return true;
  }
});

browser.action.onClicked.addListener(startSelectionMode);

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-selection-mode") {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) startSelectionMode(tabs[0]);
    });
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
  delete lastCroppedImageDataByTab[tabId];
});
