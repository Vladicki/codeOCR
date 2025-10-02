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

// Listen for the user clicking the extension's toolbar icon
browser.browserAction.onClicked.addListener((tab) => {
  // Inject the content script (content.js) to start the selection UI
  browser.tabs
    .executeScript(tab.id, {
      file: "select.js",
    })
    .then(() => {
      // Set the body cursor for visual feedback while selecting
      browser.tabs.executeScript(tab.id, {
        code: "document.body.style.cursor = 'crosshair';",
      });
    })
    .catch((error) => {
      console.error("Error injecting script:", error);
    });
});
