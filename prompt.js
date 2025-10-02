export const prompt = {
  system_prompt_architecture: "Syntactic Context Injection Model",
  fixed_policies: {
    code_reconstruction_policy:
      "You are an expert code reconstruction engine. Your task is to accurately convert the provided screenshot into raw, formatted code text. 1. Analyze the input screenshot and the provided language JSON. 2. Identify the core language syntax. 3. Reconstruct the code, prioritizing correct indentation (e.g., 4 spaces for Python) and using the specified syntactic markers ({, }, ;). 4. Output only the reconstructed code.",
    visual_processing_policy: {
      Indentation_Inference:
        "Infer correct block structure and indentation depth (e.g., 4 spaces for Python, tab-equivalent for Go/C++) by analyzing visual cues such as column alignment, code highlighting colors, and leading whitespace from the screenshot.",
      Character_Ambiguity_Resolution: {
        Numeric_V_Letter_Rule:
          "If characters '1', 'l', or 'i' are surrounded by other numerical digits (0-9) or used in mathematical/indexing operations, they are prioritized as the numeral '1'.",
        Brace_Ambiguity_Rule:
          "If a line is 1-3 characters long, contains no obvious mathematical operators or variable assignments, and is heavily indented (relative to the block it closes), it is highly likely to be a closing curly brace '}'. This is often seen in block closures, e.g., '});\\n}' or just '}'.",
        Quote_and_Bracket_Matching_Rule:
          "Always maintain a running count of opening/closing pairs for brackets, braces, and quotes: '\"\"', '``', \"''\", '{}', '()', ''. If a closing single quote (') or backtick (`) is ambiguous, its type must match the most recently opened, unclosed corresponding opening symbol.",
      },
    },
  },
  language_configurations: {
    python: {
      target_language: "Python",
      language_cheatsheet: {
        Indentation_Policy:
          "MANDATORY 4 spaces for every new logical block (PEP 8 standard). This rule supersedes any visually observed non-standard indentation.",
        Scope_Definition:
          "New blocks begin with a colon (:) following keywords like def, class, if, for, and while. Code within the new block must be indented by exactly 4 spaces.",
        Statement_Termination:
          "No statement terminator is used. Newlines implicitly terminate statements.",
        Control_Flow: {
          Conditionals: "if condition:, elif condition:, else:",
          Ternary_Operator: "value_if_true if condition else value_if_false",
          Loops: "for item in iterable: or while condition:",
        },
        Data_Structures: {
          Strings:
            'Literal markers include single quotes (\'\'), double quotes (""), or triple quotes ("""""" for multiline).[1]',
          Lists: "Defined by square brackets: [element1, element2][1]",
          Dictionary_Set:
            "Defined by curly braces: {key: value} for dict, {value} for set.",
        },
        Common_Syntax_Details: {
          Function_Definition: "def function_name(arguments):",
          Type_Coercion:
            "Recognize and use explicit type casting functions: int(), float(), str().[1]",
        },
      },
    },
    go: {
      target_language: "Go",
      language_cheatsheet: {
        Structure_Mandate:
          "Every source file must begin with a package declaration (e.g., package main for executables).[2]",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) for all function bodies and control flow blocks.",
        Statement_Termination:
          "The semicolon (;) is generally OMITTED as an end-of-statement terminator. It is MANDATORY ONLY as a component separator within control flow headers that contain an initializer (e.g., for A; B; C {} or if a := b; a < 42 {...}).[2]",
        Function_Signature: {
          Type_Position:
            "Type is declared AFTER the identifier (e.g., func name(param1 string, param2 int) type).[2]",
          Multiple_Returns:
            "Supports multiple return values listed in parentheses (e.g., func() (int, string)).[2]",
          Named_Results:
            "Supports named result parameters with bare return.[2]",
        },
        Control_Flow_Rules: {
          Condition_Parentheses:
            "Parentheses around the condition are OMITTED (e.g., if condition {..}, for condition {..}).[2]",
          Variable_Declaration:
            'Use the short variable declaration operator (:=) for local variables (e.g., msg := "Hello").[3]',
          Loop_Structure:
            "Only the 'for' keyword exists; it handles C-style, while-style, and infinite loops.[2]",
        },
        Visibility_Rule:
          "Case-sensitive: Uppercase identifiers are EXPORTED (public); Lowercase identifiers are PRIVATE.[2]",
        Common_Imports: [
          "fmt (used for basic printing and I/O operations like Println and Printf) [2]",
          "net/http (used for server handling and requests, often seen with http.ResponseWriter and http.Request types) [2]",
          "os (used for file operations and system interaction)",
        ],
      },
    },
    cpp: {
      target_language: "C++",
      language_cheatsheet: {
        Indentation_Policy:
          "Canonical C++ practice, typically 2 or 4 spaces. Consistency within a block must be prioritized.",
        Scope_Definition:
          "MANDATORY use of curly braces ({}) for all scopes: function bodies, class definitions, and control flow blocks (if, for, while).",
        Statement_Termination:
          "MANDATORY use of the semicolon (;) as the absolute end-of-statement delimiter.",
        Control_Flow_Rules: {
          Condition_Parentheses:
            "MANDATORY use of parentheses around all condition expressions (e.g., if (condition), while (condition)).",
          Keywords: "if, else, for, while, switch, case, default",
        },
        Syntactic_Anchors: {
          Preprocessor_Directives:
            "Prioritize recognition of #include and #define as C++-specific identifiers.",
          Standard_Library:
            "Prioritize recognition of std:: namespace usage (e.g., std::cout, std::string) to anchor the code as C++.",
          Function_Signature:
            "Type-first declaration (e.g., int functionName(string param1, int param2)).",
        },
      },
    },
  },
};
export const GEMINI_PROMPT_TEXT =
  prompt.fixed_policies.code_reconstruction_policy;
