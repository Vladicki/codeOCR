// select.js
(() => {
  // Robust selection content script that computes coords in image pixels
  let overlay = null;
  let selection = null;
  let isSelecting = false;
  let activePointerId = null;

  // New Guide elements
  let guideH = null;
  let guideV = null;

  // Start coords (page/document coords include scroll)
  let startPageX = 0,
    startPageY = 0;
  // Also keep viewport coords for drawing visuals
  let startClientX = 0,
    startClientY = 0;

  function createUI() {
    overlay = document.createElement("div");
    overlay.id = "codeocr-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(2147483647),
      cursor: "crosshair",
      userSelect: "none",
      touchAction: "none",
      background: "transparent",
    });

    selection = document.createElement("div");
    selection.id = "codeocr-selection";
    Object.assign(selection.style, {
      position: "absolute",
      left: "0px",
      top: "0px",
      width: "0px",
      height: "0px",
      pointerEvents: "none",
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "3px dashed #b80c14ee",
      borderRadius: "4px",
    });

    // --- NEW GUIDE LINES ---
    const guideStyle = {
      position: "fixed",
      pointerEvents: "none",
      backgroundColor: "rgba(184, 12, 20, 0.7)", // Same color as border
      opacity: "0.8",
      display: "none", // Hidden until selection starts
    };

    guideH = document.createElement("div");
    guideH.id = "codeocr-guide-h";
    Object.assign(guideH.style, guideStyle, {
      height: "1px",
      width: "100%",
    });

    guideV = document.createElement("div");
    guideV.id = "codeocr-guide-v";
    Object.assign(guideV.style, guideStyle, {
      width: "1px",
      height: "100%",
    });
    // --- END NEW GUIDE LINES ---

    overlay.appendChild(selection);
    overlay.appendChild(guideH); // Add guides to the overlay
    overlay.appendChild(guideV);
    document.documentElement.appendChild(overlay);

    // pointer events (works for mouse, touch, pen)
    overlay.addEventListener("pointerdown", onPointerDown, { passive: false });
    // Listen to move on window to track the pointer even before selection starts
    window.addEventListener("pointermove", onPointerMoveGlobal, {
      passive: false,
    });
    overlay.addEventListener("pointermove", onPointerMove, { passive: false });

    // pointerup/listen on window to ensure we catch it even if pointer leaves overlay
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerCancel, {
      passive: false,
    });
    window.addEventListener("keydown", onKeyDown);
  }

  // Global move handler to update guides even when selection hasn't started
  function onPointerMoveGlobal(e) {
    if (overlay) {
      // Update guide position based on current client coordinates
      guideH.style.top = `${e.clientY}px`;
      guideV.style.left = `${e.clientX}px`;

      // Only show guides when the overlay is active and no selection is happening
      if (!isSelecting) {
        guideH.style.display = "block";
        guideV.style.display = "block";
      }
    }
  }

  function onPointerDown(e) {
    // only primary button
    if (!e.isPrimary) return;
    if (typeof e.button === "number" && e.button !== 0) return;
    e.preventDefault();

    activePointerId = e.pointerId;
    try {
      overlay.setPointerCapture(activePointerId);
    } catch (err) {
      /* ignore */
    }

    isSelecting = true;

    // Hide guide lines once selection starts
    guideH.style.display = "none";
    guideV.style.display = "none";

    // store start coords: page coords include scroll (good for final)
    startPageX = e.pageX;
    startPageY = e.pageY;

    // client coords for drawing
    startClientX = e.clientX;
    startClientY = e.clientY;

    selection.style.left = `${startClientX}px`;
    selection.style.top = `${startClientY}px`;
    selection.style.width = `0px`;
    selection.style.height = `0px`;
  }

  function onPointerMove(e) {
    if (!isSelecting || e.pointerId !== activePointerId) return;
    e.preventDefault();

    const curX = e.clientX;
    const curY = e.clientY;
    const left = Math.min(curX, startClientX);
    const top = Math.min(curY, startClientY);
    const width = Math.abs(curX - startClientX);
    const height = Math.abs(curY - startClientY);

    selection.style.left = `${Math.round(left)}px`;
    selection.style.top = `${Math.round(top)}px`;
    selection.style.width = `${Math.round(width)}px`;
    selection.style.height = `${Math.round(height)}px`;
  }

  function onPointerUp(e) {
    if (!isSelecting) return;
    // ensure it's the same pointer
    if (
      e &&
      typeof e.pointerId !== "undefined" &&
      e.pointerId !== activePointerId
    )
      return;
    e.preventDefault();
    finalizeSelection(e);
  }

  function onPointerCancel(e) {
    if (!isSelecting) return;
    cleanup();
    chrome.runtime.sendMessage({ command: "selection_cancelled" });
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
      chrome.runtime.sendMessage({ command: "selection_cancelled" });
    }
  }

  function finalizeSelection(e) {
    // end page coords include scroll
    const endPageX = e ? e.pageX : startPageX;
    const endPageY = e ? e.pageY : startPageY;

    const xStartPage = Math.min(startPageX, endPageX);
    const yStartPage = Math.min(startPageY, endPageY);
    const selWidthPage = Math.abs(endPageX - startPageX);
    const selHeightPage = Math.abs(endPageY - startPageY);

    // compute viewport-relative CSS coords (captureVisibleTab captures the visible viewport)
    const scrollX =
      window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY =
      window.pageYOffset || document.documentElement.scrollTop || 0;

    let vpX = xStartPage - scrollX;
    let vpY = yStartPage - scrollY;
    let vpW = selWidthPage;
    let vpH = selHeightPage;

    // If selection started or extended outside viewport, clamp to visible area
    // adjust width/height when portion is off-screen
    if (vpX < 0) {
      vpW += vpX; // reduce width
      vpX = 0;
    }
    if (vpY < 0) {
      vpH += vpY;
      vpY = 0;
    }

    if (vpX + vpW > window.innerWidth) vpW = window.innerWidth - vpX;
    if (vpY + vpH > window.innerHeight) vpH = window.innerHeight - vpY;

    // If the visible portion is too small, cancel
    if (vpW < 5 || vpH < 5) {
      cleanup();
      chrome.runtime.sendMessage({ command: "selection_cancelled" });
      return;
    }

    // Convert viewport CSS pixels -> image (device) pixels.
    // captureVisibleTab generally returns an image sized roughly: innerWidth * devicePixelRatio
    const dpr = window.devicePixelRatio || 1;

    const xImg = Math.round(vpX * dpr);
    const yImg = Math.round(vpY * dpr);
    const wImg = Math.round(vpW * dpr);
    const hImg = Math.round(vpH * dpr);

    // Cleanup the UI before sending
    cleanup();

    // Send the coordinates in IMAGE pixels (ready for cropImageOnCanvas)
    chrome.runtime.sendMessage({
      command: "screenshot_selected_area",
      coords: {
        x: xImg,
        y: yImg,
        width: wImg,
        height: hImg,

        // extra metadata (optional, useful for debugging in background)
        __meta: {
          viewportWidthCss: window.innerWidth,
          viewportHeightCss: window.innerHeight,
          devicePixelRatio: dpr,
          scrollX,
          scrollY,
          pageWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
          originalSelectionPage: {
            x: xStartPage,
            y: yStartPage,
            width: selWidthPage,
            height: selHeightPage,
          },
          visibleSelectionCss: { x: vpX, y: vpY, width: vpW, height: vpH },
        },
      },
    });
  }

  function cleanup() {
    // Remove global listener
    try {
      window.removeEventListener("pointermove", onPointerMoveGlobal);
    } catch (e) {}

    try {
      overlay?.removeEventListener("pointerdown", onPointerDown);
    } catch (e) {}
    try {
      overlay?.removeEventListener("pointermove", onPointerMove);
    } catch (e) {}
    try {
      window.removeEventListener("pointerup", onPointerUp);
    } catch (e) {}
    try {
      window.removeEventListener("pointercancel", onPointerCancel);
    } catch (e) {}
    try {
      window.removeEventListener("keydown", onKeyDown);
    } catch (e) {}

    // release pointer capture if still held
    try {
      if (activePointerId != null)
        overlay?.releasePointerCapture?.(activePointerId);
    } catch (e) {}

    // remove DOM
    try {
      overlay?.remove();
    } catch (e) {}
    overlay = null;
    selection = null;
    isSelecting = false;
    activePointerId = null;
    guideH = null; // Clear references
    guideV = null;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.command === "cancel_selection") {
      cleanup();

      // This stops the execution and resets the state in background.js
      chrome.runtime.sendMessage({ command: "selection_cancelled" });
    }
  });
  // Start UI
  createUI();
})();
