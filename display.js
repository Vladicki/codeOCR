// --- display.js ---

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
 * Extracts code and language from a Gemini response formatted with Markdown code blocks.
 * @param {string} markdownText - The raw text from the Gemini API.
 * @returns {{code: string, language: string}}
 */

/**
 * Dynamically loads the Arimo font from Google Fonts.
 */
function loadArimoFont() {
  if (!document.querySelector('link[href*="Arimo"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    // Includes weight 400 and 700
    link.href =
      "https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap";
    document.head.appendChild(link);
  }
}

function extractCodeFromMarkdown(markdownText) {
  // Regex to find the first code block (e.g., ```python\n...code...\n```)
  // (\w+)? captures the language (group 1)
  // ([\s\S]*?) captures the content (group 2)
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)\s*```/;
  const match = markdownText.match(codeBlockRegex);

  if (match) {
    const detectedLang = match[1] ? match[1].toLowerCase() : "plain text";
    const codeContent = match[2].trim(); // Trim whitespace from extracted code

    // Check if the detected language is in our predefined list, otherwise default
    const language = LANGUAGE_OPTIONS.includes(detectedLang)
      ? detectedLang
      : "plain text";

    return { code: codeContent, language: language };
  }

  // If no code block is found, return the entire text and 'plain text'
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

    // VITAL FIX: Check if the target is within the language search container or the close button.
    // This ensures the custom dropdown is fully interactive without triggering a drag.
    if (
      e.target.closest("#codeocr-language-search-container") ||
      e.target.id === "codeocr-close"
    ) {
      return;
    }

    e.preventDefault();
    // Get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // Calculate new top/left positions
    let newTop = element.offsetTop - pos2;
    let newLeft = element.offsetLeft - pos1;

    // Apply new position
    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
    element.style.right = "auto"; // Disable right constraint when dragging
  }

  function closeDragElement() {
    // Stop moving when mouse button is released:
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
    // Calculate new width and height based on mouse movement
    const newWidth = startWidth + e.clientX - startX;
    const newHeight = startHeight + e.clientY - startY;

    // Apply min width/height constraints
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
// MODAL CREATION
// ==========================================================

function createDisplayModal(text) {
  // 1. Process the incoming text to extract clean code and language
  const { code, language } = extractCodeFromMarkdown(text);
  // Load Arimo font for the dropdown before creating the modal
  loadArimoFont();

  // Remove existing modal if present
  let existingModal = document.getElementById(UI_ID);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = UI_ID;

  // --- Initial Styles (Top Right Position) ---
  Object.assign(modal.style, {
    position: "fixed",
    top: "20px", // Start near the top
    right: "20px", // Start near the right
    left: "auto", // Ensure right position is respected
    transform: "none", // No centering transform
    zIndex: "2147483647",

    // We set flexible sizing initially, and calculate fixed size later
    width: "auto",
    height: "auto",
    minWidth: "300px",
    minHeight: "200px",

    backgroundColor: "#191919", // Dark theme (Notion-like dark code block)
    color: "#f0efed",
    border: "1px solid #30302e",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    // UPDATED: Set overflow to visible so the dropdown list is not clipped by the modal.
    overflow: "visible",
    // NEW: Apple/Notion-like font family for a cleaner look.
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
                    width: 200px; /* Twice wider as requested */
                    font-family: 'Arimo', sans-serif; /* APPLY ARIMO TO DROPDOWN */
                ">
                    <div id="codeocr-visible-selection" style="
                        padding: 4px 8px; 
                        border-radius: 6px; /* NEW: Rounded corners */
                        background-color: #4a4a4a; /* NEW: Lighter grey for selection */
                        color: white; 
                        border: 1px solid #4a4a4a; /* Adjusted border to match background */
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
                        background-color: #3a3a3a; /* NEW: Different grey shade for dropdown list */
                        border: none; /* NEW: No border */
                        border-top: none; 
                        z-index: 2147483648; 
                        max-height: 40vh; /* Limited height for the dropdown list */
                        overflow-y: auto; 
                        border-radius: 0 0 4px 4px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    ">
                        <input id="codeocr-search-input" type="text" placeholder="Search for language..." style="
                            width: 100%; 
                            padding: 8px; 
                            box-sizing: border-box; 
                            background-color: #252525; /* NEW: Darker grey for search input */
                            color: white; 
                            border: 1px solid #2d2d2d; /* NEW: Border to match background */
                            border-radius: 0; /* Ensures clean transition to options list */
                            font-size: 1.3em;
                            margin: 0;
                            outline: none;
                            font-family: 'Arimo', sans-serif; /* Explicitly set Arimo */
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
                                    ${lang.charAt(0).toUpperCase() + lang.slice(1)}   </li>`,
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
                font-size: 2rem; /* Requested font size */
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
        ">Copy Code</button>

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

  // New Search Component Elements
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

  // 2. Insert the clean code
  outputEditor.textContent = code;

  // --- Dynamic Height Adaptation (Post-content insertion) ---
  const paddingHeight = 15 + 15; // Top/bottom padding of editor
  const totalContentHeight =
    outputEditor.scrollHeight +
    header.offsetHeight +
    copyBtn.offsetHeight +
    paddingHeight;
  const totalContentWidth = outputEditor.scrollWidth + 40; // Approx padding/margin for width

  const calculatedHeight = Math.min(
    totalContentHeight,
    window.innerHeight * 0.8,
  );
  const calculatedWidth = Math.min(totalContentWidth, window.innerWidth * 0.8);

  modal.style.height = `${calculatedHeight}px`;
  modal.style.width = `${calculatedWidth}px`;
  modal.style.height = `${Math.max(calculatedHeight, 200)}px`;
  modal.style.width = `${Math.max(calculatedWidth, 300)}px`;

  // --- Attach Interactions ---

  makeDraggable(modal, header);
  makeResizable(modal, resizeHandle);
  closeBtn.addEventListener("click", () => modal.remove());

  // Search/Dropdown Logic

  // Toggle list visibility on clicking the visible label
  visibleSelection.addEventListener("click", (e) => {
    // Stop event propagation to document's click listener to prevent immediate closing
    e.stopPropagation();
    const isVisible = languageList.style.display === "block";
    languageList.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      // Focus on search input when opened
      searchInput.focus();
    } else {
      // If closing, clear search
      searchInput.value = "";
      // Restore all options
      Array.from(optionsList.children).forEach(
        (li) => (li.style.display = "block"),
      );
    }
  });

  // Filter options based on search input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    Array.from(optionsList.children).forEach((li) => {
      const langName = li.getAttribute("data-value");
      if (langName.includes(query)) {
        li.style.display = "block";
      } else {
        li.style.display = "none";
      }
    });
  });

  // Handle selection from the list
  optionsList.addEventListener("click", (e) => {
    const listItem = e.target.closest("li");
    if (listItem) {
      currentLanguage = listItem.getAttribute("data-value");
      selectedLabel.textContent = capitalize(currentLanguage);
      languageList.style.display = "none"; // Close list
      searchInput.value = ""; // Clear search
      // Optional: You could send a message to the background script here to notify of language change
    }
  });

  // Close the list if user clicks outside the search container
  document.addEventListener("click", (e) => {
    // Check if the click occurred outside the container AND if the list is visible
    if (
      !searchContainer.contains(e.target) &&
      languageList.style.display === "block"
    ) {
      languageList.style.display = "none";
    }
  });

  // 3. Copy Logic: Copies the content of the editable div (which is the clean code)
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

      // Temporary feedback style
      copyBtn.style.backgroundColor = "#00a878";
      copyBtn.textContent = "Copied!";

      // Revert after timeout, also ensures the mouseout listener doesn't immediately overwrite feedback
      setTimeout(() => {
        copyBtn.textContent = "Copy Code";
        copyBtn.style.backgroundColor = copyBtn.matches(":hover")
          ? "#0064a3"
          : "#007acc";
      }, 1500);
    } catch (err) {
      console.error("Failed to copy text using execCommand:", err);
      // Fallback for user feedback
      copyBtn.textContent = "Copy Failed! (Check Console)";
      setTimeout(() => {
        copyBtn.textContent = "Copy Code";
      }, 1500);
    }
  });
}

// Main logic: Listen for the display command from background.js
browser.runtime.onMessage.addListener((message) => {
  if (message.command === "display_result" && message.text) {
    createDisplayModal(message.text);
    return true;
  }
});
