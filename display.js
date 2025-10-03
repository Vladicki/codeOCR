// --- Global State and Constants ---
let lastBuffer = { code: null, language: null };
const UI_ID = "codeocr-result-modal";
// Extensive language list as requested
const LANGUAGE_OPTIONS = [
  "abap",
  "agda",
  "arduino",
  "ascii art",
  "assembly",
  "bash",
  "basic",
  "bnf",
  "c",
  "c#",
  "c++",
  "clojure",
  "coffeescript",
  "css",
  "dart",
  "dhall",
  "diff",
  "docker",
  "ebnf",
  "elixir",
  "elm",
  "erlang",
  "f#",
  "flow",
  "fortran",
  "gherkin",
  "glsl",
  "go",
  "graphql",
  "groovy",
  "haskell",
  "hcl",
  "html",
  "idris",
  "java",
  "javascript",
  "json",
  "julia",
  "kotlin",
  "latex",
  "less",
  "lisp",
  "livescript",
  "llvm ir",
  "lua",
  "makefile",
  "markdown",
  "markup",
  "mathematica",
  "matlab",
  "mermaid",
  "nix",
  "notion formula",
  "objective-c",
  "ocaml",
  "pascal",
  "perl",
  "php",
  "plain text",
  "powershell",
  "prolog",
  "protobuf",
  "purescript",
  "python",
  "r",
  "racket",
  "reason",
  "rocq",
  "ruby",
  "rust",
  "sass",
  "scala",
  "scheme",
  "scss",
  "shell",
  "smalltalk",
  "solidity",
  "sql",
  "swift",
  "toml",
  "typescript",
  "vb.net",
  "verilog",
  "vhdl",
  "visual basic",
  "webassembly",
  "xml",
  "yaml",
];

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
 * @param {string} markdownText - The raw text from the Gemini API.
 * @returns {{code: string, language: string}}
 */
