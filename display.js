// --- Global State and Constants ---
let lastBuffer = { code: null, language: null };
const UI_ID = "codeocr-result-modal";
let availableLanguages = [];
let currentLanguage; // Holds the language selected in the dropdown
let userFontSize = 2; // Default font size in rem
let selectedPossibleLanguages = []; // New: To store selected languages from checkboxes

const spinner = {
  interval: 80,
  frames: [
    "                    ⠋",
    "                    ⠙",
    "                    ⠚",
    "                    ⠞",
    "                    ⠖",
    "                    ⠦",
    "                    ⠴",
    "                    ⠲",
    "                    ⠳",
    "                    ⠓",
  ],
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
  const langPresetSelect = document.getElementById("lang-preset-select");

  if (optionsList) {
    optionsList.innerHTML = availableLanguages
      .map(
        (lang) =>
          `<li data-value="${lang}" style="padding: 6px 8px; cursor: pointer; font-size: 1.3em; text-transform: capitalize; transition: background-color 0.1s;" onmouseover="this.style.backgroundColor='#2f2f2f'" onmouseout="this.style.backgroundColor='transparent'">${capitalize(
            lang
          )}</li>`
      )
      .join("");
  }

  if (langPresetSelect) {
    const currentValue = langPresetSelect.value;
    langPresetSelect.innerHTML = `
      <option value="default">Default (Auto-Detect)</option>
      ${availableLanguages
        .map((lang) => `<option value="${lang}">${capitalize(lang)}</option>`)
        .join("")}
    `;
    langPresetSelect.value = currentValue;
  }
}

async function renderPossibleLanguagesCheckboxes(allLangsData) {
    const checkboxesDiv = document.getElementById("codeocr-possible-languages-checkboxes");
    const selectedLabel = document.getElementById("codeocr-possible-languages-selected-label");
    if (!checkboxesDiv || !selectedLabel) return;

    const result = await browser.storage.local.get(['selectedLanguages']);
    selectedPossibleLanguages = result.selectedLanguages || [];

    checkboxesDiv.innerHTML = '';

    allLangsData.forEach((language, index) => {
        const div = document.createElement('div');
        div.classList.add('language-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `possible-lang-${language.id}`;
        checkbox.value = language.id;
        checkbox.dataset.langIndex = index;
        checkbox.dataset.langName = language.name;
        checkbox.dataset.langNative = language.native;

        if (selectedPossibleLanguages.some(sl => sl.id === language.id)) {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', (event) => {
            togglePossibleLanguageSelection(language, index, event.target.checked);
            updatePossibleLanguagesSelectedLabel();
        });

        const label = document.createElement('label');
        label.htmlFor = `possible-lang-${language.id}`;
        label.textContent = language.native;
        label.style.fontSize = "1.1em";
        label.style.marginLeft = "5px";

        div.appendChild(checkbox);
        div.appendChild(label);
        checkboxesDiv.appendChild(div);
    });
    updatePossibleLanguagesSelectedLabel();
}

function updatePossibleLanguagesSelectedLabel() {
    const selectedLabel = document.getElementById("codeocr-possible-languages-selected-label");
    if (!selectedLabel) return;

    if (selectedPossibleLanguages.length === 0) {
        selectedLabel.textContent = "Select languages...";
    } else {
        selectedLabel.textContent = selectedPossibleLanguages.map(l => l.name).join(", ");
    }
}

