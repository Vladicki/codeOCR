// --- background.js ---

import { languages } from "./languages.js";
import { lang } from "./langs.js";
// const browser = this.browser || chrome;
// --- Global State ---
const activeTabs = new Set();
let lastCroppedImageDataByTab = {}; // Store image data by tab ID

// ==========================================================
// HELPER FUNCTIONS (PROMPT CONSTRUCTION)
// ==========================================================

function constructBasePrompt() {
  const policies = languages.fixed_policies;

  // Helper to format the Ambiguity Resolution Rules cleanly
  const ambiguityRules = Object.entries(
    policies.visual_processing_policy.Character_Ambiguity_Resolution,
  )
    .map(([key, value]) => `  - **${key}**: ${value}`)
    .join("\n");

  return `${policies.code_reconstruction_policy}

## VISUAL AND AMBIGUITY POLICIES
- **Indentation Inference**: ${policies.visual_processing_policy.Indentation_Inference}
- **Line Number Filtering**: ${policies.visual_processing_policy.Line_Number_Filtering}
- **Character Ambiguity Resolution**:
${ambiguityRules}

## NO SPECIFIC LANGUAGE CONTEXT PROVIDED
Please apply the general visual and reconstruction policies above to the screenshot and infer the code type based on common syntax.
`.trim();
}

function constructPromptForLanguage(language) {
  const langConfig = languages.language_configurations[language];

  // Fallback to base prompt if language is not found
  if (!langConfig || language === "default") {
    return constructBasePrompt();
  }

  const policies = languages.fixed_policies;
  const cheatsheet = langConfig.language_cheatsheet;

  // Format Cheatsheet into LLM-friendly bullet points (more efficient than JSON.stringify)
  let cheatsheetText = "";
  for (const [ruleName, ruleDescription] of Object.entries(cheatsheet)) {
    cheatsheetText += `- **${ruleName}**: ${ruleDescription}\n`;
  }

  // Helper to format the Ambiguity Resolution Rules cleanly
  const ambiguityRules = Object.entries(
    policies.visual_processing_policy.Character_Ambiguity_Resolution,
  )
    .map(([key, value]) => `  - **${key}**: ${value}`)
    .join("\n");

  // Construct the full prompt
  return `${policies.code_reconstruction_policy}

## VISUAL AND AMBIGUITY POLICIES
- **Indentation Inference**: ${policies.visual_processing_policy.Indentation_Inference}
- **Line Number Filtering**: ${policies.visual_processing_policy.Line_Number_Filtering}
- **Character Ambiguity Resolution**:
${ambiguityRules}

## TARGET LANGUAGE: ${langConfig.target_language}
**Specific Syntax Rules (Cheatsheet):**
${cheatsheetText}
`.trim();
}

// ==========================================================
// HELPER FUNCTIONS (IMAGE AND NETWORK)
// ==========================================================

