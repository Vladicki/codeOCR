// --- Global State and Constants ---
let lastBuffer = { code: null, language: null };
const UI_ID = "codeocr-result-modal";
let availableLanguages = [];
let currentLanguage; // Holds the language selected in the dropdown
let userFontSize = 2; // Default font size in rem
let selectedPossibleLanguages = []; // New: To store selected languages from checkboxes

const spinner = {
  interval: 80,
  frames: ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓"],
};
let spinnerIntervalId = null;

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function stopSpinner(element) {
  if (spinnerIntervalId) {
    clearInterval(spinnerIntervalId);
    spinnerIntervalId = null;
  }
  if (element) {
    element.style.fontSize = `${userFontSize}rem`;
    element.style.textAlign = ""; // Add this line to reset text alignment
  }
}

function loadArimoFont() {
  if (!document.querySelector('link[href*="Arimo"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap";
    document.head.appendChild(link);
  }
}

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

function renderLanguageList() {
  const optionsList = document.getElementById("codeocr-options-list");
  const langPresetOptionsList = document.getElementById(
    "codeocr-lang-preset-options-list",
  );

  if (optionsList) {
    optionsList.innerHTML = availableLanguages
      .map(
        (lang) =>
          `<li data-value="${lang}" style="padding: 0.375rem 0.5rem; cursor: pointer; font-size: 0.7em; text-transform: capitalize; transition: background-color 0.1s;" onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">${capitalize(
            lang,
          )}</li>`,
      )
      .join("");
  }

  if (langPresetOptionsList) {
    const defaultOption = `<li data-value="default" style="padding: 0.375rem 0.5rem; cursor: pointer; font-size: 0.7em; text-transform: capitalize; transition: background-color 0.1s;" onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">Default (Auto-Detect)</li>`;
    const languageOptions = availableLanguages
      .map(
        (lang) =>
          `<li data-value="${lang}" style="padding: 0.375rem 0.5rem; cursor: pointer; font-size: 0.7rm; text-transform: capitalize; transition: background-color 0.1s;" onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">${capitalize(
            lang,
          )}</li>`,
      )
      .join("");
    langPresetOptionsList.innerHTML = defaultOption + languageOptions;
  }
}

async function renderPossibleLanguagesCheckboxes(allLangsData) {
  const checkboxesDiv = document.getElementById(
    "codeocr-possible-languages-checkboxes",
  );
  const selectedLabel = document.getElementById(
    "codeocr-possible-languages-selected-label",
  );
  if (!checkboxesDiv || !selectedLabel) return;

  const result = await browser.storage.local.get(["selectedLanguages"]);
  selectedPossibleLanguages = result.selectedLanguages || [];

  checkboxesDiv.innerHTML = "";

  allLangsData.forEach((language, index) => {
    const div = document.createElement("div");
    div.classList.add("language-item");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `possible-lang-${language.id}`;
    checkbox.value = language.id;
    checkbox.dataset.langIndex = index;
    checkbox.dataset.langName = language.name;
    checkbox.dataset.langNative = language.native;

    if (selectedPossibleLanguages.some((sl) => sl.id === language.id)) {
      checkbox.checked = true;
    }

    checkbox.addEventListener("change", (event) => {
      togglePossibleLanguageSelection(language, index, event.target.checked);
      updatePossibleLanguagesSelectedLabel();
    });

    const label = document.createElement("label");
    label.htmlFor = `possible-lang-${language.id}`;
    label.textContent = language.native;
    label.style.fontSize = "1.1em";
    label.style.marginLeft = "0.3125rem";

    div.appendChild(checkbox);
    div.appendChild(label);
    checkboxesDiv.appendChild(div);
  });
  updatePossibleLanguagesSelectedLabel();
}

function updatePossibleLanguagesSelectedLabel() {
  const selectedLabel = document.getElementById(
    "codeocr-possible-languages-selected-label",
  );
  if (!selectedLabel) return;

  if (selectedPossibleLanguages.length === 0) {
    selectedLabel.textContent = "Select languages...";
  } else {
    selectedLabel.textContent = selectedPossibleLanguages
      .map((l) => l.name)
      .join(", ");
  }
}

function togglePossibleLanguageSelection(language, index, isChecked) {
  const existingIndex = selectedPossibleLanguages.findIndex(
    (sl) => sl.id === language.id,
  );

  if (isChecked) {
    if (existingIndex === -1) {
      selectedPossibleLanguages.push({
        index: index,
        name: language.name,
        id: language.id,
        native: language.native,
      });
    }
  } else {
    if (existingIndex > -1) {
      selectedPossibleLanguages.splice(existingIndex, 1);
    }
  }
  browser.storage.local.set({ selectedLanguages: selectedPossibleLanguages });
}

// ==========================================================
// DROPDOWN KEYBOARD NAVIGATION
// ==========================================================

function handleDropdownKeyboardNavigation(input, list, dropdown) {
  let focusedIndex = -1;

  input.addEventListener("keydown", (e) => {
    const items = Array.from(list.children).filter(
      (li) => li.style.display !== "none",
    );
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = (focusedIndex + 1) % items.length;
      updateFocus(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = (focusedIndex - 1 + items.length) % items.length;
      updateFocus(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex > -1) {
        const item = items[focusedIndex];
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          const changeEvent = new Event("change", { bubbles: true });
          checkbox.dispatchEvent(changeEvent);
        } else {
          item.click();
          dropdown.style.display = "none";
        }
      }
    }
  });

  function updateFocus(items) {
    items.forEach((item, index) => {
      if (index === focusedIndex) {
        item.style.backgroundColor = "#2f2f2f";
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.style.backgroundColor = "transparent";
      }
    });
  }
}

