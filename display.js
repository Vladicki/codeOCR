// --- Global State and Constants ---
let lastBuffer = { code: null, language: null };
const UI_ID = "codeocr-result-modal";
let availableLanguages = [];
let currentLanguage; // Holds the language selected in the dropdown

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

/**
 * Dynamically loads the Arimo font from Google Fonts.
 */
function loadArimoFont() {
  if (!document.querySelector('link[href*="Arimo"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap";
    document.head.appendChild(link);
  }
}

/**
 * Extracts code and language from a Gemini response formatted with Markdown code blocks.
 */
function extractCodeFromMarkdown(markdownText) {
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)\s*```/;
  const match = markdownText.match(codeBlockRegex);

  if (match) {
    const detectedLang = match[1] ? match[1].toLowerCase() : "plain text";
    const codeContent = match[2].trim();
    const language = availableLanguages.includes(detectedLang)
      ? detectedLang
      : "plain text";
    return { code: codeContent, language: language };
  }

  return { code: markdownText, language: "plain text" };
}

// ==========================================================
// DRAGGABLE AND RESIZABLE LOGIC
// ==========================================================

function makeDraggable(element, handle) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (handle) {
    handle.onmousedown = dragMouseDown;
    handle.style.cursor = "move";
  } else {
    element.onmousedown = dragMouseDown;
    element.style.cursor = "move";
  }

  function dragMouseDown(e) {
    e = e || window.event;
    if (
      e.target.closest("#codeocr-language-search-container") ||
      e.target.id === "codeocr-close"
    ) {
      return;
    }
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
    element.style.right = "auto";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function makeResizable(element, handle) {
  let startX, startY, startWidth, startHeight;
  handle.onmousedown = initDrag;
  handle.style.cursor = "nwse-resize";

  function initDrag(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = element.offsetWidth;
    startHeight = element.offsetHeight;
    document.onmousemove = doDrag;
    document.onmouseup = stopDrag;
  }

  function doDrag(e) {
    const newWidth = startWidth + e.clientX - startX;
    const newHeight = startHeight + e.clientY - startY;
    if (newWidth > 300) element.style.width = newWidth + "px";
    if (newHeight > 200) element.style.height = newHeight + "px";
  }

  function stopDrag() {
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

// ==========================================================
// MODAL CREATION/DISPLAY LOGIC
// ==========================================================

function createDisplayModal(textOrCode, initialLanguage = null) {
  let code, language;
  if (initialLanguage) {
    code = textOrCode;
    language = initialLanguage;
  } else {
    const extracted = extractCodeFromMarkdown(textOrCode);
    code = extracted.code;
    language = extracted.language;
    lastBuffer.code = code;
    lastBuffer.language = language;
  }

  loadArimoFont();

  let existingModal = document.getElementById(UI_ID);
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = UI_ID;

  Object.assign(modal.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    left: "auto",
    transform: "none",
    zIndex: "2147483647",
    width: "auto",
    height: "auto",
    minWidth: "300px",
    minHeight: "200px",
    backgroundColor: "#191919",
    color: "#f0efed",
    border: "1px solid #30302e",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
    fontFamily:
      "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'",
  });

  modal.innerHTML = `
        <div id="codeocr-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background-color: #252526; border-bottom: 1px solid #00b4ff; cursor: move;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="color: #00b4ff; margin: 0; font-size: 1.6em;">CodeOCR</h2>
                <div id="codeocr-language-search-container" style="position: relative; width: 200px; font-family: 'Arimo', sans-serif;">
                    <div id="codeocr-visible-selection" style="padding: 4px 8px; border-radius: 6px; background-color: #4a4a4a; color: white; border: 1px solid #4a4a4a; font-size: 1.1em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-transform: capitalize;">
                        <span id="codeocr-selected-language-label">Plain Text</span>
                        <span style="font-size: 0.7em;">▼</span>
                    </div>
                    <div id="codeocr-language-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border-top: none; z-index: 2147483648; max-height: 40vh; overflow-y: auto; border-radius: 0 0 4px 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);">
                        <input id="codeocr-search-input" type="text" placeholder="Search for language..." style="width: 100%; padding: 8px; box-sizing: border-box; background-color: #252525; color: white; border: 1px solid #2d2d2d; font-size: 1.3em; margin: 0; outline: none; font-family: 'Arimo', sans-serif;">
                        <ul id="codeocr-options-list" style="list-style: none; padding: 0; margin: 0;">
                            ${availableLanguages
                              .map(
                                (lang) =>
                                  `<li data-value="${lang}" style="padding: 6px 8px; cursor: pointer; font-size: 1.3em; text-transform: capitalize; transition: background-color 0.1s;" onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">
                                  ${lang.charAt(0).toUpperCase() + lang.slice(1)}
                              </li>`,
                              )
                              .join("")}
                        </ul>
                    </div>
                </div>
            </div>
            <button id="codeocr-close" style="background: none; border: none; color: #d4d4d4; font-size: 2.2em; cursor: pointer; padding: 0 5px;">&times;</button>
        </div>
        <div id="codeocr-output-editor" contenteditable="true" spellcheck="false" style="flex-grow: 1; padding: 15px; margin: 0; overflow: auto; white-space: pre-wrap; font-family: 'Consolas', monospace; font-size: 2rem; line-height: 1.4; caret-color: white; outline: none; cursor: text;"></div>
        <button id="codeocr-copy" style="padding: 8px 15px; background-color: #007acc; color: white; border: none; border-radius: 0 0 8px 8px; cursor: pointer; font-size: 1em; transition: background-color 0.2s;">Copy (Alt+Enter)</button>
        <div id="codeocr-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 15px; height: 15px; background: transparent; cursor: nwse-resize;"></div>
    `;

  document.body.appendChild(modal);

  const outputEditor = document.getElementById("codeocr-output-editor");
  const header = document.getElementById("codeocr-header");
  const copyBtn = document.getElementById("codeocr-copy");
  const closeBtn = document.getElementById("codeocr-close");
  const resizeHandle = document.getElementById("codeocr-resize-handle");
  const searchContainer = document.getElementById(
    "codeocr-language-search-container",
  );
  const visibleSelection = document.getElementById("codeocr-visible-selection");
  const selectedLabel = document.getElementById(
    "codeocr-selected-language-label",
  );
  const languageList = document.getElementById("codeocr-language-list");
  const searchInput = document.getElementById("codeocr-search-input");
  const optionsList = document.getElementById("codeocr-options-list");

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  currentLanguage = language;
  selectedLabel.textContent = capitalize(currentLanguage);
  outputEditor.textContent = code;

  // --- Sizing and Interactions ---
  makeDraggable(modal, header);
  makeResizable(modal, resizeHandle);

  const closeModal = () => {
    lastBuffer.code = outputEditor.textContent;
    lastBuffer.language = currentLanguage;
    modal.remove();
  };

  closeBtn.addEventListener("click", closeModal);

  // --- Dropdown and Search Logic ---
  visibleSelection.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = languageList.style.display === "block";
    languageList.style.display = isVisible ? "none" : "block";
    if (!isVisible) searchInput.focus();
    else {
      searchInput.value = "";
      Array.from(optionsList.children).forEach(
        (li) => (li.style.display = "block"),
      );
    }
  });

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    Array.from(optionsList.children).forEach((li) => {
      const langName = li.getAttribute("data-value").toLowerCase();
      li.style.display = langName.includes(query) ? "block" : "none";
    });
  });

  optionsList.addEventListener("click", (e) => {
    const listItem = e.target.closest("li");
    if (listItem) {
      const newLanguage = listItem.getAttribute("data-value");
      if (newLanguage === currentLanguage) {
        languageList.style.display = "none";
        return;
      }
      currentLanguage = newLanguage;
      selectedLabel.textContent = capitalize(currentLanguage);
      languageList.style.display = "none";
      searchInput.value = "";

      outputEditor.textContent = `Update with ${capitalize(currentLanguage)}...`;
      browser.runtime.sendMessage({
        command: "rerun_ocr",
        newLanguage: currentLanguage,
      });
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !searchContainer.contains(e.target) &&
      languageList.style.display === "block"
    ) {
      languageList.style.display = "none";
    }
  });

  // --- Copy Logic ---
  copyBtn.addEventListener("click", () => {
    const contentToCopy = outputEditor.textContent;
    // Use the modern clipboard API for security and reliability
    navigator.clipboard
      .writeText(contentToCopy)
      .then(() => {
        lastBuffer.code = contentToCopy;
        lastBuffer.language = currentLanguage;
        copyBtn.style.backgroundColor = "#00a878"; // Success color
        copyBtn.textContent = "Copied! Closing...";
        setTimeout(closeModal, 700);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
        copyBtn.textContent = "Copy Failed!";
        setTimeout(() => {
          copyBtn.textContent = "Copy (Alt+Enter)";
          copyBtn.style.backgroundColor = "#007acc";
        }, 1500);
      });
  });
}

// ==========================================================
// GLOBAL LISTENERS
// ==========================================================

function handleGlobalKeyDown(e) {
  const modal = document.getElementById(UI_ID);
  if (e.altKey && e.key === "Enter") {
    e.preventDefault();
    if (modal) {
      document.getElementById("codeocr-copy")?.click();
    } else if (lastBuffer.code !== null) {
      createDisplayModal(lastBuffer.code, lastBuffer.language);
    }
    return;
  }
  if (modal && e.key === "Escape") {
    e.preventDefault();
    document.getElementById("codeocr-close")?.click();
  }
}

document.addEventListener("keydown", handleGlobalKeyDown);

browser.runtime.onMessage.addListener((message) => {
  if (message.command === "display_result" && message.text) {
    if (message.languages) availableLanguages = message.languages;
    createDisplayModal(message.text);
    return true;
  } else if (message.command === "update_display" && message.text) {
    const outputEditor = document.getElementById("codeocr-output-editor");
    if (outputEditor) {
      const extracted = extractCodeFromMarkdown(message.text);
      outputEditor.textContent = extracted.code;
      // Update buffer with the new code, language is already set by user selection
      lastBuffer.code = extracted.code;
      lastBuffer.language = currentLanguage;
    }
    return true;
  }
});

