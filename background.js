// --- background.js ---

// Function to handle the cropping and saving
function cropAndDownload(dataUrl, coords) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas size to the selected area dimensions
    canvas.width = coords.width;
    canvas.height = coords.height;

    // Draw the image onto the canvas, starting the crop from (coords.x, coords.y)
    ctx.drawImage(
      img,
      coords.x,
      coords.y,
      coords.width,
      coords.height,
      0,
      0,
      coords.width,
      coords.height,
    );

    // Get the cropped image data URL
    const croppedDataUrl = canvas.toDataURL("image/png");

    // Use the browser.downloads API to save the file
    const filename = `codeOCR_screenshot_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;

    browser.downloads
      .download({
        url: croppedDataUrl,
        filename: `screenshots/${filename}`, // This suggests a folder, but browsers often ignore the path and save to default.
        saveAs: false, // Download directly without prompting for a filename
      })
      .then(() => {
        console.log(`Screenshot saved: ${filename}`);
        // This is where you would proceed to the Gemini API call using the croppedDataUrl
      })
      .catch((error) => {
        console.error("Download failed:", error);
      });
  };
  img.src = dataUrl;
}

// Listener for messages from the content script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.command === "screenshot_selected_area") {
    const coords = message.coords;

    // 1. Capture the entire visible tab
    browser.tabs
      .captureVisibleTab(sender.tab.windowId, {
        format: "png", // PNG is lossless, better for code text
      })
      .then((dataUrl) => {
        // 2. Crop and download the image
        cropAndDownload(dataUrl, coords);
      })
      .catch((error) => {
        console.error("Error capturing visible tab:", error);
      });
  }
  // Remove the cursor change when selection is complete
  browser.tabs.executeScript(sender.tab.id, {
    code: "document.body.style.cursor = 'default';",
  });
});

// Listen for the user clicking the extension's toolbar icon
browser.browserAction.onClicked.addListener((tab) => {
  // Inject the content script for selection UI
  browser.tabs
    .executeScript(tab.id, {
      file: "content.js",
    })
    .then(() => {
      // Set the body cursor for visual feedback
      browser.tabs.executeScript(tab.id, {
        code: "document.body.style.cursor = 'crosshair';",
      });
    })
    .catch((error) => {
      console.error("Error injecting script:", error);
    });
});