// ==========================================================
// DRAGGABLE AND RESIZABLE LOGIC (Omitted for brevity)
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
      e.target.closest("#codeocr-settings-panel") ||
      e.target.closest("#codeocr-settings-btn") ||
      e.target.id === "codeocr-close"
    )
      return;
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

async function createDisplayModal(
  textOrCode,
  initialLanguage = null,
  allLangsData = [],
) {
  const isLoading = textOrCode === ". . .";
  let code = textOrCode;
  let language = initialLanguage;

  const settings = await browser.storage.local.get([
    "codeocr_font_size",
    "codeocr_lang_preset",
    "codeocr_gui_scale",
  ]);
  userFontSize = settings.codeocr_font_size || 2;
  const userGuiScale = settings.codeocr_gui_scale || 1;

  loadArimoFont();
  stopSpinner();

  let existingModal = document.getElementById(UI_ID);
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = UI_ID;

  Object.assign(modal.style, {
    position: "fixed",
    top: "1.25rem",
    right: "1.25rem",
    left: "auto",
    transform: `scale(${userGuiScale})`,
    transformOrigin: "top right",
    zIndex: "2147483647",
    width: "auto",
    height: "auto",
    minWidth: "18.75rem",
    minHeight: "12.5rem",
    backgroundColor: "#191919",
    color: "#f0efed",
    border: "1px solid #30302e",
    borderRadius: "0.5rem",
    boxShadow: "0 0.25rem 0.75rem rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
    fontFamily: "'Arimo', sans-serif",
  });

  modal.innerHTML = `
    <div id="codeocr-header" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.9375rem; background-color: #252526; border-bottom: 1px solid #00b4ff; cursor: move;">
        <div style="display: flex; align-items: center; gap: 0.625rem;">
            <h2 style="color: #00b4ff; margin: 0; font-size: 1.6em;">CodeOCR</h2>
            <div id="codeocr-language-search-container" style="position: relative; width: 12.5rem;">
                <div id="codeocr-visible-selection" style="padding: 0.25rem 0.5rem; border-radius: 0.375rem; background-color: #4a4a4a; color: white; border: 1px solid #4a4a4a; font-size: 1.4em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-transform: capitalize;">
                    <span id="codeocr-selected-language-label">Plain Text</span>
                    <span style="font-size: 0.7em;">▼</span>
                </div>
                <div id="codeocr-language-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border-top: none; z-index: 2147483648; max-height: 40vh; overflow-y: auto; border-radius: 0 0 0.25rem 0.25rem; box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.5);">
                    <input id="codeocr-search-input" type="text" placeholder="Search for language..." style="width: 100%; padding: 0.5rem; box-sizing: border-box; background-color: #252525; color: white; border: 1px solid #2d2d2d; font-size: 1.3em; margin: 0; outline: none;">
                    <ul id="codeocr-options-list" style="list-style: none; font-size:1.8em; padding: 0; margin: 0;">
                    </ul>
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center;">
            <button id="codeocr-settings-btn" style="background: none; border: none; color: #d4d4d4; font-size: 1.2em; cursor: pointer; padding: 0 0.625rem;">•••</button>
            <button id="codeocr-close" style="background: none; border: none; color: #d4d4d4; font-size: 2em; cursor: pointer; padding: 0 0.3125rem;">&times;</button>
        </div>
    </div>
    <div id="codeocr-output-editor" contenteditable="true" spellcheck="false" style="flex-grow: 1; padding: 0.9375rem; margin: 0; overflow: auto; white-space: pre-wrap; font-family: inherit; font-size: ${userFontSize}rem; line-height: 1.4; caret-color: white; outline: none; cursor: text;"></div>
    <button id="codeocr-copy" style="padding: 0.5rem 0.9375rem; background-color: #007acc; color: white; border: none; border-radius: 0 0 0.5rem 0.5rem; cursor: pointer; font-size: 1.2em; transition: background-color 0.2s;">Copy (Alt+Enter)</button>
    <div id="codeocr-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 0.9375rem; height: 0.9375rem; background: transparent; cursor: nwse-resize;"></div>
    
    <div id="codeocr-settings-panel" style="display: none; position: absolute; top: 3rem; right: 0.3125rem; background: #252526; border: 1px solid #30302e; border-radius: 0.5rem; padding: 0.9375rem; z-index: 10; width: 21.875rem; color: #f0efed; font-size: 2rem;">
        <h3 style="margin-top: 0; color: #00b4ff; font-size: 0.8em;">Settings</h3>
        <div class="setting-item" style="margin-bottom: 0.9375rem; display: flex; align-items: center; gap: 0.625rem; font-size: 0.7em;">
            <label for="font-size-input">Font Size (rem):</label>
            <input type="number" id="font-size-input" min="0.5" max="5" step="0.1" value="${userFontSize}" style="width: 2.5rem; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; padding: 0.25rem; font-size: 0.7em; -moz-appearance: textfield; appearance: textfield; outline: none; border-color: white; border-radius: 0.125rem;" onfocus="this.style.borderColor='white'" onblur="this.style.borderColor='#4a4a4a'">
        </div>
        <div class="setting-item" style="margin-bottom: 0.9375rem; display: flex; align-items: center; gap: 0.625rem; font-size: 0.7em;">
            <label for="gui-scale-input">GUI Scale:</label>
            <input type="number" id="gui-scale-input" min="0.5" max="2" step="0.1" value="${userGuiScale}" style="width: 2.5rem; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; padding: 0.25rem; font-size: 0.7em; -moz-appearance: textfield; appearance: textfield; outline: none; border-color: white; border-radius: 0.125rem;" onfocus="this.style.borderColor='white'" onblur="this.style.borderColor='#4a4a4a'">
        </div>
        <div class="setting-item" style="margin-bottom: 0.9375rem; font-size: 0.7em;">
            <label style="display: block; margin-bottom: 0.3125rem;">Default Language Preset:</label>
            <div id="codeocr-lang-preset-search-container" style="position: relative;">
                <div id="codeocr-lang-preset-visible-selection" style="padding: 0.3125rem; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; font-size: 1em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 0.125rem;">
                    <span id="codeocr-lang-preset-selected-label">Default (Auto-Detect)</span>
                    <span style="font-size: 0.7em;">▼</span>
                </div>
                <div id="codeocr-lang-preset-dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border: 1px solid #4a4a4a; z-index: 10; max-height: 28.125rem; overflow-y: auto; border-radius: 0 0 0.25rem 0.25rem; box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.5);">
                    <input type="text" id="codeocr-lang-preset-search-input" placeholder="Search language preset..." style="width: 100%; padding: 0.4rem; box-sizing: border-box; background-color: #252525; color: white; border: 1px solid #2d2d2d; font-size: 1em; margin: 0; outline: none;">
                    <ul id="codeocr-lang-preset-options-list" style="list-style: none; padding: 0; margin: 0;">
                    </ul>
                </div>
            </div>
        </div>
        <div class="setting-item" style="margin-bottom: 0.9375rem; font-size: 0.7em;">
            <label style="display: block; margin-bottom: 0.3125rem;">Native Languages:</label>
            <div id="codeocr-possible-languages-search-container" style="position: relative;">
                <div id="codeocr-possible-languages-visible-selection" style="padding: 0.3125rem; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; font-size: 1em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 0.125rem;">
                    <span id="codeocr-possible-languages-selected-label">Select languages...</span>
                    <span style="font-size: 0.7em;">▼</span>
                </div>
                <div id="codeocr-possible-languages-dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border: 1px solid #4a4a4a; z-index: 10; max-height: 28.125rem; overflow-y: auto; border-radius: 0 0 0.25rem 0.25rem; box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.5);">
                    <input type="text" id="codeocr-possible-languages-search-input" placeholder="Search languages..." style="width: 100%; padding: 0.5rem; box-sizing: border-box; background-color: #252525; color: white; border: 1px solid #2d2d2d; font-size: 0.7em; margin: 0; outline: none;">
                    <div id="codeocr-possible-languages-checkboxes" style="padding: 0.3125rem;"></div>
                </div>
            </div>
        </div>
        <div class="setting-item" style="font-size: 0.6em;">
            <h4 style="margin-bottom: 0.3125rem; color: #00b4ff;">Shortcuts</h4>
            <ul style="margin: 0; padding-left: 1.25rem;">
                <li><strong style="color: #00b4ff;">Alt+C / ⌘+C:</strong> Start Capture</li>
                <li><strong style="color: #00b4ff;">Alt+Enter / ⌘+Enter:</strong> Copy & Close / Re-open</li>
                <li><strong style="color: #00b4ff;">Escape:</strong> Close Window</li>
            </ul>
        </div>
    </div>
  `;

  document.body.appendChild(modal);
  renderLanguageList();
  renderPossibleLanguagesCheckboxes(allLangsData); // Call the new function here

  const outputEditor = document.getElementById("codeocr-output-editor");
  const header = document.getElementById("codeocr-header");
  const copyBtn = document.getElementById("codeocr-copy");
  const closeBtn = document.getElementById("codeocr-close");
  const resizeHandle = document.getElementById("codeocr-resize-handle");

  currentLanguage = language;
  document.getElementById("codeocr-selected-language-label").textContent =
    capitalize(currentLanguage);
  outputEditor.textContent = code;

  makeDraggable(modal, header);
  makeResizable(modal, resizeHandle);

  const closeModal = () => {
    stopSpinner(outputEditor);
    lastBuffer.code = outputEditor.textContent;
    lastBuffer.language = currentLanguage;
    modal.remove();
  };

  closeBtn.addEventListener("click", closeModal);

  // --- Settings Panel Logic ---
  const settingsBtn = document.getElementById("codeocr-settings-btn");
  const settingsPanel = document.getElementById("codeocr-settings-panel");
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = settingsPanel.style.display === "block";
    settingsPanel.style.display = isVisible ? "none" : "block";
  });

  const fontSizeInput = document.getElementById("font-size-input");
  fontSizeInput.addEventListener("input", (e) => {
    const newSize = parseFloat(e.target.value);
    if (newSize >= 0.5) {
      outputEditor.style.fontSize = `${newSize}rem`;
      userFontSize = newSize;
      browser.storage.local.set({ codeocr_font_size: newSize });
    }
  });

  const guiScaleInput = document.getElementById("gui-scale-input");
  guiScaleInput.addEventListener("input", (e) => {
    const newScale = parseFloat(e.target.value);
    if (newScale >= 0.5 && newScale <= 2) {
      modal.style.transform = `scale(${newScale})`;
      browser.storage.local.set({ codeocr_gui_scale: newScale });
    }
  });

  // --- Language Preset Dropdown Logic ---
  const langPresetSearchContainer = document.getElementById(
    "codeocr-lang-preset-search-container",
  );
  const langPresetVisibleSelection = document.getElementById(
    "codeocr-lang-preset-visible-selection",
  );
  const langPresetSelectedLabel = document.getElementById(
    "codeocr-lang-preset-selected-label",
  );
  const langPresetDropdownList = document.getElementById(
    "codeocr-lang-preset-dropdown-list",
  );
  const langPresetSearchInput = document.getElementById(
    "codeocr-lang-preset-search-input",
  );
  const langPresetOptionsList = document.getElementById(
    "codeocr-lang-preset-options-list",
  );

  if (langPresetVisibleSelection && langPresetDropdownList) {
    langPresetVisibleSelection.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = langPresetDropdownList.style.display === "block";
      langPresetDropdownList.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        // If dropdown is now visible
        document.getElementById("codeocr-lang-preset-search-input").focus();
      }
    });
  }

  if (langPresetSearchInput && langPresetOptionsList) {
    langPresetSearchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      Array.from(langPresetOptionsList.children).forEach((li) => {
        li.style.display = li
          .getAttribute("data-value")
          .toLowerCase()
          .includes(query)
          ? "block"
          : "none";
      });
    });
  }

  if (langPresetOptionsList) {
    langPresetOptionsList.addEventListener("click", (e) => {
      const listItem = e.target.closest("li");
      if (listItem) {
        const newPreset = listItem.getAttribute("data-value");
        const newPresetText = listItem.textContent;

        langPresetSelectedLabel.textContent = newPresetText;
        browser.storage.local.set({ codeocr_lang_preset: newPreset });
        langPresetDropdownList.style.display = "none";
      }
    });

    handleDropdownKeyboardNavigation(
      langPresetSearchInput,
      langPresetOptionsList,
      langPresetDropdownList,
    );
  }

  // Initialize the selected label for language preset
  const initialLangPreset = settings.codeocr_lang_preset || "default";
  const initialLangPresetText =
    initialLangPreset === "default"
      ? "Default (Auto-Detect)"
      : capitalize(initialLangPreset);
  if (langPresetSelectedLabel) {
    langPresetSelectedLabel.textContent = initialLangPresetText;
  }

  // --- Main Language Selector Logic ---
  const mainSearchContainer = document.getElementById(
    "codeocr-language-search-container",
  );
  const mainVisibleSelection = document.getElementById(
    "codeocr-visible-selection",
  );
  const mainSelectedLabel = document.getElementById(
    "codeocr-selected-language-label",
  );
  const mainLanguageList = document.getElementById("codeocr-language-list");
  const mainSearchInput = document.getElementById("codeocr-search-input");
  const mainOptionsList = document.getElementById("codeocr-options-list");

  mainVisibleSelection.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = mainLanguageList.style.display === "block";
    mainLanguageList.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      // If dropdown is now visible
      mainSearchInput.focus();
    }
  });

  mainSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    Array.from(mainOptionsList.children).forEach((li) => {
      li.style.display = li
        .getAttribute("data-value")
        .toLowerCase()
        .includes(query)
        ? "block"
        : "none";
    });
  });

  mainOptionsList.addEventListener("click", (e) => {
    const listItem = e.target.closest("li");
    if (listItem) {
      const newLanguage = listItem.getAttribute("data-value");
      if (newLanguage === currentLanguage) {
        mainLanguageList.style.display = "none";
        return;
      }
      stopSpinner(outputEditor);
      currentLanguage = newLanguage;
      mainSelectedLabel.textContent = capitalize(currentLanguage);
      mainLanguageList.style.display = "none";
      outputEditor.textContent = `Re-analyzing with new language: ${capitalize(
        currentLanguage,
      )}...`;
      browser.runtime.sendMessage({
        command: "rerun_ocr",
        newLanguage: currentLanguage,
      });
    }
  });

  handleDropdownKeyboardNavigation(
    mainSearchInput,
    mainOptionsList,
    mainLanguageList,
  );

  // --- Global Click Listeners ---
  document.addEventListener("click", (e) => {
    if (!mainSearchContainer.contains(e.target))
      mainLanguageList.style.display = "none";
    if (!settingsBtn.contains(e.target) && !settingsPanel.contains(e.target))
      settingsPanel.style.display = "none";

    const possibleLangsSearchContainer = document.getElementById(
      "codeocr-possible-languages-search-container",
    );
    const possibleLangsDropdownList = document.getElementById(
      "codeocr-possible-languages-dropdown-list",
    );
    if (
      possibleLangsSearchContainer &&
      possibleLangsDropdownList &&
      !possibleLangsSearchContainer.contains(e.target)
    ) {
      possibleLangsDropdownList.style.display = "none";
    }

    const langPresetSearchContainer = document.getElementById(
      "codeocr-lang-preset-search-container",
    );
    const langPresetDropdownList = document.getElementById(
      "codeocr-lang-preset-dropdown-list",
    );
    if (
      langPresetSearchContainer &&
      langPresetDropdownList &&
      !langPresetSearchContainer.contains(e.target)
    ) {
      langPresetDropdownList.style.display = "none";
    }
  });

  // --- Possible Languages Dropdown Logic ---
  const possibleLangsVisibleSelection = document.getElementById(
    "codeocr-possible-languages-visible-selection",
  );
  const possibleLangsDropdownList = document.getElementById(
    "codeocr-possible-languages-dropdown-list",
  );

  if (possibleLangsVisibleSelection && possibleLangsDropdownList) {
    if (possibleLangsVisibleSelection && possibleLangsDropdownList) {
      possibleLangsVisibleSelection.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = possibleLangsDropdownList.style.display === "block";
        possibleLangsDropdownList.style.display = isVisible ? "none" : "block";
        if (!isVisible) {
          // If dropdown is now visible
          document
            .getElementById("codeocr-possible-languages-search-input")
            .focus();
        }
      });
    }

    // --- Possible Languages Search Logic ---
    const possibleLangsSearchInput = document.getElementById(
      "codeocr-possible-languages-search-input",
    );
    const possibleLangsCheckboxes = document.getElementById(
      "codeocr-possible-languages-checkboxes",
    );

    if (possibleLangsSearchInput && possibleLangsCheckboxes) {
      possibleLangsSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        Array.from(possibleLangsCheckboxes.children).forEach((div) => {
          const label = div.querySelector("label");
          if (label) {
            div.style.display = label.textContent.toLowerCase().includes(query)
              ? "flex"
              : "none";
          }
        });
      });

      handleDropdownKeyboardNavigation(
        possibleLangsSearchInput,
        possibleLangsCheckboxes,
        possibleLangsDropdownList,
      );
    }
  }

  // --- Copy Logic ---
  copyBtn.addEventListener("click", () => {
    stopSpinner(outputEditor);
    const contentToCopy = outputEditor.textContent;
    navigator.clipboard.writeText(contentToCopy).then(() => {
      lastBuffer.code = contentToCopy;
      lastBuffer.language = currentLanguage;
      copyBtn.style.backgroundColor = "#00a878";
      copyBtn.textContent = "Copied! Closing...";
      setTimeout(closeModal, 700);
    });
  });

  // --- Spinner Logic ---
  if (isLoading) {
    outputEditor.style.fontSize = "3rem";
    outputEditor.style.textAlign = "center";
    let frameIndex = 0;
    spinnerIntervalId = setInterval(() => {
      outputEditor.textContent = spinner.frames[frameIndex];
      frameIndex = (frameIndex + 1) % spinner.frames.length;
    }, spinner.interval);
  }
}

