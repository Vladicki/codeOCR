// --- select.js (FINAL REDESIGN WITH SCALING) ---

let overlay;
let selectionDiv;
let isSelecting = false;
let startX, startY;

// Function to create and attach the selection UI
function createUI() {
  overlay = document.createElement("div");
  overlay.id = "codeocr-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "999999";
  document.body.appendChild(overlay);

  selectionDiv = document.createElement("div");
  selectionDiv.id = "codeocr-selection";
  selectionDiv.style.position = "absolute";
  selectionDiv.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  selectionDiv.style.border = "2px dashed red";
  selectionDiv.style.boxShadow = "0 0 0 9999px rgba(0, 0, 0, 0.5)";
  selectionDiv.style.cursor = "crosshair";
  overlay.appendChild(selectionDiv);

  overlay.addEventListener("mousedown", startSelection);
  overlay.addEventListener("mousemove", updateSelection);
  overlay.addEventListener("mouseup", endSelection);
}

function startSelection(e) {
  isSelecting = true;

  // Use clientX/Y for viewport-relative start
  startX = e.clientX;
  startY = e.clientY;

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

  const newX = Math.min(currentX, startX);
  const newY = Math.min(currentY, startY);

  selectionDiv.style.left = `${newX}px`;
  selectionDiv.style.top = `${newY}px`;
  selectionDiv.style.width = `${width}px`;
  selectionDiv.style.height = `${height}px`;
}

function endSelection(e) {
  if (!isSelecting) return;
  isSelecting = false;

  // Get the final viewport-relative end coordinates
  const endX = e.clientX;
  const endY = e.clientY;

  // --- CRITICAL FIX: Get Scroll Position Reliably ---
  const scrollX = document.documentElement.scrollLeft;
  const scrollY = document.documentElement.scrollTop;

  // --- CRITICAL FIX: Determine the Scaling Factor (Zoom) ---
  // This compares the actual device pixels to the CSS pixels.
  // This is often the root of all evil in coordinate mismatches.
  const scalingFactor =
    window.devicePixelRatio / (window.screen.availWidth / window.innerWidth);

  // As a fallback for older Firefox:
  const finalScalingFactor =
    scalingFactor && isFinite(scalingFactor) ? scalingFactor : 1;

  // Calculate final coordinates relative to the WHOLE DOCUMENT
  let x_start = Math.min(startX, endX);
  let y_start = Math.min(startY, endY);
  let width = Math.abs(endX - startX);
  let height = Math.abs(endY - startY);

  // Apply scroll offset
  let finalX = x_start + scrollX;
  let finalY = y_start + scrollY;

  // Scale coordinates to match the screenshot's pixel density
  const coords = {
    // Divide by the scaling factor. If scalingFactor is 1 (no zoom/DPR mismatch), nothing changes.
    x: Math.round(finalX * finalScalingFactor),
    y: Math.round(finalY * finalScalingFactor),
    width: Math.round(width * finalScalingFactor),
    height: Math.round(height * finalScalingFactor),
  };

  // Remove the selection UI
  overlay.remove();

  if (coords.width > 5 && coords.height > 5) {
    // Send the scaled, document-relative coordinates
    browser.runtime.sendMessage({
      command: "screenshot_selected_area",
      coords: coords,
    });
  } else {
    console.log("Selection canceled: area was too small.");
    browser.runtime.sendMessage({ command: "selection_cancelled" });
  }
}

// Start the selection process when the script is injected
createUI();
