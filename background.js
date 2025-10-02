// --- background.js (V3: Action, Scripting, and Display Logic) 🚀 ---

// 💡 IMPORT: Import the prompt text from the external module
import { GEMINI_PROMPT_TEXT } from "./prompt.js";

/**
 * Uses Fetch, createImageBitmap, and OffscreenCanvas for the most reliable,
 * in-memory cropping in a browser extension context.
 * It takes the full screenshot Data URL and the document-relative coordinates.
 */
function cropImageOnCanvas(dataUrl, coords) {
  // 1. Convert the Data URL (Base64) to a Blob object
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => {
      // 2. Create an ImageBitmap from the Blob
      return createImageBitmap(blob);
    })
    .then((imageBitmap) => {
      // 3. Use OffscreenCanvas for efficient background processing
      const canvas = new OffscreenCanvas(coords.width, coords.height);
      const ctx = canvas.getContext("2d");

      // 4. Draw only the selected portion of the ImageBitmap
      // Source: (x, y, width, height) from the captured image
      // Destination: (0, 0, width, height) of the new canvas
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

      // 5. Convert the cropped canvas data to a Blob using the modern API
      return canvas.convertToBlob({ type: "image/png" });
    })
    .then((croppedBlob) => {
      // 6. Read the Blob back as a Data URL (Base64 string)
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(croppedBlob);
      });
    })
    .catch((error) => {
      console.error("Cropping failed (Final API Check):", error);
      throw error;
    });
}

/**
 * Sends the Base64 image data to the Golang backend and displays the result.
 */
function sendImageToBackend(tabId, dataUrl) {
  const apiEndpoint = "http://localhost:8080/process-image";

  fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_data: dataUrl,
      // 💡 Using the imported constant here
      prompt: GEMINI_PROMPT_TEXT,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(
            `HTTP error! Status: ${response.status}. Message: ${text}`,
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Gemini Response Received:", data);

      // Ensure you use the key that your Go backend returns (result_text)
      const resultText =
        data.result_text ||
        data.message ||
        "No recognized code found or processing failed.";

      // Send the result to the display.js content script
      browser.tabs.sendMessage(tabId, {
        command: "display_result",
        text: resultText,
      });
    })
    .catch((error) => {
      console.error("Error sending image to backend:", error);
      // Display a user-friendly error message in the modal
      browser.tabs.sendMessage(tabId, {
        command: "display_result",
        text: `[NETWORK ERROR] Failed to connect to local server (http://localhost:8080). Ensure your Go application is running. Details: ${error.message}`,
      });
    });
}

const activeTabs = new Set();

/**
 * V3 Implementation to inject and manage the selection script.
 */
function startSelectionMode(tab) {
  const tabId = tab.id;

  if (activeTabs.has(tabId)) {
    // Cancel logic remains mostly the same
    browser.tabs
      .sendMessage(tabId, { command: "cancel_selection" })
      .catch((error) => {
        console.warn(
          "Could not send cancel message, force-removing from activeTabs.",
          error,
        );
        activeTabs.delete(tabId);
      });
  } else {
    // Start selection mode (V3 scripting API)

    // 1. Inject the content script (select.js)
    browser.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["select.js"], // V3 uses 'files'
      })
      .then(() => {
        // 2. Set the body cursor for visual feedback (V3 scripting API)
        return browser.scripting.executeScript({
          target: { tabId: tabId },
          // V3 often prefers 'func' for inline code execution
          func: () => {
            document.body.style.cursor = "crosshair";
          },
        });
      })
      .then(() => {
        // 3. Add the tab to the active set
        activeTabs.add(tabId);
      })
      .catch((error) => {
        console.error("Error injecting script:", error);
      });
  }
}

// Listener for messages from the content script
browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab.id;

  // 1. Always reset the cursor on the tab after receiving a message (V3 scripting API)
  browser.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      document.body.style.cursor = "default";
    },
  });

  // 2. Critical: Remove tab from the set when selection is finished or cancelled
  if (
    message.command === "screenshot_selected_area" ||
    message.command === "selection_cancelled"
  ) {
    activeTabs.delete(tabId);
  }

  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;

    // 3. Capture the entire visible tab
    browser.tabs
      .captureVisibleTab(sender.tab.windowId, {
        format: "png",
      })
      .then((dataUrl) => {
        // 4. Crop the image on the canvas
        return cropImageOnCanvas(dataUrl, coords);
      })
      .then((croppedDataUrl) => {
        // 5. Send the cropped Data URL to your Golang server
        sendImageToBackend(tabId, croppedDataUrl); // Pass tabId for display later
      })
      .catch((error) => {
        console.error("Error processing screenshot:", error);
      });

    return true; // Indicates asynchronous response
  }
});

// 1. Listen for the user clicking the extension's toolbar icon (V3: browser.action)
browser.action.onClicked.addListener(startSelectionMode);

// 2. LISTEN FOR THE KEYBOARD COMMAND (Alt+C)
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-selection-mode") {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        startSelectionMode(tabs[0]);
      }
    });
  }
});

// 3. CLEANUP: Remove tabs from the set when they are closed
browser.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