function togglePossibleLanguageSelection(language, index, isChecked) {
    const existingIndex = selectedPossibleLanguages.findIndex(sl => sl.id === language.id);

    if (isChecked) {
        if (existingIndex === -1) {
            selectedPossibleLanguages.push({
                index: index,
                name: language.name,
                id: language.id,
                native: language.native
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

async function createDisplayModal(textOrCode, initialLanguage = null, allLangsData = []) {
  const isLoading = textOrCode === ". . .";
  let code = textOrCode;
  let language = initialLanguage;

  const settings = await browser.storage.local.get([
    "codeocr_font_size",
    "codeocr_lang_preset",
  ]);
  userFontSize = settings.codeocr_font_size || 2;

  loadArimoFont();
  stopSpinner();

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
    fontFamily: "'Arimo', sans-serif",
  });

  modal.innerHTML = `
    <div id="codeocr-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background-color: #252526; border-bottom: 1px solid #00b4ff; cursor: move;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <h2 style="color: #00b4ff; margin: 0; font-size: 1.6em;">CodeOCR</h2>
            <div id="codeocr-language-search-container" style="position: relative; width: 200px;">
                <div id="codeocr-visible-selection" style="padding: 4px 8px; border-radius: 6px; background-color: #4a4a4a; color: white; border: 1px solid #4a4a4a; font-size: 1.1em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-transform: capitalize;">
                    <span id="codeocr-selected-language-label">Plain Text</span>
                    <span style="font-size: 0.7em;">▼</span>
                </div>
                <div id="codeocr-language-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border-top: none; z-index: 2147483648; max-height: 40vh; overflow-y: auto; border-radius: 0 0 4px 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);">
                    <input id="codeocr-search-input" type="text" placeholder="Search for language..." style="width: 100%; padding: 8px; box-sizing: border-box; background-color: #252525; color: white; border: 1px solid #2d2d2d; font-size: 1.3em; margin: 0; outline: none;">
                    <ul id="codeocr-options-list" style="list-style: none; padding: 0; margin: 0;">
                    </ul>
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center;">
            <button id="codeocr-settings-btn" style="background: none; border: none; color: #d4d4d4; font-size: 1.5em; cursor: pointer; padding: 0 10px;">•••</button>
            <button id="codeocr-close" style="background: none; border: none; color: #d4d4d4; font-size: 2.2em; cursor: pointer; padding: 0 5px;">&times;</button>
        </div>
    </div>
    <div id="codeocr-output-editor" contenteditable="true" spellcheck="false" style="flex-grow: 1; padding: 15px; margin: 0; overflow: auto; white-space: pre-wrap; font-family: inherit; font-size: ${userFontSize}rem; line-height: 1.4; caret-color: white; outline: none; cursor: text;"></div>
    <button id="codeocr-copy" style="padding: 8px 15px; background-color: #007acc; color: white; border: none; border-radius: 0 0 8px 8px; cursor: pointer; font-size: 1em; transition: background-color 0.2s;">Copy (Alt+Enter)</button>
    <div id="codeocr-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 15px; height: 15px; background: transparent; cursor: nwse-resize;"></div>
    
    <div id="codeocr-settings-panel" style="display: none; position: absolute; top: 48px; right: 5px; background: #252526; border: 1px solid #30302e; border-radius: 8px; padding: 15px; z-index: 10; width: 300px; color: #f0efed; font-size: 2rem;">
        <h3 style="margin-top: 0; color: #00b4ff; font-size: 0.8em;">Settings</h3>
        <div class="setting-item" style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 0.7em;">
            <label for="font-size-input">Font Size (rem):</label>
            <input type="number" id="font-size-input" min="0.5" max="5" step="0.1" value="${userFontSize}" style="width: 40px; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; padding: 4px; font-size: 1em; -moz-appearance: textfield; appearance: textfield; outline: none; border-color: white; border-radius: 2px;" onfocus="this.style.borderColor='white'" onblur="this.style.borderColor='#4a4a4a'">
        </div>
        <div class="setting-item" style="margin-bottom: 15px; font-size: 0.7em;">
            <label for="lang-preset-select" style="display: block; margin-bottom: 5px;">Default Language Preset</label>
            <select id="lang-preset-select" style="width: 100%; padding: 5px; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; font-size: 1em; border-radius: 2px;">
            </select>
        </div>
        <div class="setting-item" style="margin-bottom: 15px; font-size: 0.7em;">
            <label style="display: block; margin-bottom: 5px;">Native Languages:</label>
            <div id="codeocr-possible-languages-search-container" style="position: relative;">
                <div id="codeocr-possible-languages-visible-selection" style="padding: 5px; background: #3a3a3a; color: white; border: 1px solid #4a4a4a; font-size: 1em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 2px;">
                    <span id="codeocr-possible-languages-selected-label">Select languages...</span>
                    <span style="font-size: 0.7em;">▼</span>
                </div>
                <div id="codeocr-possible-languages-dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; background-color: #3a3a3a; border: 1px solid #4a4a4a; z-index: 10; max-height: 150px; overflow-y: auto; border-radius: 0 0 4px 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);">
                    <div id="codeocr-possible-languages-checkboxes" style="padding: 5px;"></div>
                </div>
            </div>
        </div>
        <div class="setting-item" style="font-size: 0.6em;">
            <h4 style="margin-bottom: 5px; color: #00b4ff;">Shortcuts</h4>
            <ul style="margin: 0; padding-left: 20px;">
                <li><strong style="color: #00b4ff;">Alt+C / Cmd+C:</strong> Start Capture</li>
                <li><strong style="color: #00b4ff;">Alt+Enter:</strong> Copy & Close / Re-open</li>
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

  const langPresetSelect = document.getElementById("lang-preset-select");
  langPresetSelect.value = settings.codeocr_lang_preset || "default";
  langPresetSelect.addEventListener("change", (e) => {
    browser.storage.local.set({ codeocr_lang_preset: e.target.value });
  });

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
    mainLanguageList.style.display =
      mainLanguageList.style.display === "block" ? "none" : "block";
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
      outputEditor.textContent = `Re-analyzing with new language: ${capitalize(currentLanguage)}...`;
      browser.runtime.sendMessage({
        command: "rerun_ocr",
        newLanguage: currentLanguage,
      });
    }
  });

  // --- Global Click Listeners ---
  document.addEventListener("click", (e) => {
    if (!mainSearchContainer.contains(e.target))
      mainLanguageList.style.display = "none";
    if (!settingsBtn.contains(e.target) && !settingsPanel.contains(e.target))
      settingsPanel.style.display = "none";
    
    const possibleLangsSearchContainer = document.getElementById("codeocr-possible-languages-search-container");
    const possibleLangsDropdownList = document.getElementById("codeocr-possible-languages-dropdown-list");
    if (possibleLangsSearchContainer && possibleLangsDropdownList && !possibleLangsSearchContainer.contains(e.target)) {
        possibleLangsDropdownList.style.display = "none";
    }
  });

  // --- Possible Languages Dropdown Logic ---
  const possibleLangsVisibleSelection = document.getElementById("codeocr-possible-languages-visible-selection");
  const possibleLangsDropdownList = document.getElementById("codeocr-possible-languages-dropdown-list");

  if (possibleLangsVisibleSelection && possibleLangsDropdownList) {
      possibleLangsVisibleSelection.addEventListener("click", (e) => {
          e.stopPropagation();
          possibleLangsDropdownList.style.display = possibleLangsDropdownList.style.display === "block" ? "none" : "block";
      });
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
  if (e.altKey && e.key === "Enter") {
    e.preventDefault();
    if (modal) document.getElementById("codeocr-copy")?.click();
    else if (lastBuffer.code !== null)
      createDisplayModal(lastBuffer.code, lastBuffer.language);
  }
  if (modal && e.key === "Escape") {
    e.preventDefault();
    document.getElementById("codeocr-close")?.click();
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