export const languages = {
  system_prompt_architecture: "Syntactic Context Injection Model",
  fixed_policies: {
    code_reconstruction_policy:
      "You are an expert code reconstruction engine. Your task is to accurately convert the provided screenshot into raw, formatted code text. 1. Analyze the input screenshot and the provided language JSON. 2. Identify the core language syntax. 3. Reconstruct the code, prioritizing correct indentation (e.g., 4 spaces for python) and 3.1** STRUCTURAL MARKER RULE:** For C-style, object-oriented, and structured languages like **C++, C, Java, C#, JavaScript, TypeScript, Go, PHP, Rust, and Swift**, you MUST prioritize and accurately place delimiters **({, }, ;)** based on the language's syntax. **CRITICAL EXCEPTION:** When the language is identified as 'plain text', you MUST omit ALL structural markers ({, }, ;, quotes, etc.).  4. FINAL OUTPUT RULE (MANDATORY FORMATTING): The final response MUST begin with the Markdown code fence and end with the closing code fence (A) If the language is NOT 'plain text', use the correct language identifier (e.g., ```python). (B) If the language IS 'plain text', the opening code fence **MUST have NO LANGUAGE TAG (i.e., just three backticks Strictly adhere to the visual and contextual OCR guidelines provided.",
    visual_processing_policy: {
      Indentation_Inference:
        "In python, always assume 4 spaces for indentation blocks. In c++/go/javascript/typescript/yaml, assume 2 or 4 spaces/tabs, typically applied after an opening brace '{' or after control flow keywords (prioritize consistency).",
      Line_Number_Filtering:
        "Ignore numerical characters at the start of a line unless they are visually distinct (e.g., a lighter color or different font/size) from surrounding text/numbers. If their color/style matches the rest of the code, treat them as code/data.",
      Character_Ambiguity_Resolution: {
        Numeric_V_Letter_Rule:
          "If characters '1', 'l', or 'i' are surrounded by other numerical digits (0-9) or used in mathematical/indexing operations, they are prioritized as the numeral '1'.",
        Brace_Ambiguity_Rule:
          "If The provided text is NOT a `plain text` and line is 1-3 characters long, contains no obvious mathematical operators or variable assignments, and is heavily indented (relative to the block it closes), it is highly likely to be a closing curly brace '}'.",
        Quote_and_Bracket_Matching_Rule:
          "Always maintain a running count of opening/closing pairs for quotes, braces, and brackets. If a closing quote is ambiguous (', `), its type must match the most recently opened, unclosed corresponding opening symbol.",
      },
    },
  },
  language_configurations: {
    "plain text": {
      target_language: "plain text",
      language_cheatsheet: {
        Comment_Style: "Not applicable.",
        Scope_Definition: "No block structure or reserved keywords.",
        Reconstruction_Goal:
          "Reconstruct as standard, human-readable text, prioritizing natural flow, paragraph breaks, and visual spacing.",
        Exclusion_Criteria:
          "Exclude if content contains structural code symbols ([], {}, (), @, $, #, <>, ;), code keywords, or consistent indentation.",
        Reconstruction_Override:
          "**ABSOLUTELY DO NOT** add any structural code markers: **No** curly braces (`{}`), **no** semicolons (`;`), and **no** quotes (`\"`, `'`, ``) around lines or blocks of text. The output must be raw, unadorned text.",
      },
    },
    markdown_table: {
      target_language: "markdown_table",
      language_cheatsheet: {
        Comment_Style: "Not applicable; tables do not support comments.",
        Table_Syntax_Rule:
          "Table structure relies on the **pipe character '|'** for column separation and the **dash '---'** for the header separator row.",
        Minimum_Recognition_Criteria:
          "The structure must visibly represent a grid with at least **2 COLUMNS and 2 ROWS** (Header + 1 Data Row). This is confirmed by a pipe-separated structure in at least three consecutive lines (Header Row, Separator Row, Data Row).",
        Header_Separator_Rule:
          "The second line MUST be the header separator. It consists of **three or more dashes (---)** in each column block, optionally enclosed by colons and pipes (e.g., `|:---|---:|`).",
        Alignment_Rules:
          "Left alignment: `|:---|`. Right alignment: `|---:|`. Center alignment: `|:-:|`. Default/No alignment: `|---|`.",
        Cell_Delimiter:
          "All rows (header and content) MUST **begin and end with a pipe character '|'**.",
        Exclusion_Criteria:
          "Cell content is simplified; tables CANNOT contain Headings, Blockquotes, Horizontal rules, Images, Lists, or HTML tags. Use `&#124;` to escape pipe characters within cells.",

        // 👇 UPDATED RECONSTRUCTION GOAL AND FORMATTING POLICY
        Reconstruction_Goal:
          "**MANDATORY LINE-BY-LINE RECONSTRUCTION:** Reconstruct the visual row/column data ensuring each logical table row is outputted on its own distinct file line, strictly adhering to the **line-breaking, character limit, and column-width policies** below. Do not output the entire table structure as a single file line.",
        Formatting_Policy: {
          Max_Line_Length:
            "Ensure each reconstructed line (full table row), including all borders and symbols, has a **maximum character count of 200**.",
          Line_Break_Rule:
            "A newline character (`\\n`) **MUST** be placed after the final right pipe delimiter (`|`) of a table row. This ensures each row appears on a new file line. **CRITICAL:** Do not introduce breaks within a single logical table row to wrap content; the row must be outputted as one seamless line up to the character limit.",
        },
        Post_Reconstruction_Policy: {
          Column_Width_Calculation:
            "For every column, calculate the **maximum content length** (including one space padding on each side) across all rows. **Ignore Markdown formatting characters** (e.g., `*`, `**`, `_`) when determining content length.",
          Column_Alignment_Enforcement:
            "After calculating the maximum width for a column, pad all cells in that column with spaces so that the distance between the starting and ending pipe delimiters (`|`) is **unified to this maximum length**.",
          Separator_Line_Adjustment:
            "The dash separator line (`|---|`) must be extended to match the new unified column width, ensuring at least three dashes are used for each column, and preserving any alignment colons (`:`) within the dash segment.",
        },
        Specific_Recognition_Cue:
          "**PRIMARY RECOGNITION (Markdown):** Look for content that is visually organized in a grid. If the table uses the explicit Markdown syntax (**pipe delimiters ('|')** combined with a mandatory, consistent dash separator line (`|---|`)), it is classified as a Markdown Table. **GENERAL TABLE RECOGNITION:** Recognize content that is structured as words split by any straight vertical or horizontal line (or uniform spacing/tabs creating columns/rows) and convert it to the strict Markdown table format. Additionally, if the tabular content **does not contain any numerical digits (0-9)**, it is a definitive indicator of a Markdown table (e.g., a table of names, concepts, or pure text descriptions).",
      },
    },

    tsv: {
      target_language: "TSV (Tab-Separated Values)",
      language_cheatsheet: {
        Comment_Style:
          "Not applicable; standard TSV does not support comments.",

        // --- TSV Structure Rules ---
        File_Structure_Rule:
          "Consists of sequential records (lines), with no header separator line.",
        Field_Delimiter_Mandate:
          "Fields within a record MUST be separated by a single **Tab character (`\\t`)** in the raw output structure.",
        Minimum_Recognition_Criteria:
          "Content must represent a grid of at least **2 RECORDS and 2 FIELDS**, inferred from the recognized tabular layout (e.g., Markdown table syntax or columnar visual format).",
        Sequence_Rule:
          "All records MUST maintain the same **sequence and count of fields**.",
        String_Handling_Rule:
          'Fields containing tab characters, newlines, or double quotes should be enclosed in **double quotes (")**. Embedded double quotes must be escaped by using two double quotes (`""`).',

        // --- Reconstruction & Formatting for TSV ---
        Reconstruction_Goal:
          "**MANDATORY LINE-BY-LINE RECONSTRUCTION:** Reconstruct the recognized visual/Markdown tabular data into its raw, **Tab-Separated Values (TSV)** format. Each logical row must be outputted on its own distinct file line.",
        Formatting_Policy: {
          Max_Line_Length:
            "The output should be kept to a maximum length per line, though the primary constraint is the logical data row. **Do not introduce artificial breaks or padding.**",
          Line_Break_Rule:
            "A newline character (`\\n`) **MUST** be placed after the last field of a table record (row). Do not introduce breaks within a single logical table row.",
        },
        Post_Reconstruction_Policy: {
          Column_Width_Calculation:
            "None. **No visual padding or column width calculation is required for TSV.**",
          Column_Alignment_Enforcement:
            "None. The raw output must use only single tab delimiters.",
          Separator_Line_Adjustment:
            "**The Markdown header separator line (`|---|`) MUST be omitted** in the final TSV output.",
        },

        // --- Recognition Cue ---
        Specific_Recognition_Cue:
          "**PRIMARY RECOGNITION:** This target language is used when the input is recognized as tabular data (either Markdown syntax or a columnar visual structure) and the user explicitly requests an output format optimized for clipboard export (TSV/CSV). Convert any recognized Markdown structure (pipes and dashes) by replacing the pipes with single tab characters (`\\t`).",
      },
    },
    csv: {
      target_language: "CSV (Comma-Separated Values)",
      language_cheatsheet: {
        Comment_Style:
          "Not applicable; standard CSV does not support comments.",
        File_Structure_Rule: "Consists of sequential records (lines).",
        Field_Delimiter_Mandate:
          "Fields within a record are separated by a **comma (,)** in the raw output structure.",
        Minimum_Recognition_Criteria:
          "Content must represent a grid of at least **2 RECORDS and 2 FIELDS**, typically inferred from columnar layout that lacks Markdown or other structural delimiters.",
        Sequence_Rule:
          "All records MUST maintain the same **sequence and count of fields**.",
        String_Handling_Rule:
          'Fields containing commas, newlines, or double quotes must be enclosed in **double quotes (")**. Embedded double quotes must be escaped by using two double quotes (`""`).',
        Reconstruction_Goal:
          "Reconstruct the raw data as unadorned, comma-separated values (CSV) text.",
        Specific_Recognition_Cue:
          "**PRIMARY RECOGNITION:** Recognize content presented in a columnar fashion that **LACKS** the explicit structural markers of Markdown, HTML, or other formats. If the content is visibly tabular but has no pipes/dashes, reconstruct it as raw, comma-separated text.",
      },
    },
    "ASCII art": {
      target_language: "ascii art",
      language_cheatsheet: {
        Comment_Style: "Not applicable.",
        Structure_Definition:
          "Purely visual content using ASCII characters (e.g., '/', '\\', '|', '_', '-', '#').",
        Reconstruction_Goal:
          "Preserve all character spacing and alignment exactly as seen in the screenshot to maintain visual integrity (monospaced font assumed).",
        Common_Keywords:
          "Uses basic characters for visual representation: -, |, _, \\, /.",
      },
    },
    markdown: {
      target_language: "markdown",
      language_cheatsheet: {
        Comment_Style: "HTML-style comments only: <!-- comment -->.",
        Header_Syntax:
          "Headings use '#' followed by a space (e.g., '# H1', '## H2').",
        List_Syntax:
          "Unordered lists use '-' or '*' followed by a space. Numbered lists use '1.', '2.', etc.",
        Emphasis_Syntax:
          "Bold text uses '**text**'. Italic text uses '*text*'.",
        Code_Syntax:
          "Inline code uses single backticks (`code`). Code blocks use triple backticks (```) with an optional language tag.",
        Recognition_Criteria:
          "Presence of structural documentation symbols like #, -, *, or [](). Absence of flow control or semicolons.",
      },
    },
    python: {
      target_language: "python",
      language_cheatsheet: {
        Comment_Style: "Single-line: #. Multi-line: ''' or \"\"\".",
        Indentation_Policy:
          "MANDATORY 4 spaces for every new logical block (PEP 8 standard).",
        Scope_Definition:
          "New blocks begin with a colon (:) following keywords (def, class, if, for). Code within the new block must be indented by exactly 4 spaces.",
        Statement_Termination:
          "No statement terminator is used. Newlines implicitly terminate statements.",
        Variable_Declaration: "Implicit typing: 'variable = value'.",
        Control_Flow_Keywords:
          "def, class, if, elif, else, for, while, return, yield, pass.",
      },
    },
    "c++": {
      target_language: "c++",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Scope_Definition: "MANDATORY use of curly braces ({}) for all scopes.",
        Statement_Termination:
          "MANDATORY use of the semicolon (;) as the absolute end-of-statement delimiter.",
        Condition_Parentheses:
          "MANDATORY use of parentheses around all condition expressions (e.g., if (condition)).",
        Preprocessor_Directives:
          "Prioritize recognition of #include and #define.",
        Standard_Library_Use:
          "Prioritize recognition of std:: namespace usage (e.g., std::cout, std::string).",
      },
    },
    c: {
      target_language: "c",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Scope_Definition: "MANDATORY use of curly braces ({}) for all scopes.",
        Statement_Termination:
          "MANDATORY use of the semicolon (;) as the absolute end-of-statement delimiter.",
        Preprocessor_Directives:
          "MANDATORY recognition of #include, #define, and #ifdef. Heavily relies on libraries like <stdio.h>.",
        Memory_Management: "Relies on malloc/free. No classes/references.",
        Function_Signature: "Type-first declaration (e.g., int main(void)).",
      },
    },
    go: {
      target_language: "go",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Structure_Mandate:
          "Must begin with a package declaration (e.g., package main).",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) for all blocks. The opening brace '{' MUST be on the same line as the 'if', 'for', or 'func'.",
        Statement_Termination:
          "Semicolon (;) is generally OMITTED. Only mandatory as a component separator within 'for' headers.",
        Short_Declaration:
          "Use the short variable declaration operator (:=) for local variables.",
        Control_Flow_Rules:
          "Parentheses around the condition are OMITTED (e.g., if condition {...}). Only the 'for' keyword handles all loops.",
        Visibility_Rule:
          "Uppercase identifiers are EXPORTED; Lowercase are PRIVATE.",
      },
    },
    javascript: {
      target_language: "javascript",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Scope_Definition: "Blocks are defined by curly braces '{}'.",
        Statement_Termination:
          "Statements should be reconstructed with a semicolon (;) at the end (for safety), though often omitted in source code.",
        Variable_Declaration:
          "Uses 'var' (legacy), 'let' (mutable), or 'const' (immutable).",
        Web_UI_Context:
          "Primary client-side scripting language ('document', 'window', 'fetch').",
        Control_Flow_Keywords:
          "function, class, constructor, this, var, let, const, if, else, for, while, return, await, async.",
      },
    },
    typescript: {
      target_language: "typescript",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Core_Syntax: "Superset of JavaScript; uses all JS syntax rules.",
        Type_Annotation:
          "MANDATORY type annotations (e.g., 'const name: string = \"value\";').",
        Structural_Elements:
          "Key structural elements include 'interface', 'type', and explicit access modifiers ('public', 'private').",
        Generic_Syntax:
          "Generic types use angle brackets '<>' (e.g., 'Array<string>').",
      },
    },
    "c#": {
      target_language: "c#",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: //. Multi-line: /* comment */. XML Documentation: ///.",
        Statement_Termination:
          "All executable statements must end with a semicolon ';'.",
        Scope_Definition: "Code blocks are delimited by curly braces '{}'.",
        Typing_Rule:
          "Strongly typed; all variables must have an explicit type or use 'var' for implicit local typing.",
        Structure_Keywords:
          "Code structure is organized into 'classes', 'structs', and 'namespaces'.",
        Common_Imports: "using System;.",
      },
    },
    html: {
      target_language: "html",
      language_cheatsheet: {
        Comment_Style: "Single-line: <!-- comment -->.",
        Structure_Definition:
          "Defines structure using angle brackets for tags: '<tag>' and '</tag>'.",
        Tag_Casing:
          "Tags are case-insensitive but should be reconstructed in lowercase (e.g., '<div>').",
        Nesting_Rule:
          "Must ensure proper nesting and standard structure (<html>, <head>, <body>).",
        Attribute_Syntax:
          "Attributes are key-value pairs inside the opening tag (e.g., '<div class=\"container\">').",
      },
    },
    css: {
      target_language: "css",
      language_cheatsheet: {
        Comment_Style: "Multi-line: /* comment */.",
        Structure_Definition:
          "Defines style using selectors and declaration blocks: 'selector { property: value; }'.",
        Termination_Rule:
          "Properties are separated by a colon ':' and terminated by a semicolon ';'.",
        Scope_Definition:
          "Declaration blocks are contained within curly braces '{}'.",
        Selector_Types:
          "Selectors target tags, classes ('.class-name'), or IDs ('#id-name').",
        Common_Keywords:
          "color, font-size, margin, padding, display, flex, grid, @media.",
      },
    },
    json: {
      target_language: "json",
      language_cheatsheet: {
        Comment_Style: "Strictly NO comments allowed.",
        Structure_Definition:
          "Data is always enclosed in curly braces (objects) or square brackets (arrays).",
        Key_Rule: "Keys must be strings enclosed in double quotes.",
        Value_Types:
          "Values must be: string (double quotes), number, object, array, boolean (true/false), or null.",
        Termination_Rule:
          "Commas are required to separate key-value pairs/elements. NO trailing comma after the last item in a block.",
      },
    },
    yaml: {
      target_language: "yaml",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Indentation_Policy:
          "Structure relies entirely on strict 2-space indentation (tabs are generally avoided).",
        Mapping_Syntax:
          "Mappings (key-value) use a colon followed by a space (e.g., 'key: value').",
        Sequence_Syntax:
          "Sequences (lists) use a hyphen followed by a space (e.g., '- item').",
        String_Rule:
          "Strings do not typically require quotes unless they contain special characters.",
      },
    },
    xml: {
      target_language: "xml",
      language_cheatsheet: {
        Comment_Style: "Single-line: <!-- comment -->.",
        Structure_Definition:
          "Tag-based structure; all tags must be closed (e.g., '<tag>content</tag>' or '<tag />').",
        Declaration_Rule:
          'Starts with an optional declaration: \'<?xml version="1.0" encoding="UTF-8"?>\'.',
        Attribute_Syntax:
          "Attributes are key-value pairs within the opening tag.",
        Nesting_Rule: "Must be well-formed and strictly nested.",
      },
    },
    sql: {
      target_language: "sql",
      language_cheatsheet: {
        Comment_Style: "Single-line: -- comment. Multi-line: /* comment */.",
        Statement_Termination:
          "Statements are usually terminated by a semicolon ';'.",
        Casing_Rule:
          "Commands are generally reconstructed in UPPERCASE (SELECT, INSERT, UPDATE) for readability.",
        String_Rule: "Strings are enclosed in single quotes (e.g., 'value').",
        Structure_Relies_On: "Clauses (SELECT, FROM, WHERE, GROUP BY).",
        Common_Keywords: "SELECT, FROM, WHERE, INSERT INTO, UPDATE, JOIN.",
      },
    },
    bash: {
      target_language: "bash",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Shebang_Rule: "Starts with a shebang: '#!/bin/bash'.",
        Variable_Syntax:
          "Variables are declared without type and referenced using a dollar sign (e.g., '$VAR').",
        Control_Flow_Syntax:
          "Control flow (if/for/while) requires specific closing keywords (e.g., 'if ... then ... fi', 'for ... do ... done').",
        Command_Substitution:
          "Uses backticks (``) or parentheses with a dollar sign ('$(...)').",
      },
    },
    shell: {
      target_language: "shell script",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Shebang_Rule: "May start with '#!/bin/sh' or '#!/usr/bin/env bash'.",
        Variable_Syntax:
          "Variables are declared without type and referenced using a dollar sign (e.g., '$VAR').",
        Control_Flow_Syntax:
          "Uses keywords like if, then, else, fi, for, do, done.",
        Prioritization:
          "If ambiguity exists, assume standard Bash syntax (more feature-rich than sh).",
      },
    },
    docker: {
      target_language: "dockerfile",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Instruction_Casing:
          "Commands are typically reconstructed in UPPERCASE (e.g., FROM, RUN, CMD, COPY).",
        Structure_Rule:
          "Each instruction is on a new line and begins with a mandatory keyword.",
        Line_Continuation:
          "Indicated by a backslash '\\' at the end of the line.",
        First_Instruction: "The first instruction is almost always 'FROM'.",
        Common_Keywords:
          "FROM, RUN, CMD, LABEL, COPY, ADD, WORKDIR, EXPOSE, ENV, ENTRYPOINT.",
      },
    },
    abap: {
      target_language: "abap",
      language_cheatsheet: {
        Comment_Style: 'Single-line: * (at beginning of line) or " (inline).',
        Statement_Termination:
          "All executable statements must end with a period (.).",
        Declaration_Style:
          "Variables are declared with DATA or TYPES. Case-insensitive keywords (but conventionally uppercase).",
        Block_Structure:
          "Uses paired keywords like IF...ENDIF, FORM...ENDFORM, LOOP...ENDLOOP.",
        Common_Keywords: "DATA, SELECT, FROM, WHERE, ENDIF, PERFORM, WRITE.",
      },
    },
    agda: {
      target_language: "agda",
      language_cheatsheet: {
        Comment_Style: "Single-line: --. Multi-line: {- comment -}.",
        Typing_Rule:
          "Strongly typed, functional programming language. Structure relies on type signatures and definitions.",
        Termination: "Definitions are separated by a newline.",
        Common_Syntax:
          "Uses characters like : (type), -> (function), and specialized Unicode for mathematical notation (prioritize ASCII equivalents if ambiguous).",
      },
    },
    angular: {
      target_language: "angular component (typescript/html)",
      language_cheatsheet: {
        File_Context:
          "Usually seen as TypeScript components (@Component) or HTML templates (structural directives).",
        Component_Decorators:
          "Prioritize recognition of '@Component({...})' and 'selector:', 'template:', 'styleUrls:'.",
        Template_Syntax:
          "Uses specific directives: '*ngIf', '*ngFor', '[property]=\"value\"', '(event)=\"handler()\"'.",
        TypeScript_Rules:
          "Follow typescript syntax rules for the surrounding code.",
        Reactive_State:
          "Look for 'signal()', 'computed()', and 'inject()' functions.",
      },
    },
    arduino: {
      target_language: "arduino (c++)",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */.",
        Mandatory_Structure:
          "Requires 'void setup() { ... }' and 'void loop() { ... }'.",
        Core_Functions:
          "Prioritize recognition of 'pinMode()', 'digitalWrite()', 'analogRead()', 'Serial.begin()', 'delay()'.",
        Syntax_Rules:
          "Follow C++ rules (semicolons, curly braces, type-first declaration).",
        Includes:
          "Often uses '#include <Arduino.h>' (implicitly) or specific libraries.",
      },
    },
    assembly: {
      target_language: "assembly (x86/arm)",
      language_cheatsheet: {
        Comment_Style: "Single-line: ; (x86) or @ (ARM).",
        Structure_Definition:
          "Code relies on instructions (e.g., MOV, ADD, JMP) followed by operands (registers or memory addresses).",
        Labels: "Labels end with a colon (e.g., 'main:').",
        Syntax_Rules:
          "Very short, mnemonic keywords. Use context to determine instruction set (e.g., 'eax' suggests x86, 'r0' suggests ARM).",
        Directives:
          "Look for directives starting with a period (e.g., '.data', '.text', '.global').",
      },
    },
    basic: {
      target_language: "basic (e.g., visual basic, qbasic)",
      language_cheatsheet: {
        Comment_Style: "Uses 'REM' or an apostrophe (').",
        Syntax_Rules:
          "Statements often start with line numbers (QBASIC) or keywords. Keywords are case-insensitive.",
        Block_Structure:
          "Uses paired keywords like 'IF...THEN...ELSEIF...END IF', 'FOR...NEXT'.",
        Variable_Declaration:
          "Often implicit, but can use 'DIM'. Type suffixes (e.g., '$' for string) may appear.",
        Common_Keywords: "PRINT, INPUT, DIM, GOTO, SUB, FUNCTION.",
      },
    },
    bnf: {
      target_language: "bnf (backus-naur form)",
      language_cheatsheet: {
        Comment_Style:
          "Not standard; comments may be enclosed in '(* comment *)'.",
        Structure_Definition:
          "Defines grammar rules. Uses '::=' as the definition operator.",
        Termination_Rule: "Rules are separated by newlines.",
        Alternative_Rule: "Alternatives are separated by the vertical bar '|'.",
      },
    },
    ebnf: {
      target_language: "ebnf (extended backus-naur form)",
      language_cheatsheet: {
        Comment_Style:
          "Enclosed in '(* comment *)' or C-style '/* comment */'.",
        Structure_Definition:
          "Rules end with a semicolon ';'. Uses '=' as the definition operator.",
        Repetition_Syntax:
          "Uses '{}' for zero or more repetitions. Uses '[]' for optional elements. Uses '()' for grouping.",
        Alternative_Rule: "Alternatives are separated by the vertical bar '|'.",
      },
    },
    clojure: {
      target_language: "clojure",
      language_cheatsheet: {
        Comment_Style: "Single-line: ;.",
        Structure_Definition:
          "Uses S-expressions (sexp) which are entirely enclosed in parentheses '()'. Code is data.",
        Function_Call:
          "The first element inside a list (()) is the function/macro name (e.g., '(def name value)').",
        Data_Structures:
          "Uses '[]' for vectors (lists), '{}' for maps (dictionaries), and '()' for function calls.",
        Keywords: "Keywords start with a colon (e.g., ':name').",
      },
    },
    coffeescript: {
      target_language: "coffeescript",
      language_cheatsheet: {
        Comment_Style: "Single-line: #. Block: ### comment ###.",
        Scope_Definition: "Uses indentation instead of braces.",
        Implicit_Syntax:
          "No parentheses for function calls, no semicolons at statement end.",
        Function_Syntax: "Functions use '->' (e.g., 'func = (args) -> body').",
        Variable_Declaration: "No 'var', 'let', or 'const' keywords.",
      },
    },
    dart: {
      target_language: "dart",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: //. Multi-line: /* comment */. Documentation: ///.",
        Scope_Definition: "Code blocks are delimited by curly braces '{}'.",
        Statement_Termination:
          "All executable statements must end with a semicolon ';'.",
        Typing_Rule:
          "Strongly typed (e.g., 'String name;'), but supports 'var' and 'dynamic'.",
        Async_Syntax: "Heavily uses 'async/await' and 'Future'.",
        Structure_Keywords:
          "class, extends, implements, import, final, const, var, dynamic.",
      },
    },
    dhall: {
      target_language: "dhall",
      language_cheatsheet: {
        Comment_Style: "Single-line: --.",
        Typing_Rule:
          "Configuration language; structure relies on records ({}) and unions. Strong, static typing.",
        Syntax_Rules:
          "Uses 'let' for variable declaration and 'in' to conclude. Uses ':' for type annotation. Uses 'Text' and 'Natural' types.",
        Keywords: "let, in, if, then, else, import, Text, Natural, List.",
      },
    },
    diff: {
      target_language: "diff (patch format)",
      language_cheatsheet: {
        Comment_Style:
          "Lines beginning with special symbols are considered meta-data.",
        Structure_Definition:
          "Lines begin with specific, non-alphanumeric symbols.",
        Line_Interpretation:
          "'+' indicates a line added. '-' indicates a line removed. '@' indicates context/hunk header. ' ' (space) indicates context line.",
        Header_Syntax:
          "Lines starting with '---' (original file) and '+++' (new file) are file identifiers.",
      },
    },
    elixir: {
      target_language: "elixir",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition:
          "Uses paired keywords: 'do' and 'end' for blocks (e.g., 'defmodule ... do ... end').",
        Variable_Rule:
          "Uses pattern matching heavily. Variables start lowercase.",
        Atom_Syntax:
          "Atoms (constants) start with a colon (e.g., ':ok', ':error').",
        Module_Definition:
          "Uses 'defmodule', 'def', 'defp' (private function).",
      },
    },
    elm: {
      target_language: "elm",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: --. Documentation: {-| doc -}. Multi-line: {- comment -}.",
        Structure_Definition:
          "Functional language; structure relies on type signatures and definitions.",
        Type_Annotation: "Type signatures use '::' (e.g., 'name : Type').",
        Syntax_Rules:
          "Modules begin with 'module Name exposing (..)' or 'import'. Uses 'let...in' for local bindings.",
        Immutability: "Variables are immutable (no 'var', 'let').",
      },
    },
    erlang: {
      target_language: "erlang",
      language_cheatsheet: {
        Comment_Style: "Single-line: %.",
        Structure_Definition:
          "Modules begin with '-module(name).'. Function definitions end with a period (.), clauses end with a semicolon (;).",
        Variable_Rule: "Variables start with an uppercase letter.",
        Atom_Syntax:
          "Atoms (constants) start with a lowercase letter and are unquoted (e.g., 'ok').",
        Process_Syntax: "Look for 'spawn' and '!' (send message).",
      },
    },
    "express.js": {
      target_language: "express.js (node.js/javascript)",
      language_cheatsheet: {
        File_Context: "Server-side JavaScript/Node.js context.",
        Mandatory_Imports:
          "Prioritize 'const express = require('express');' or 'import express from 'express';'.",
        Route_Syntax:
          "Primary structure is method chaining on the app object: 'app.get('/route', (req, res) => {...});'.",
        Middleware_Syntax: "Uses 'app.use(middleware)' to inject functions.",
        Listening_Rule: "Ends with 'app.listen(port, () => {...});'.",
      },
    },
    "f#": {
      target_language: "f#",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: //. Multi-line: (* comment *). Documentation: ///.",
        Structure_Definition:
          "Functional language. Uses 'let' for value definition. Uses 'do' for imperative actions.",
        Block_Structure:
          "Uses significant whitespace/indentation for block structure, often combined with paired keywords (e.g., 'if...then...else').",
        Typing_Rule:
          "Strong, static type inference. Type annotations use ':', but are often omitted.",
        Common_Keywords:
          "let, type, module, member, val, match, with, function.",
      },
    },
    flow: {
      target_language: "flow (javascript type checking)",
      language_cheatsheet: {
        Comment_Style: "Follows JavaScript rules: // or /* comment */.",
        Mandatory_Header: "Starts with a special comment: '/* @flow */'.",
        Syntax_Rules:
          "Superset of JavaScript. Primary unique syntax is the colon ':' for type annotation, and type delimiters ('|' for union, '&' for intersection).",
        Recognition_Criteria:
          "TypeScript rules are often similar; look for the '/* @flow */' comment or specific Flow utility types.",
      },
    },
    fortran: {
      target_language: "fortran",
      language_cheatsheet: {
        Comment_Style: "Single-line: !.",
        Structure_Definition:
          "Uses block constructs like 'PROGRAM...END PROGRAM', 'SUBROUTINE...END SUBROUTINE'.",
        Syntax_Rules:
          "Keywords are case-insensitive. Statements are typically on separate lines.",
        Declaration_Style:
          "Uses explicit declaration: 'INTEGER :: var', 'REAL :: array(10)'.",
        Loop_Syntax: "Uses 'DO ... END DO' or 'DO i=1,10'.",
      },
    },
    gherkin: {
      target_language: "gherkin (bdd)",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition:
          "Natural language structure. Relies on specific keywords for behavior-driven development.",
        Mandatory_Keywords: "Feature, Scenario, Given, When, Then, And, But.",
        Termination:
          "Each clause is on its own line. Indentation is optional but used for readability.",
      },
    },
    glsl: {
      target_language: "glsl (opengl shading language)",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */.",
        Syntax_Rules: "Follow C-like syntax (semicolons, curly braces).",
        Type_System:
          "Uses specific vector/matrix types: 'vec2', 'vec3', 'mat4', 'sampler2D'.",
        Mandatory_Functions:
          "Requires a 'main()' function and must set output variables (e.g., 'gl_Position' or output color).",
        Keywords: "in, out, uniform, varying, discard, float, vec4, mat4.",
      },
    },
    graphql: {
      target_language: "graphql",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition:
          "Primarily structured as queries (data fetching) or mutations (data modification).",
        Query_Syntax:
          "Requests use curly braces to define fields/objects (e.g., 'query { user { name } }').",
        Schema_Definition:
          "Uses keywords 'type', 'schema', 'input', 'interface' for schema files.",
        Argument_Syntax:
          "Arguments are passed in parentheses: 'user(id: 1) { ... }'.",
      },
    },
    groovy: {
      target_language: "groovy",
      language_cheatsheet: {
        Comment_Style: "Follow Java/C++ rules: // or /* comment */.",
        Scope_Definition: "Blocks are delimited by curly braces '{}'.",
        Statement_Termination: "Semicolons (;) are optional and often omitted.",
        Typing_Rule:
          "Supports optional typing (e.g., 'def name = \"value\"' or 'String name = \"value\"').",
        Closures:
          "Uses closures defined with curly braces and '->' (e.g., '{ it -> println it }').",
      },
    },
    haskell: {
      target_language: "haskell",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: --. Multi-line: {- comment -}. Documentation: | (pipe).",
        Structure_Definition:
          "Functional language; relies on type signatures and strict pattern matching.",
        Type_Annotation: "Type signatures use '::' (e.g., 'name :: Type').",
        Syntax_Rules:
          "Uses 'let...in' or 'where' for local bindings. Function application is done by juxtaposition (no parentheses).",
        Module_Definition: "Starts with 'module Name where'.",
      },
    },
    hcl: {
      target_language: "hcl (hashicorp configuration language)",
      language_cheatsheet: {
        Comment_Style: "Single-line: # or //.",
        Structure_Definition:
          "Used for configuration (e.g., Terraform). Structure relies on key-value assignments and blocks.",
        Block_Syntax:
          'Blocks use curly braces (e.g., \'resource "type" "name" {}\').',
        Variable_Assignment:
          "Assignment uses '=' (e.g., 'name = \"value\"'). No semicolons.",
        String_Rule: "Strings are typically double-quoted or heredoc format.",
      },
    },
    idris: {
      target_language: "idris",
      language_cheatsheet: {
        Comment_Style: "Single-line: --. Multi-line: {- comment -}.",
        Typing_Rule:
          "Dependently typed functional language. Requires explicit type signatures.",
        Syntax_Rules:
          "Follows Haskell-like syntax. Type signatures use ':' (e.g., 'name : Type'). Uses 'let...in' for local bindings.",
        Keywords: "module, import, data, where, let, in, total, partial.",
      },
    },
    java: {
      target_language: "java",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: //. Multi-line: /* comment */. Documentation: /** doc */.",
        Scope_Definition: "MANDATORY use of curly braces ({}) for all scopes.",
        Statement_Termination:
          "MANDATORY use of the semicolon (;) as the absolute end-of-statement delimiter.",
        Structure_Mandate:
          "Code must be contained within 'class' definitions. Requires a 'public static void main(String[] args)' method for execution.",
        Typing_Rule: "Strongly typed: 'int x = 0;'.",
        Common_Keywords:
          "class, public, private, static, void, import, package, if, else, for, while, try, catch, finally.",
      },
    },
    julia: {
      target_language: "julia",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Scope_Definition:
          "Uses paired keywords: 'function...end', 'if...end', 'for...end'.",
        Variable_Declaration:
          "Implicit typing (e.g., 'x = 10'). Can use '::' for type assertion.",
        Control_Flow_Syntax:
          "No parentheses around conditions: 'if condition'.",
        Function_Syntax:
          "Function declaration: 'function name(args) ... end' or 'name(args) = value'.",
      },
    },
    kotlin: {
      target_language: "kotlin",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Scope_Definition: "Blocks are delimited by curly braces '{}'.",
        Statement_Termination: "Semicolons (;) are optional and discouraged.",
        Variable_Declaration:
          "Uses 'val' (immutable) and 'var' (mutable). Type is declared after the identifier: 'val name: String = \"value\"'.",
        Function_Syntax:
          "Functions start with 'fun' (e.g., 'fun main() {...}').",
        Keywords:
          "fun, val, var, class, object, import, package, when, if, else.",
      },
    },
    latex: {
      target_language: "latex",
      language_cheatsheet: {
        Comment_Style: "Single-line: %.",
        Structure_Definition:
          "Relies on commands starting with '\\' and environments delimited by '\\begin{env}' and '\\end{env}'.",
        Mandatory_Structure:
          "Requires '\\documentclass{}' and '\\begin{document}' / '\\end{document}'.",
        Math_Syntax: "Mathematical notation is enclosed in '$' or '$$'.",
        Grouping_Syntax:
          "Arguments and groupings are enclosed in curly braces '{}'.",
      },
    },
    less: {
      target_language: "less (css pre-processor)",
      language_cheatsheet: {
        Comment_Style:
          "Follows CSS rules: /* comment */, but also supports //.",
        Structure_Definition:
          "Follows CSS block structure with curly braces and semicolons.",
        Variable_Syntax:
          "Variables use the '@' symbol (e.g., '@color: #fff;').",
        Nesting_Rule: "Selectors can be nested within each other.",
        Mixins: "Allows including other rulesets using their selector name.",
      },
    },
    lisp: {
      target_language: "lisp (common lisp, scheme)",
      language_cheatsheet: {
        Comment_Style: "Single-line: ; or ;; or ;;;.",
        Structure_Definition:
          "Code is entirely composed of S-expressions (sexp) enclosed in parentheses '()'.",
        Function_Call:
          "The first element in any list (()) is the function/operator.",
        Keywords: "Look for 'defun', 'lambda', 'let', 'cond'.",
        Data_Structures:
          "Uses ' and ` for quote/backquote. Lists are fundamental.",
      },
    },
    livescript: {
      target_language: "livescript",
      language_cheatsheet: {
        Comment_Style: "Single-line: #. Multi-line: ### comment ###.",
        Structure_Definition:
          "Syntactic sugar over JavaScript. Uses indentation instead of braces.",
        Implicit_Syntax:
          "No parentheses for function calls, no commas, no semicolons.",
        Function_Syntax: "Functions use '->' or '=>'.",
        Piping_Operator: "Uses the pipe symbol '`|`' for function composition.",
      },
    },
    llvm_ir: {
      target_language: "llvm ir",
      language_cheatsheet: {
        Comment_Style: "Single-line: ;.",
        Structure_Definition:
          "Static single assignment (SSA) form. Variables start with '%' (local) or '@' (global).",
        Instruction_Style:
          "Instructions often start with 'define', 'declare', 'call', 'load', 'store'.",
        Basic_Blocks: "Uses labels ending with a colon (e.g., 'entry:').",
        Typing_Rule: "Strongly typed: 'i32' (32-bit integer), 'float', 'ptr'.",
      },
    },
    lua: {
      target_language: "lua",
      language_cheatsheet: {
        Comment_Style: "Single-line: --. Multi-line: --[[ comment ]].",
        Scope_Definition:
          "Uses paired keywords: 'do...end', 'function...end', 'if...then...end'.",
        Variable_Declaration:
          "Default global, use 'local' for local variables. No explicit type.",
        Table_Structure:
          "Uses tables {} as the only complex data structure (for arrays, objects, maps).",
        Keywords:
          "function, local, if, then, else, elseif, end, for, do, while, return.",
      },
    },
    makefile: {
      target_language: "makefile",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition: "Relies on targets, dependencies, and commands.",
        Target_Syntax:
          "Target followed by a colon (e.g., 'all: dependency1 dependency2').",
        Command_Rule:
          "Commands MUST be indented with a literal TAB character (4 spaces is incorrect) under the dependency line.",
        Variable_Syntax:
          "Variables use '=' for recursive definition and ':=' for simple expansion. Referenced using '$(VAR)'.",
      },
    },
    markup: {
      target_language: "generic markup",
      language_cheatsheet: {
        Comment_Style: "Assume HTML/XML standard: <!-- comment -->.",
        Structure_Definition:
          "Uses angle brackets for tags: '<tag>' and '</tag>'.",
        Nesting_Rule: "Tags must be strictly nested.",
        Variable_Substitution:
          "Look for expressions enclosed in curly braces for templating (e.g., '{{ variable }}' or '{% block %}').",
        Prioritization:
          "If specific HTML/XML rules don't apply, this structure serves as a fallback.",
      },
    },
    mathematica: {
      target_language: "mathematica (wolfram language)",
      language_cheatsheet: {
        Comment_Style: "Single-line: (* comment *). Multi-line: (* comment *).",
        Structure_Definition:
          "Relies on functions/symbols starting with an uppercase letter.",
        Function_Syntax:
          "Arguments are enclosed in square brackets: 'Function[arg]'.",
        List_Syntax:
          "Lists are enclosed in curly braces: '{element1, element2}'.",
        Termination_Rule:
          "Statements are terminated by a semicolon (;), which suppresses output.",
      },
    },
    matlab: {
      target_language: "matlab / octave",
      language_cheatsheet: {
        Comment_Style: "Single-line: %.",
        Scope_Definition:
          "Uses paired keywords: 'if...end', 'for...end', 'function...end'.",
        Array_Syntax:
          "Uses square brackets '[]' for vector/matrix construction. Semicolon `;` separates rows.",
        Termination_Rule:
          "Semicolon (;) at the end of a line suppresses output.",
        Function_Declaration:
          "Function definition starts with 'function [out] = name(in)'.",
        Keywords: "function, end, if, else, elseif, for, while, switch, case.",
      },
    },
    mermaid: {
      target_language: "mermaid (diagramming)",
      language_cheatsheet: {
        Comment_Style: "Not standard; comments may be within nodes.",
        Structure_Definition:
          "Language for generating diagrams. Must start with a type declaration.",
        Mandatory_Keywords:
          "graph, sequenceDiagram, flowchart, gitGraph, classDiagram.",
        Syntax_Rules:
          "Relies on specific syntax for nodes and arrows (e.g., A-->B, subgraph...end).",
        Indentation_Rule:
          "Indentation is used to define sub-graphs or hierarchy.",
      },
    },
    "next.js": {
      target_language: "next.js (react/typescript)",
      language_cheatsheet: {
        File_Context:
          "React framework for full-stack apps. Focus on pages/components/api routes.",
        Import_Rules:
          "Mandatory 'import React from 'react';' or similar React imports.",
        Function_Syntax:
          "Components are often 'export default function ComponentName() { ... }'.",
        SSR_Functions:
          "Look for 'getStaticProps' or 'getServerSideProps' for server-side context.",
        JSX_Syntax:
          "Follow react/javascript/typescript rules for the inner logic.",
      },
    },
    nix: {
      target_language: "nix",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition:
          "Functional programming language for configuration. Relies on attribute sets (curly braces) and lists (square brackets).",
        Function_Syntax: "Functions use ': ' (e.g., 'name: body').",
        Binding_Syntax: "Uses 'let' and 'in' for local bindings.",
        String_Rule:
          "Strings are typically double-quoted or multi-line strings enclosed in two single quotes (''text'').",
      },
    },
    "notion formula": {
      target_language: "notion formula",
      language_cheatsheet: {
        Comment_Style: "Not supported.",
        Structure_Definition:
          "Single-expression functional language. Used for database properties.",
        Function_Syntax:
          "Functions use a dot notation and parentheses: 'functionName(arg1, arg2)'.",
        Typing_Rule:
          "Prioritize recognition of Notion-specific types: 'prop(\"Name\")', 'dateBetween()'.",
        Keywords:
          "if, true, false, empty, and, or, not, format, slice, contains.",
      },
    },
    "objective-c": {
      target_language: "objective-c",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */.",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) for function bodies.",
        Statement_Termination: "MANDATORY use of the semicolon (;).",
        Object_Syntax: "Uses '@interface', '@implementation', and '@end'.",
        Method_Syntax:
          "Method calls use square brackets: '[object message:arg]'.",
        Pointers_Rule: "Variables are almost always pointers ('*').",
      },
    },
    ocaml: {
      target_language: "ocaml",
      language_cheatsheet: {
        Comment_Style: "Multi-line: (* comment *).",
        Scope_Definition:
          "Uses paired keywords: 'begin...end' for imperative blocks. Relies on indentation for functional blocks.",
        Statement_Termination:
          "Uses double semicolons (;;) to terminate top-level definitions, or a single semicolon (;) as a sequence operator.",
        Variable_Declaration: "Uses 'let' and 'in'. Immutability is default.",
        Typing_Rule: "Strong, static type inference. Type annotations use ':'.",
      },
    },
    pascal: {
      target_language: "pascal",
      language_cheatsheet: {
        Comment_Style: "Multi-line: { comment } or (* comment *).",
        Structure_Definition: "Code blocks use 'BEGIN...END' keywords.",
        Statement_Termination:
          "All statements must end with a semicolon (;). Program ends with a period (.).",
        Function_Declaration: "Uses 'PROCEDURE' or 'FUNCTION'.",
        Keywords: "PROGRAM, VAR, BEGIN, END, IF, THEN, ELSE, WHILE, DO.",
      },
    },
    perl: {
      target_language: "perl",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Scope_Definition: "MANDATORY use of curly braces ({}) for all blocks.",
        Statement_Termination: "MANDATORY use of the semicolon (;).",
        Variable_Syntax:
          "Variables are prefixed: '$' (scalar), '@' (array), '%' (hash).",
        Function_Syntax:
          "Uses 'sub' for function definition. Arguments are accessed via the '@_' array.",
      },
    },
    php: {
      target_language: "php",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */, also uses #.",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) for all blocks. Code must be enclosed in '<?php ... ?>' tags.",
        Statement_Termination: "MANDATORY use of the semicolon (;).",
        Variable_Syntax:
          "All variables MUST start with a dollar sign '$' (e.g., '$variable').",
        Function_Syntax:
          "Uses 'function' keyword. Object-oriented structure (class, public, private).",
      },
    },
    powershell: {
      target_language: "powershell",
      language_cheatsheet: {
        Comment_Style: "Single-line: #. Multi-line: <# comment #>.",
        Scope_Definition: "Code blocks are delimited by curly braces '{}'.",
        Variable_Syntax:
          "All variables MUST start with a dollar sign '$' (e.g., '$myVar').",
        Command_Style:
          "Commands are typically hyphenated nouns/verbs (e.g., 'Get-Content', 'Start-Process').",
        Function_Syntax: "Uses 'function name { ... }'.",
      },
    },
    prolog: {
      target_language: "prolog",
      language_cheatsheet: {
        Comment_Style: "Single-line: %. Multi-line: /* comment */.",
        Structure_Definition:
          "Relies on facts (ending in '.') and rules (using ':-').",
        Variable_Rule: "Variables start with an uppercase letter.",
        Atom_Rule: "Atoms (constants) start with a lowercase letter.",
        List_Syntax: "Uses square brackets '[]'.",
      },
    },
    protobuf: {
      target_language: "protocol buffers (protobuf)",
      language_cheatsheet: {
        Comment_Style: "Single-line: //.",
        Structure_Definition:
          "Used for defining data structures. Must start with 'syntax = \"proto3\";' or similar.",
        Block_Syntax:
          "Uses 'message Name { ... }' blocks delimited by curly braces.",
        Field_Syntax:
          "Fields require type, name, and field number: 'string name = 1;'.",
        Keywords: "syntax, package, import, message, enum, optional, repeated.",
      },
    },
    purescript: {
      target_language: "purescript",
      language_cheatsheet: {
        Comment_Style: "Follows Haskell rules: -- or {- comment -}.",
        Typing_Rule: "Strictly functional, heavily relies on type signatures.",
        Structure_Definition:
          "Modules begin with 'module Name where'. Uses 'let...in' for local bindings.",
        Type_Annotation: "Type signatures use '::'.",
        Keywords:
          "module, import, where, let, in, data, type, class, instance.",
      },
    },
    r: {
      target_language: "r",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Scope_Definition: "Blocks are delimited by curly braces '{}'.",
        Variable_Assignment: "Assignment uses '<-' or '=' (prioritize '<-').",
        Function_Syntax:
          "Function definition: 'name <- function(args) { ... }'.",
        Vector_Syntax: "Vectors/lists created with 'c()' (e.g., 'c(1, 2, 3)').",
      },
    },
    racket: {
      target_language: "racket (lisp dialect)",
      language_cheatsheet: {
        Comment_Style: "Single-line: ;.",
        Structure_Definition:
          "Uses S-expressions (sexp) entirely enclosed in parentheses '()'.",
        Module_Definition: "Starts with '#lang racket'.",
        Function_Call:
          "The first element inside a list (()) is the function/macro name (e.g., '(define name value)').",
        Keywords: "define, lambda, cond, let, require, provide.",
      },
    },
    react: {
      target_language: "react component (jsx/tsx)",
      language_cheatsheet: {
        File_Context:
          "Front-end components. Focus on JSX (HTML-like syntax inside JS).",
        Import_Rules:
          "Mandatory 'import React from 'react';' or 'import { useState } from 'react';'.",
        Component_Syntax:
          "Functional components: 'function ComponentName() { return <JSX /> }'.",
        JSX_Rules:
          "HTML-like tags must be self-closing (e.g., '<img />'). JavaScript expressions are embedded in curly braces: '{ variable }'.",
        Hook_Usage:
          "Prioritize recognition of 'useState', 'useEffect', 'useMemo', 'useCallback'.",
      },
    },
    reason: {
      target_language: "reasonml",
      language_cheatsheet: {
        Comment_Style: "Multi-line: /* comment */.",
        Scope_Definition: "Blocks use curly braces '{}'.",
        Statement_Termination: "Statements are terminated by a semicolon (;).",
        Variable_Declaration:
          "Uses 'let' and 'in'. Follows OCaml's functional structure.",
        Type_Annotation: "Type annotations use ':' after the identifier.",
        Module_Syntax: "Module definition uses 'module Name = { ... }'.",
      },
    },
    rocq: {
      target_language: "rocq",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Typing_Rule: "Emphasis on functional programming and immutability.",
        Structure_Definition:
          "Relies on pattern matching and expressions. Uses 'when' and 'is' for pattern matching.",
        String_Rule:
          "Strings are enclosed in double quotes. Single quotes used for characters.",
        Keywords:
          "app, package, provides, imports, when, is, if, then, else, expect, module.",
      },
    },
    ruby: {
      target_language: "ruby",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Scope_Definition:
          "Uses paired keywords: 'class...end', 'def...end', 'if...end', 'do...end'.",
        Variable_Syntax:
          "Variables are prefixed: '$' (global), '@' (instance), '@@' (class). Local variables are not prefixed.",
        Statement_Termination:
          "Newlines implicitly terminate statements. Semicolons (;) are optional.",
        Function_Syntax: "Functions start with 'def'.",
      },
    },
    rust: {
      target_language: "rust",
      language_cheatsheet: {
        Comment_Style: "Single-line: //. Multi-line: /* comment */.",
        Scope_Definition: "MANDATORY use of curly braces ({}) for all scopes.",
        Statement_Termination:
          "Expressions are followed by a semicolon (;). Functions/blocks return implicitly without a semicolon.",
        Variable_Declaration:
          "Uses 'let' (immutable by default), 'mut' (mutable). Type annotation uses a colon: 'let x: i32 = 0;'.",
        Function_Syntax: "Functions start with 'fn' (e.g., 'fn main() {}').",
      },
    },
    sass: {
      target_language: "sass (syntactically awesome stylesheets)",
      language_cheatsheet: {
        Comment_Style:
          "Follows CSS rules: /* comment */, but also supports //.",
        Structure_Definition:
          "Uses **strict indentation** (no curly braces). Blocks are defined by nesting and indentation.",
        Termination_Rule: "No semicolons required for property termination.",
        Variable_Syntax: "Variables use the '$' symbol (e.g., '$color: #fff').",
        Mixins: "Uses '@mixin' and '@include'.",
      },
    },
    scala: {
      target_language: "scala",
      language_cheatsheet: {
        Comment_Style: "Follow Java/C++ rules: // or /* comment */.",
        Scope_Definition: "Blocks are delimited by curly braces '{}'.",
        Statement_Termination: "Semicolons (;) are optional.",
        Variable_Declaration:
          "Uses 'val' (immutable) and 'var' (mutable). Type is declared after identifier: 'val name: String = \"value\"'.",
        Function_Syntax: "Functions start with 'def'. Closures use '=>'.",
      },
    },
    scheme: {
      target_language: "scheme (lisp dialect)",
      language_cheatsheet: {
        Comment_Style: "Single-line: ;.",
        Structure_Definition:
          "Uses S-expressions (sexp) entirely enclosed in parentheses '()'.",
        Keywords: "define, lambda, cond, let, set!.",
        Prioritization:
          "Prioritize shorter keyword names and less complex syntax compared to Common Lisp.",
      },
    },
    scss: {
      target_language: "scss (css pre-processor)",
      language_cheatsheet: {
        Comment_Style:
          "Follows CSS rules: /* comment */, but also supports //.",
        Structure_Definition:
          "Follows standard CSS block structure with curly braces '{}' and semicolons ';'.",
        Variable_Syntax:
          "Variables use the '$' symbol (e.g., '$color: #fff;').",
        Nesting_Rule: "Allows selectors to be nested within each other.",
        Mixins: "Uses '@mixin' and '@include'.",
      },
    },
    smalltalk: {
      target_language: "smalltalk",
      language_cheatsheet: {
        Comment_Style: 'Enclosed in double quotes "comment".',
        Statement_Termination: "Statements end with a period (.).",
        Variable_Syntax:
          "Local variables are declared between vertical bars: '| temp |'.",
        Message_Passing:
          "Relies entirely on sending messages to objects (e.g., 'Transcript show: 'Hello'').",
        Block_Syntax: "Blocks (closures) are enclosed in square brackets '[]'.",
      },
    },
    solidity: {
      target_language: "solidity (ethereum)",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */.",
        Structure_Definition:
          "Smart contract language. Must start with 'pragma solidity ^0.x.x;'.",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) and semicolons (;).",
        Keywords:
          "pragma, contract, library, using, function, public, private, uint, payable, require, assert.",
      },
    },
    swift: {
      target_language: "swift",
      language_cheatsheet: {
        Comment_Style:
          "Single-line: //. Multi-line: /* comment */. Documentation: ///.",
        Scope_Definition: "Blocks are delimited by curly braces '{}'.",
        Statement_Termination:
          "Semicolons (;) are not required (only when combining statements on one line).",
        Variable_Declaration:
          "Uses 'let' (constant) and 'var' (variable). Type is after identifier with colon: 'var name: String'.",
        Function_Syntax:
          "Functions start with 'func' (e.g., 'func main() {}').",
      },
    },
    toml: {
      target_language: "toml (configuration language)",
      language_cheatsheet: {
        Comment_Style: "Single-line: #.",
        Structure_Definition:
          "Configuration file. Relies on key-value pairs and table headers.",
        Table_Syntax:
          "Tables are defined by square brackets (e.g., '[section]'). Array of tables use double square brackets ('[[section]]').",
        Variable_Assignment:
          "Assignment uses '=' (e.g., 'key = \"value\"'). No semicolons.",
        Value_Types:
          "Supports strings, integers, floats, booleans, datetime, and arrays (square brackets).",
      },
    },
    "vb.net": {
      target_language: "visual basic .net",
      language_cheatsheet: {
        Comment_Style: "Uses single quote (').",
        Scope_Definition:
          "Uses paired keywords: 'Sub...End Sub', 'Class...End Class', 'If...End If'.",
        Statement_Termination:
          "Statements are terminated by a newline. Colon (:) can separate statements on one line.",
        Keywords:
          "Sub, Function, Class, Module, Dim, Private, Public, If, Then, Else, End.",
      },
    },
    verilog: {
      target_language: "verilog",
      language_cheatsheet: {
        Comment_Style: "Follow C++ rules: // or /* comment */.",
        Scope_Definition:
          "Uses paired keywords: 'module...endmodule', 'begin...end' for procedural blocks.",
        Statement_Termination: "Statements must end with a semicolon (;).",
        Keywords:
          "module, endmodule, begin, end, assign, always, reg, wire, input, output.",
      },
    },
    vhdl: {
      target_language: "vhdl",
      language_cheatsheet: {
        Comment_Style: "Single-line: --.",
        Scope_Definition:
          "Uses paired keywords: 'ENTITY...END ENTITY', 'ARCHITECTURE...END ARCHITECTURE', 'BEGIN...END'.",
        Statement_Termination: "Statements must end with a semicolon (;).",
        Keywords:
          "entity, architecture, is, begin, end, port, in, out, signal, constant, process.",
      },
    },
    "visual basic": {
      target_language: "visual basic (classic)",
      language_cheatsheet: {
        Comment_Style: "Uses single quote (').",
        Scope_Definition:
          "Uses paired keywords: 'Sub...End Sub', 'Function...End Function', 'If...End If'.",
        Statement_Termination: "Statements are terminated by a newline.",
        Variable_Declaration:
          "Uses 'Dim'. Type suffixes (e.g., '$' for string) may appear.",
        Keywords:
          "Dim, Sub, Function, End, If, Then, Else, Loop, Do, While, Public, Private.",
      },
    },
    "vue.js": {
      target_language: "vue.js component (html/javascript)",
      language_cheatsheet: {
        File_Context:
          "Front-end components, often in single-file components (.vue).",
        Mandatory_Structure:
          "Must contain '<template>', '<script>', and '<style>' blocks.",
        Template_Syntax:
          "HTML-like syntax with directives: 'v-if', 'v-for', 'v-bind:', 'v-on:'. JS expressions are embedded in double curly braces: '{{ variable }}'.",
        Script_Syntax:
          "JavaScript/TypeScript rules apply. Look for 'export default { data() { ... }, methods: { ... } }' or '<script setup>'.",
      },
    },
    webassembly: {
      target_language: "webassembly (wat format)",
      language_cheatsheet: {
        Comment_Style: "Single-line: ;;. Multi-line: (; comment ;).",
        Structure_Definition:
          "S-expression structure, entirely enclosed in parentheses '()'.",
        Instruction_Style:
          "Instructions are low-level stack operations (e.g., 'i32.const', 'local.get', 'call').",
        Module_Definition: "Starts with '(module ...)' and exports functions.",
        Typing_Rule: "Uses specific types: 'i32', 'i64', 'f32', 'f64'.",
      },
    },
  },
};
