// --- display.js  ---

const UI_ID = "codeocr-result-modal";

function createDisplayModal(text) {
  // Check if modal already exists and remove it
  let existingModal = document.getElementById(UI_ID);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = UI_ID;
  Object.assign(modal.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "2147483647",
    width: "600px",
    maxWidth: "90vw",
    padding: "20px",
    backgroundColor: "#1e1e1e", // Dark background for code
    color: "#d4d4d4", // Light text
    border: "1px solid #00b4ff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    fontFamily: 'Consolas, "Courier New", monospace',
    whiteSpace: "pre-wrap", // Respect new lines and spaces
    maxHeight: "80vh",
    overflowY: "auto",
  });

  // Create a container for the code with a header
  modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #333;">
            <h2 style="color: #00b4ff; margin: 0; font-size: 1.2em;">CodeOCR</h2>
            <button id="codeocr-close" style="background: none; border: none; color: white; font-size: 1.5em; cursor: pointer;">&times;</button>
        </div>
        <pre id="codeocr-output" style="margin: 0; padding: 0;"></pre>
        <button id="codeocr-copy" style="position: absolute; bottom: 10px; right: 20px; padding: 5px 10px; background-color: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Copy Code</button>
    `;

  document.body.appendChild(modal);

  // Insert the text into the <pre> tag
  document.getElementById("codeocr-output").textContent = text;

  // Attach event listeners
  document
    .getElementById("codeocr-close")
    .addEventListener("click", () => modal.remove());
  document.getElementById("codeocr-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById("codeocr-copy");
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Code";
      }, 1500);
    });
  });
}

// Main logic: Listen for the display command from background.js
browser.runtime.onMessage.addListener((message) => {
  if (message.command === "display_result" && message.text) {
    createDisplayModal(message.text);
    return true;
  }
});

// If the script is injected but no message is immediately sent (shouldn't happen), it just waits for a message.
