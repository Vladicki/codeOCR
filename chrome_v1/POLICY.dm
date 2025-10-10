# codeOCR Privacy Policy

This Privacy Policy explains how the **codeOCR** browser extension ("the Extension") handles information. We are committed to protecting your privacy and ensuring transparency regarding data use.

---

## 1. Data Collection and Usage

The Extension is designed to convert images of code into editable text. To perform this service, the Extension collects and processes the following types of information:

| Data Collected | Purpose of Collection | Retention |
| :--- | :--- | :--- |
| **User-Selected Image Data** | A screenshot of the area selected by the user is sent to our backend server for Large Language Model (LLM) and Optical Character Recognition (OCR) processing. This is strictly for code reconstruction. | Data is **processed in memory and discarded immediately** after the result is returned to the user. No image or reconstructed code is stored long-term. |
| **System Prompt Data** | The instructions and language configurations (e.g., "Reconstruct this as Python code") necessary for the LLM to perform the reconstruction accurately. | Processed in memory and discarded immediately. |
| **Tab URL** | The URL of the page where the screenshot was taken is collected **anonymously** to monitor and improve the Extension's performance across different environments (e.g., static documentation vs. dynamic editors). | Stored as aggregate, non-identifiable usage statistics. |
| **Extension ID & Request Timestamp** | Used for basic operational metrics, tracking service usage, monitoring server health, and identifying regional demand. | Stored as aggregate, non-identifiable usage statistics. |
| **Language Preferences** | Settings saved by the user (e.g., preferred language preset) are stored locally using the browser's `storage` API to personalize the user experience. | Stored locally in your browser. |

The Extension **does not** collect any personally identifiable information (PII) such as names, email addresses, IP addresses, or location data.

---

## 2. Remote Processing and Data Security

The image and prompt data are processed by a remote server located at: **`https://codeocr.vladika.net`**.

* **Necessity of Remote Processing:** The advanced LLM and high-resource image processing required for code reconstruction cannot be executed locally within a browser extension due to resource limitations.
* **Data Transmission:** Data is transmitted securely over **HTTPS (SSL/TLS)** to prevent interception.
* **Security Commitment:** Our processing server is dedicated solely to fulfilling the OCR request. No content is analyzed for purposes beyond code reconstruction, and no data is permanently logged or stored.

---

## 3. Data Sharing

We do not sell, trade, or otherwise transfer your non-personal usage data or content to outside third parties. Data is used exclusively for the operation and improvement of the **codeOCR** service.

---

## 4. Consent

By installing and using the **codeOCR** Extension, you consent to the collection and use of information as described in this policy.

---

## 5. Changes to this Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy within the Chrome Web Store listing page.