// ==========================================================
// GLOBAL LISTENERS
// ==========================================================

document.addEventListener("keydown", (e) => {
  const modal = document.getElementById(UI_ID);
  if ((e.altKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (modal) document.getElementById("codeocr-copy")?.click();
    else if (lastBuffer.code !== null)
      createDisplayModal(lastBuffer.code, lastBuffer.language);
  }
  if (modal && e.key === "Escape") {
    e.preventDefault();

    const langList = document.getElementById("codeocr-language-list");
    const langPresetList = document.getElementById(
      "codeocr-lang-preset-dropdown-list",
    );
    const possibleLangsList = document.getElementById(
      "codeocr-possible-languages-dropdown-list",
    );

    if (langList && langList.style.display === "block") {
      langList.style.display = "none";
    } else if (
      langPresetList &&
      langPresetList.style.display === "block"
    ) {
      langPresetList.style.display = "none";
    } else if (
      possibleLangsList &&
      possibleLangsList.style.display === "block"
    ) {
      possibleLangsList.style.display = "none";
    } else {
      document.getElementById("codeocr-close")?.click();
    }
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.command === "show_loading_modal") {
    if (message.languages) {
      availableLanguages = message.languages;
    }
    createDisplayModal(". . .", "plain text", message.allLangs);
    return true;
  } else if (message.command === "update_display" && message.text) {
    const outputEditor = document.getElementById("codeocr-output-editor");
    stopSpinner(outputEditor);
    if (outputEditor) {
      const extracted = extractCodeFromMarkdown(message.text);
      outputEditor.textContent = extracted.code;

      // Always update the current language to what the API returned.
      currentLanguage = extracted.language;
      const selectedLabel = document.getElementById(
        "codeocr-selected-language-label",
      );
      if (selectedLabel) {
        selectedLabel.textContent = capitalize(currentLanguage);
      }

      lastBuffer.code = extracted.code;
      lastBuffer.language = currentLanguage;

      if (message.languages) {
        availableLanguages = message.languages;
        renderLanguageList();
      }
    }
    return true;
  }
});
