# codeOCR:  OCR for Code Snippets

codeOCR is an open-source image recognition utility designed to be highly accurate in recognizing and parsing code from images. It excels where traditional OCR tools falter, boasting up to 90% higher accuracy in identifying programming languages and preserving the original structure, indentation, and syntax of code snippets.

This tool is implemented as a browser extension with a powerful Go backend, providing a seamless experience for developers to extract code from screenshots, online tutorials, or any image source directly within their browser.
<p float="left">
<img width="313" height="323" alt="image" src="https://github.com/user-attachments/assets/5b1eef8f-7fec-4e1e-a085-e7a7a65d028f" />
<img width="288" height="339" alt="image" src="https://github.com/user-attachments/assets/deb36956-87d5-4989-9ccd-6f24bd753a39" />

<p/>
---

## Installation & Local set up for improved Speed

Follow these steps to set up and run codeOCR locally.

### Prerequisites

*   A modern web browser that supports extensions (e.g., Google Chrome, Mozilla Firefox).
### Optinal
*   [Go](https://golang.org/doc/install) (version 1.x or higher) (For compiling the server file)


### Local Backend Setup

To improve the processing speed of the OCR, you can run the extension with a local backend.

1.  Clone the repository:
    ```bash
    git clone git@github.com:Vladicki/codeOCR.git
    cd codeOCR
    ```
2.  Give execution permission to the main binary
    ```bash
    chmod +x local_backend/main
    ```
3.  Run the local server
    ```bash
    ./local_backend/main
    ```
4. Create a `.env` file in the root of the project and add your Gemini API key to it:
    ```
    GEMINI_API_KEY=your_api_key
    ```
5. change localendpoint in background js to localhost:8080:
    ```
    //Uncomment
    const apiEndpoint = "http://localhost:8080/process-image";
    ```
    The server will start and listen for requests from the browser extension.

### Browser Extension Setup

1.  Open your web browser (e.g., Google Chrome).
2.  Navigate to the extensions page (`chrome://extensions`).
3.  Enable "Developer mode" (usually a toggle in the top right corner).
4.  Click on "Load unpacked".
5.  Select the root directory of this project (`/path/to/codeOCR`).
6.  Press (Alt+C/ ⌘+C) to Capture process your cod snippet. The codeOCR extension icon should now appear in your browser's toolbar. You can also pin it to the tool bar and now use it to capture code from images on any webpage.

---



### Loading the extension in your browser
1. Open your browser of choice.
2. Navigate to the extensions page.
3. Enable "Developer mode".
4. Click on "Load unpacked" and select the extension's folder or the `manifest.json` file.
