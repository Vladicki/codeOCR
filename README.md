# codeOCR: Advanced OCR for Code Snippets

---

## Project Overview

codeOCR is an open-source image recognition utility designed to be highly accurate in recognizing and parsing code from images. It excels where traditional OCR tools falter, boasting up to 90% higher accuracy in identifying programming languages and preserving the original structure, indentation, and syntax of code snippets.

This tool is implemented as a browser extension with a powerful Go backend, providing a seamless experience for developers to extract code from screenshots, online tutorials, or any image source directly within their browser.

---

## Collaboration & Development

This project is managed using **Git** for version control.

---

## Skills & Technologies Highlighted

We utilized a range of technologies to build codeOCR:

*   **Backend:** **Go (Golang)** for building a high-performance server to handle the OCR processing.
*   **Frontend:** **JavaScript** for the browser extension's logic and user interaction.
*   **Browser Extension APIs:** Standard APIs for creating the extension for browsers like Chrome and Firefox.
*   **Core Concept:** Advanced **Optical Character Recognition (OCR)** techniques tailored for code.

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