function extractCodeFromMarkdown(markdownText) {
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)\s*```/;
  const match = markdownText.match(codeBlockRegex);

  if (match) {
    const detectedLang = match[1] ? match[1].toLowerCase() : "plain text";
    const codeContent = match[2].trim();

    const language = LANGUAGE_OPTIONS.includes(detectedLang)
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

    let newTop = element.offsetTop - pos2;
    let newLeft = element.offsetLeft - pos1;

    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
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

    if (newWidth > 300) {
      element.style.width = newWidth + "px";
    }
    if (newHeight > 200) {
      element.style.height = newHeight + "px";
    }
  }

  function stopDrag() {
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

// ==========================================================
// MODAL CREATION/DISPLAY LOGIC
// ==========================================================

/**
 * Creates, populates, and displays the code modal.
 * If called via message (initial load), it uses rawText to extract code/language.
 * If called via re-open shortcut, the code and language are pre-cleaned.
 * @param {string} textOrCode The raw message text OR the clean code from lastBuffer.
 * @param {string | null} [initialLanguage=null] If provided, bypasses markdown extraction.
 */
function createDisplayModal(textOrCode, initialLanguage = null) {
  // 1. Determine Content and Language
  let code, language;

  if (initialLanguage) {
    // Re-opening the last buffer
    code = textOrCode;
    language = initialLanguage;
  } else {
    // Initial display from a new API response
    const extracted = extractCodeFromMarkdown(textOrCode);
    code = extracted.code;
    language = extracted.language;

    // Save the new buffer immediately
    lastBuffer.code = code;
    lastBuffer.language = language;
  }

  // Load Arimo font for the dropdown
  loadArimoFont();

  // Remove existing modal if present (and cleanup needed if a shortcut was missed)
  let existingModal = document.getElementById(UI_ID);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = UI_ID;

  // --- Initial Styles (Top Right Position) ---
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

  // --- Modal Structure ---
  modal.innerHTML = `
        <div id="codeocr-header" style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px 15px;
            background-color: #252526; 
            border-bottom: 1px solid #00b4ff;
            cursor: move;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="color: #00b4ff; margin: 0; font-size: 1.6em;">CodeOCR</h2>
                
                <!-- START: Custom Searchable Dropdown UI -->
                <div id="codeocr-language-search-container" style="
                    position: relative; 
                    width: 200px; 
                    font-family: 'Arimo', sans-serif; 
                ">
                    <div id="codeocr-visible-selection" style="
                        padding: 4px 8px; 
                        border-radius: 6px; 
                        background-color: #4a4a4a; 
                        color: white; 
                        border: 1px solid #4a4a4a; 
                        font-size: 1.1em; 
                        cursor: pointer; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        text-transform: capitalize;
                    ">
                        <span id="codeocr-selected-language-label">Plain Text</span>
                        <span style="font-size: 0.7em;">▼</span>
                    </div>

                    <div id="codeocr-language-list" style="
                        display: none; 
                        position: absolute; 
                        top: 100%; 
                        left: 0; 
                        width: 100%; 
                        background-color: #3a3a3a; 
                        border: none; 
                        border-top: none; 
                        z-index: 2147483648; 
                        max-height: 40vh; 
                        overflow-y: auto; 
                        border-radius: 0 0 4px 4px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    ">
                        <input id="codeocr-search-input" type="text" placeholder="Search for language..." style="
                            width: 100%; 
                            padding: 8px; 
                            box-sizing: border-box; 
                            background-color: #252525; 
                            color: white; 
                            border: 1px solid #2d2d2d; 
                            border-radius: 0; 
                            font-size: 1.3em;
                            margin: 0;
                            outline: none;
                            font-family: 'Arimo', sans-serif; 
                        ">
                        <ul id="codeocr-options-list" style="
                            list-style: none; 
                            padding: 0; 
                            margin: 0;
                        ">
                            ${LANGUAGE_OPTIONS.map(
                              (lang) =>
                                `<li data-value="${lang}" style="
                                    padding: 6px 8px; 
                                    cursor: pointer; 
                                    border-radius:2; 
                                    font-size: 1.3em;
                                    text-transform: capitalize;
                                    transition: background-color 0.1s;
                                    " onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">
                                    ${lang.charAt(0).toUpperCase() + lang.slice(1)}    </li>`,
                            ).join("")}
                        </ul>
                    </div>
                </div>
                <!-- END: Custom Searchable Dropdown UI -->

            </div>
            <button id="codeocr-close" style="
                background: none; 
                border: none; 
                color: #d4d4d4; 
                font-size: 2.2em; 
                cursor: pointer;
                padding: 0 5px;
            ">&times;</button>
        </div>

        <div 
            id="codeocr-output-editor" 
            contenteditable="true"
            spellcheck="false"
            style="
                flex-grow: 1; 
                padding: 15px; 
                margin: 0; 
                overflow: auto; 
                white-space: pre-wrap;
                font-family: 'Consolas', monospace;
                font-size: 2rem; 
                line-height: 1.4;
                caret-color: white;
                outline: none; 
                cursor: text;
            "
        ></div>
        
        <button id="codeocr-copy" style="
            padding: 8px 15px; 
            background-color: #007acc; 
            color: white; 
            border: none; 
            border-radius: 0 0 8px 8px; 
            cursor: pointer; 
            font-size: 1em;
            transition: background-color 0.2s;
        ">Copy (Alt+Enter)</button>

        <div id="codeocr-resize-handle" style="
            position: absolute;
            bottom: 0;
            right: 0;
            width: 15px;
            height: 15px;
            background: transparent;
            cursor: nwse-resize;
        "></div>
    `;

  document.body.appendChild(modal);

  const outputEditor = document.getElementById("codeocr-output-editor");
  const header = document.getElementById("codeocr-header");
  const copyBtn = document.getElementById("codeocr-copy");
  const closeBtn = document.getElementById("codeocr-close");
  const resizeHandle = document.getElementById("codeocr-resize-handle");

  // Search Component Elements
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

  // Helper function to capitalize the first letter of a string
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Set the initial selected language
  let currentLanguage = language;
  selectedLabel.textContent = capitalize(currentLanguage);

  // 2. Insert the code content
  outputEditor.textContent = code;

  // --- Dynamic Sizing ---
  const paddingHeight = 15 + 15;
  const totalContentHeight =
    outputEditor.scrollHeight +
    header.offsetHeight +
    copyBtn.offsetHeight +
    paddingHeight;
  const totalContentWidth = outputEditor.scrollWidth + 40;

  const calculatedHeight = Math.min(
    totalContentHeight,
    window.innerHeight * 0.8,
  );
  const calculatedWidth = Math.min(totalContentWidth, window.innerWidth * 0.8);

  modal.style.height = `${Math.max(calculatedHeight, 200)}px`;
  modal.style.width = `${Math.max(calculatedWidth, 300)}px`;

  // --- Core Interactions ---

  makeDraggable(modal, header);
  makeResizable(modal, resizeHandle);

  // Function to handle modal closing and cleanup
  const closeModal = () => {
    // IMPORTANT: Before removing the modal, save the current edited content
    // and the currently selected language to the lastBuffer.
    lastBuffer.code = outputEditor.textContent;
    lastBuffer.language = currentLanguage;

    modal.remove();
    // The global listener remains attached, so no need to remove/re-add it here.
  };

  closeBtn.addEventListener("click", closeModal);

  // 5. Hover Dimming for Copy Button
  const DEFAULT_COPY_COLOR = "#007acc";
  const DIMMED_COPY_COLOR = "#005a99"; // Darker shade for "dimmed" effect
  const COPIED_FEEDBACK_COLOR = "#00a878";

  copyBtn.addEventListener("mouseover", () => {
    if (copyBtn.textContent.startsWith("Copy Code")) {
      copyBtn.style.backgroundColor = DIMMED_COPY_COLOR;
    }
  });

  copyBtn.addEventListener("mouseout", () => {
    if (copyBtn.textContent.startsWith("Copy Code")) {
      copyBtn.style.backgroundColor = DEFAULT_COPY_COLOR;
    }
  });

  // Search/Dropdown Logic (Omitted for brevity, assumed correct from prior step)
  // ... (Dropdown logic remains the same) ...

  visibleSelection.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = languageList.style.display === "block";
    languageList.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      searchInput.focus();
    } else {
      searchInput.value = "";
      Array.from(optionsList.children).forEach(
        (li) => (li.style.display = "block"),
      );
    }
  });

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    Array.from(optionsList.children).forEach((li) => {
      const langName = li.getAttribute("data-value");
      li.style.display = langName.includes(query) ? "block" : "none";
    });
  });

  optionsList.addEventListener("click", (e) => {
    const listItem = e.target.closest("li");
    if (listItem) {
      currentLanguage = listItem.getAttribute("data-value");
      selectedLabel.textContent = capitalize(currentLanguage);
      languageList.style.display = "none";
      searchInput.value = "";
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

  // 3. Copy Logic: Copies the content and schedules close
  copyBtn.addEventListener("click", () => {
    const contentToCopy = outputEditor.textContent;

    const selection = window.getSelection();
    const range = document.createRange();

    // Select the text in the editor
    range.selectNodeContents(outputEditor);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      document.execCommand("copy");
      selection.removeAllRanges();

      // IMPORTANT: Save the *current* state of the editor before closing
      lastBuffer.code = contentToCopy;
      lastBuffer.language = currentLanguage;

      // Temporary feedback style and message update
      copyBtn.style.backgroundColor = COPIED_FEEDBACK_COLOR;
      copyBtn.textContent = "Copied! Closing...";

      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (err) {
      console.error("Failed to copy text using execCommand:", err);
      // Fallback for user feedback
      copyBtn.textContent = "Copy Failed! (Check Console)";
      // Revert in 1.5s
      setTimeout(() => {
        copyBtn.textContent = "Copy Code (Alt+Enter)";
        copyBtn.style.backgroundColor = DEFAULT_COPY_COLOR;
      }, 1500);
    }
  });
}

// ==========================================================
// GLOBAL KEYBOARD LISTENER (PERSISTENT)
// ==========================================================

// This function is attached once and controls all keyboard shortcuts
function handleGlobalKeyDown(e) {
  const modal = document.getElementById(UI_ID);

  // Alt + Enter: Handles Copy (when open) OR Re-open (when closed)
  if (e.altKey && e.key === "Enter") {
    e.preventDefault();

    if (modal) {
      // MODAL IS OPEN: Trigger Copy Action (which schedules a close)
      document.getElementById("codeocr-copy")?.click();
    } else {
      // MODAL IS CLOSED: Re-open the last buffer
      if (lastBuffer.code !== null) {
        createDisplayModal(lastBuffer.code, lastBuffer.language);
      }
    }
    return;
  }

  // Escape: Handles Close (only when open)
  if (modal && e.key === "Escape") {
    e.preventDefault();
    document.getElementById("codeocr-close")?.click();
  }
}

// Attach the persistent global listener once when the content script loads
document.addEventListener("keydown", handleGlobalKeyDown);

// Main logic: Listen for the display command from background.js
browser.runtime.onMessage.addListener((message) => {
  if (message.command === "display_result" && message.text) {
    // Initial display from API response, markdown extraction is required
    createDisplayModal(message.text);
    return true;
  }
});
