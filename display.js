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
    optionsList.innerHTML = ""; // Clear first
    availableLanguages.forEach((lang) => {
      const li = document.createElement("li");
      li.dataset.value = lang;
      li.style.padding = "0.375rem 0.5rem";
      li.style.cursor = "pointer";
      li.style.fontSize = "0.7em";
      li.style.textTransform = "capitalize";
      li.style.transition = "background-color 0.1s";

      li.addEventListener(
        "mouseover",
        () => (li.style.backgroundColor = "#2f2f2f"),
      );
      li.addEventListener(
        "mouseout",
        () => (li.style.backgroundColor = "transparent"),
      );

      li.textContent = capitalize(lang);
      optionsList.appendChild(li);
    });
  }

  if (langPresetOptionsList) {
    langPresetOptionsList.innerHTML = "";
    const defaultLi = document.createElement("li");
    defaultLi.dataset.value = "default";
    defaultLi.textContent = "Default (Auto-Detect)";
    defaultLi.style.padding = "0.375rem 0.5rem";
    defaultLi.style.cursor = "pointer";
    defaultLi.style.fontSize = "0.7em";
    defaultLi.style.textTransform = "capitalize";
    defaultLi.style.transition = "background-color 0.1s";
    defaultLi.addEventListener(
      "mouseover",
      () => (defaultLi.style.backgroundColor = "#2f2f2f"),
    );
    defaultLi.addEventListener(
      "mouseout",
      () => (defaultLi.style.backgroundColor = "transparent"),
    );

    langPresetOptionsList.appendChild(defaultLi);

    availableLanguages.forEach((lang) => {
      const li = document.createElement("li");
      li.dataset.value = lang;
      li.style.padding = "0.375rem 0.5rem";
      li.style.cursor = "pointer";
      li.style.fontSize = "0.7em";
      li.style.textTransform = "capitalize";
      li.style.transition = "background-color 0.1s";
      li.addEventListener(
        "mouseover",
        () => (li.style.backgroundColor = "#2f2f2f"),
      );
      li.addEventListener(
        "mouseout",
        () => (li.style.backgroundColor = "transparent"),
      );
      li.textContent = capitalize(lang);
      langPresetOptionsList.appendChild(li);
    });
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
  const code = textOrCode;
  const language = initialLanguage;

  const settings = await browser.storage.local.get([
    "codeocr_font_size",
    "codeocr_lang_preset",
    "codeocr_gui_scale",
  ]);
  userFontSize = settings.codeocr_font_size || 2;
  const userGuiScale = settings.codeocr_gui_scale || 1;

  loadArimoFont();
  stopSpinner();

  // Remove existing modal
  const existingModal = document.getElementById(UI_ID);
  if (existingModal) existingModal.remove();

  // Create modal
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
    minWidth: "18.75rem",
    minHeight: "12.5rem",
    backgroundColor: "#191919",
    color: "#f0efed",
    border: "1px solid #30302e",
    borderRadius: "0.5rem",
    boxShadow: "0 0.25rem 0.75rem rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Arimo', sans-serif",
  });

  // Header
  const header = document.createElement("div");
  header.id = "codeocr-header";
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0.9375rem",
    backgroundColor: "#252526",
    borderBottom: "1px solid #00b4ff",
    cursor: "move",
  });

  const titleDiv = document.createElement("div");
  titleDiv.style.display = "flex";
  titleDiv.style.alignItems = "center";
  titleDiv.style.gap = "0.625rem";

  const h2 = document.createElement("h2");
  h2.style.color = "#00b4ff";
  h2.style.margin = "0";
  h2.style.fontSize = "1.6em";
  h2.textContent = "CodeOCR";

  titleDiv.appendChild(h2);
  header.appendChild(titleDiv);

  modal.appendChild(header);

  // Output Editor
  const outputEditor = document.createElement("div");
  outputEditor.id = "codeocr-output-editor";
  outputEditor.contentEditable = "true";
  outputEditor.spellcheck = false;
  outputEditor.style.flexGrow = "1";
  outputEditor.style.padding = "0.9375rem";
  outputEditor.style.overflow = "auto";
  outputEditor.style.whiteSpace = "pre-wrap";
  outputEditor.style.fontFamily = "inherit";
  outputEditor.style.fontSize = `${userFontSize}rem`;
  outputEditor.style.lineHeight = "1.4";
  outputEditor.style.caretColor = "white";
  outputEditor.style.outline = "none";
  outputEditor.style.cursor = "text";
  outputEditor.textContent = code;

  modal.appendChild(outputEditor);

  document.body.appendChild(modal);

  // Render lists safely
  renderLanguageListSafely();
  await renderPossibleLanguagesCheckboxes(allLangsData);

  currentLanguage = language;
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
    } else if (langPresetList && langPresetList.style.display === "block") {
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
