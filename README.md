# codeOCR:  OCR for Code Snippets

codeOCR is an open-source image recognition utility designed to be highly accurate in recognizing and parsing code from images. It excels where traditional OCR tools falter, boasting up to 90% higher accuracy in identifying programming languages and preserving the original structure, indentation, and syntax of code snippets.

This tool is implemented as a browser extension with a powerful Go backend, providing a seamless experience for developers to extract code from screenshots, online tutorials, or any image source directly within their browser.

<img width="627" height="646" alt="image" src="https://github.com/user-attachments/assets/5b1eef8f-7fec-4e1e-a085-e7a7a65d028f" />

---

## Installation & Usage

Follow these steps to set up and run codeOCR locally.

### Prerequisites

*   [Go](https://golang.org/doc/install) (version 1.x or higher)
*   A modern web browser that supports extensions (e.g., Google Chrome, Mozilla Firefox).

### Backend Setup

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd codeOCR
    ```
2.  Build and run the Go server:
    ```bash
    go build
    ./codeOCR
    ```
    The server will start and listen for requests from the browser extension.

### Browser Extension Setup

1.  Open your web browser (e.g., Google Chrome).
2.  Navigate to the extensions page (`chrome://extensions`).
3.  Enable "Developer mode" (usually a toggle in the top right corner).
4.  Click on "Load unpacked".
5.  Select the root directory of this project (`/path/to/codeOCR`).
6.  The codeOCR extension icon should now appear in your browser's toolbar. You can now use it to capture code from images on any webpage.
