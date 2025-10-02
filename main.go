package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	// Import Gemini SDK and other necessary packages later
)

// Global variable MUST be here to store the bytes
var lastImageBytes []byte

// RequestPayload defines the expected structure of the incoming JSON
type RequestPayload struct {
	ImageData string `json:"image_data"`
	Prompt    string `json:"prompt"`
}

func main() {
	http.HandleFunc("/process-image", processImageHandler)
	http.HandleFunc("/debug-last-image", debugLastImageHandler) // <-- Debug URL is registered

	// You might need CORS middleware for development with a browser extension
	// For a simple example, we'll start a server on 8080
	fmt.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// processImageHandler handles the incoming POST request from the extension
func processImageHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Set CORS headers (crucial for local extension testing)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload RequestPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 2. Clean up and Decode the Base64 string
	// The prefix "data:image/png;base64," must be removed
	parts := strings.Split(payload.ImageData, ",")
	if len(parts) != 2 {
		http.Error(w, "Invalid Data URL format", http.StatusBadRequest)
		return
	}
	base64Data := parts[1]

	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		http.Error(w, "Failed to decode Base64 image data", http.StatusInternalServerError)
		return
	}

	// At this point, `imageBytes` holds the raw PNG data in memory (no disk file).
	// You can now pass this byte slice directly to the Gemini API.
	lastImageBytes = imageBytes // <--- This line must be present
	// 3. TODO: Call the Gemini API here using `imageBytes` and `payload.Prompt`

	// Example Success Response (Replace with actual Gemini response)
	response := map[string]string{
		"status":     "success",
		"message":    "Image processed and ready for Gemini API call.",
		"image_size": fmt.Sprintf("%d bytes", len(imageBytes)),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// debugLastImageHandler (Crucial: Serves the saved bytes)
func debugLastImageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET method is allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(lastImageBytes) == 0 {
		http.Error(w, "No image has been processed yet by /process-image.", http.StatusNotFound)
		return
	}

	// Set header to tell browser this is a PNG
	w.Header().Set("Content-Type", "image/png")

	// Write the raw bytes directly to the HTTP response writer
	w.Write(lastImageBytes)
}
