// --- content.js ---

let overlay;
let selectionDiv;
let isSelecting = false;
let startX, startY;

function createUI() {
  // 1. Create the dark overlay
  overlay = document.createElement("div");
  overlay.id = "codeocr-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // Darker background
  overlay.style.zIndex = "999999";
  document.body.appendChild(overlay);

  // 2. Create the visible selection box (lighter area)
  selectionDiv = document.createElement("div");
  selectionDiv.id = "codeocr-selection";
  selectionDiv.style.position = "absolute";
  selectionDiv.style.backgroundColor = "rgba(255, 255, 255, 0.1)"; // Lighter/transparent area
  selectionDiv.style.border = "2px dashed red"; // Red border for contrast
  selectionDiv.style.boxShadow = "0 0 0 9999px rgba(0, 0, 0, 0.5)"; // Simulates a 'hole' in the overlay
  selectionDiv.style.cursor = "crosshair";
  overlay.appendChild(selectionDiv);

  // 3. Attach event listeners
  overlay.addEventListener("mousedown", startSelection);
  overlay.addEventListener("mousemove", updateSelection);
  overlay.addEventListener("mouseup", endSelection);
}

function startSelection(e) {
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  // Position the selection div at the starting point
  selectionDiv.style.left = `${startX}px`;
  selectionDiv.style.top = `${startY}px`;
  selectionDiv.style.width = "0";
  selectionDiv.style.height = "0";
  e.preventDefault();
}

function updateSelection(e) {
  if (!isSelecting) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Calculate the new top-left corner (handles dragging up or left)
  const newX = Math.min(currentX, startX);
  const newY = Math.min(currentY, startY);

  // Update the visual selection area
  selectionDiv.style.left = `${newX}px`;
  selectionDiv.style.top = `${newY}px`;
  selectionDiv.style.width = `${width}px`;
  selectionDiv.style.height = `${height}px`;
}

function endSelection(e) {
  if (!isSelecting) return;
  isSelecting = false;

  const endX = e.clientX;
  const endY = e.clientY;

  // Calculate final coordinates relative to the viewport
  const coords = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };

  // Remove the selection UI
  overlay.remove();

  // Check if a meaningful area was selected (e.g., at least 5x5 pixels)
  if (coords.width > 5 && coords.height > 5) {
    // Send the coordinates back to the background script
    browser.runtime.sendMessage({
      command: "screenshot_selected_area",
      coords: coords,
    });
  } else {
    // If the selection was too small, cancel the operation
    console.log("Selection canceled: area was too small.");
    browser.runtime.sendMessage({ command: "selection_cancelled" });
  }
}

// Start the selection process when the script is injected
createUI();
