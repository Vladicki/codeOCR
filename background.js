// --- background.js (FINAL ROBUST VERSION) ---

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
 * Sends the Base64 image data to the Golang backend.
 */
function sendImageToBackend(dataUrl) {
  const apiEndpoint = "http://localhost:8080/process-image";

  fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_data: dataUrl,
      prompt: "Extract the code from this image and identify the language.",
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Gemini Response Received:", data);
      // ... (handle response)
    })
    .catch((error) => {
      console.error("Error sending image to backend:", error);
    });
}

// Listener for messages from the content script
browser.runtime.onMessage.addListener((message, sender) => {
  // Always reset the cursor on the tab after receiving a message
  browser.tabs.executeScript(sender.tab.id, {
    code: "document.body.style.cursor = 'default';",
  });

  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;

    // 1. Capture the entire visible tab
    browser.tabs
      .captureVisibleTab(sender.tab.windowId, {
        format: "png",
      })
      .then((dataUrl) => {
        // 2. Crop the image on the canvas
        return cropImageOnCanvas(dataUrl, coords);
      })
      .then((croppedDataUrl) => {
        // 3. Send the cropped Data URL to your Golang server
        sendImageToBackend(croppedDataUrl);
      })
      .catch((error) => {
        console.error("Error processing screenshot:", error);
      });

    return true;
  }

  // Handle the 'selection_cancelled' message from content.js (to reset cursor)
  if (message.command === "selection_cancelled") {
    console.log("Selection was cancelled by the user or was too small.");
  }
});

const activeTabs = new Set();

function startSelectionMode(tab) {
  if (activeTabs.has(tab.id)) {
    // If selection is already active, we want to cancel it.
    // We do this by sending a message to the content script in that tab.
    browser.tabs
      .sendMessage(tab.id, { command: "cancel_selection" })
      .catch((error) => {
        // If the content script is gone, just remove the tab from the set
        console.warn(
          "Could not send cancel message, force-removing from activeTabs.",
          error,
        );
        activeTabs.delete(tab.id);
      });
  } else {
    // If selection is NOT active, start it

    // 1. Inject the content script (select.js) to start the selection UI
    browser.tabs
      .executeScript(tab.id, {
        file: "select.js",
      })
      .then(() => {
        // 2. Set the body cursor for visual feedback
        browser.tabs.executeScript(tab.id, {
          code: "document.body.style.cursor = 'crosshair';",
        });
        // 3. Add the tab to the active set
        activeTabs.add(tab.id);
      })
      .catch((error) => {
        console.error("Error injecting script:", error);
      });
  }
}

// Listener for messages from the content script
browser.runtime.onMessage.addListener((message, sender) => {
  // ... (Your existing logic for cropping and sending to Go backend remains here) ...

  // Always reset the cursor on the tab after receiving a message
  browser.tabs.executeScript(sender.tab.id, {
    code: "document.body.style.cursor = 'default';",
  });

  // 🚨 Critical: Remove tab from the set when selection is finished or cancelled
  if (
    sender.tab &&
    sender.tab.id &&
    (message.command === "screenshot_selected_area" ||
      message.command === "selection_cancelled")
  ) {
    activeTabs.delete(sender.tab.id);
  }

  if (message.command === "screenshot_selected_area") {
    // ... (rest of your cropping/sending logic) ...
    return true;
  }

  if (message.command === "selection_cancelled") {
    console.log("Selection was cancelled by the user or was too small.");
  }
});

// 1. Listen for the user clicking the extension's toolbar icon
browser.browserAction.onClicked.addListener(startSelectionMode);

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

// 🚨 CLEANUP: Remove tabs from the set when they are closed
browser.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