function cropImageOnCanvas(dataUrl, coords) {
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => createImageBitmap(blob))
    .then((imageBitmap) => {
      const canvas = new OffscreenCanvas(coords.width, coords.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        imageBitmap,
        coords.x,
        coords.y,
        coords.width,
        coords.height,
        0,
        0,
        coords.width,
        coords.height,
      );
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
  // Local ENDPOINT
  //const apiEndpoint = "http://localhost:8080/process-image";
  // set server API endpoint to your deployed domain
  const apiEndpoint = "https://codeocr.vladika.net/process-image";
  // const EXTENSION_ID = chrome.runtime.id; // ← auto-filled by Firefox

  fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-ID": chrome.runtime.id,
    },
    body: JSON.stringify({ image_data: imageData, prompt: prompt }),
  })
    .then((response) => {
      // Check for non-OK status codes (4xx or 5xx)
      if (!response.ok) {
        // Log the full error to the BACKGROUND CONSOLE for debugging
        console.error(
          `Backend Request Failed: Status ${response.status}`,
          response,
        );

        // For the user, throw a generic error message based on status
        if (response.status === 403) {
          // Specific message for Forbidden error (e.g., ID mismatch)
          throw new Error("SERVER_ERROR: Authentication failed.");
        } else if (response.status >= 500) {
          // Generic message for server issues (5xx)
          throw new Error("SERVER_ERROR: Internal server problem.");
        } else {
          // Generic message for other client errors (4xx like 400, 404)
          throw new Error("SERVER_ERROR: Request failed.");
        }
      }
      return response.json();
    })
    .then((data) => {
      const resultText =
        data.result_text || data.message || "Processing failed.";
      chrome.tabs.sendMessage(tabId, {
        command: "update_display",
        text: resultText,
      });
    })
    .catch((error) => {
      // Determine the message shown to the user
      let userMessage;

      // Check for network connectivity issues (e.g., CORS, DNS, server down)
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("CORS")
      ) {
        userMessage =
          "Failed to connect to proxy server. Check server status or CORS settings.";
      } else if (error.message.startsWith("SERVER_ERROR:")) {
        // Use the generic error thrown above (e.g., "SERVER_ERROR: Authentication failed.")
        userMessage = "Failed to connect to proxy server.";
        // We strip the details for the user, as requested.
      } else {
        // Catch-all for unexpected local errors
        userMessage = `[EXTENSION ERROR] An unexpected issue occurred. Details: ${error.message}`;
      }

      // Log the full error for extension developer reference
      console.error("Client Error Handling:", error);

      // Send the generic user-friendly message
      chrome.tabs.sendMessage(tabId, {
        command: "update_display",
        text: userMessage,
      });
    });
}

// ==========================================================
// EXTENSION CORE LOGIC
// ==========================================================

function startSelectionMode(tab) {
  const tabId = tab.id;
  if (activeTabs.has(tabId)) {
    chrome.tabs
      .sendMessage(tabId, { command: "cancel_selection" })
      .catch(() => activeTabs.delete(tabId));
  } else {
    chrome.scripting
      .executeScript({ target: { tabId: tabId }, files: ["select.js"] })
      .then(() =>
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            document.body.style.cursor = "crosshair";
          },
        }),
      )
      .then(() => {
        activeTabs.add(tabId);
      })
      .catch((error) => {
        console.error("Error injecting script:", error);
      });
  }
}

// ==========================================================
// EVENT LISTENERS
// ==========================================================

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab.id;

  if (
    message.command === "screenshot_selected_area" ||
    message.command === "selection_cancelled"
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        document.body.style.cursor = "default";
      },
    });
    activeTabs.delete(tabId);
  }

  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;
    const langOptions = Object.keys(languages.language_configurations);

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['display.js']
    }).then(() => {
        chrome.tabs.sendMessage(tabId, {
            command: "show_loading_modal",
            languages: langOptions,
            allLangs: lang,
        });

        chrome.tabs
            .captureVisibleTab(sender.tab.windowId, { format: "png" })
            .then((dataUrl) => cropImageOnCanvas(dataUrl, coords))
            .then(async (croppedDataUrl) => {
                lastCroppedImageDataByTab[tabId] = croppedDataUrl;

                const settings = await chrome.storage.local.get("codeocr_lang_preset");
                const langPreset = settings.codeocr_lang_preset;

                // Use the new optimized prompt construction logic
                let prompt = constructPromptForLanguage(langPreset || "default"); // Retrieve selected languages from storage

                const selectedLangsResult =
                    await chrome.storage.local.get("selectedLanguages");
                const selectedLanguages = selectedLangsResult.selectedLanguages || [];

                if (selectedLanguages.length > 0) {
                    const langInfo = selectedLanguages.map((l) => ({
                        index: l.index,
                        name: l.name,
                        id: l.id,
                    }));
                    prompt += `\n\nUser\'s potential languages: ${JSON.stringify(langInfo)}`;
                }

                sendToBackend(tabId, croppedDataUrl, prompt);
            })
            .catch((error) => {
                chrome.tabs.sendMessage(tabId, {
                    command: "update_display",
                    text: `[ERROR] Failed to process screenshot: ${error.message}`,
                });
            });
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

chrome.action.onClicked.addListener(startSelectionMode);

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-selection-mode") {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) startSelectionMode(tabs[0]);
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
  delete lastCroppedImageDataByTab[tabId];
});
