package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Global variable MUST be here to store the bytes for the debug endpoint
var lastImageBytes []byte

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

// --- Request/Response Structures for Gemini API ---

type Part struct {
	Text       string `json:"text,omitempty"`
	InlineData *struct {
		MimeType string `json:"mimeType"`
		Data     string `json:"data"`
	} `json:"inlineData,omitempty"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

// Global server link
var SERVER_LINK string

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []Part `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// --- Handlers and Core Logic ---

// RequestPayload defines the expected structure of the incoming JSON from the extension
type RequestPayload struct {
	ImageData string `json:"image_data"`
	Prompt    string `json:"prompt"`
}

func main() {
	// Load .env if exists
	_ = godotenv.Load()

	// Check for API Key before starting the server
	if os.Getenv("GEMINI_API_KEY") == "" {
		log.Fatal("FATAL: GEMINI_API_KEY environment variable not set. Cannot run server.")
	}

	// Load SERVER_LINK or fallback
	SERVER_LINK = os.Getenv("SERVER_LINK")
	if SERVER_LINK == "" {
		SERVER_LINK = "http://localhost:8080/process-image"
	}
	http.HandleFunc("/process-image", processImageHandler)
	http.HandleFunc("/debug-last-image", debugLastImageHandler)

	fmt.Println("Server listening on :8080. Awaiting requests...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// callGeminiApi sends the image and prompt to the Gemini API.
func callGeminiApi(imageBytes []byte, prompt string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")

	// Base64 encode the image bytes (the API expects a separate Base64 string from the browser's Data URL)
	encodedImage := base64.StdEncoding.EncodeToString(imageBytes)

	// Construct the Gemini API payload
	payload := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{
						Text: prompt,
					},
					{
						InlineData: &struct {
							MimeType string `json:"mimeType"`
							Data     string `json:"data"`
						}{
							MimeType: "image/png",
							Data:     encodedImage,
						},
					},
				},
			},
		},
	}

	requestBody, _ := json.Marshal(payload)

	// Create the request
	req, err := http.NewRequest("POST", GEMINI_API_URL, bytes.NewBuffer(requestBody))
	if err != nil {
		return "", fmt.Errorf("failed to create API request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	// Append the API Key to the URL as a query parameter
	q := req.URL.Query()
	q.Add("key", apiKey)
	req.URL.RawQuery = q.Encode()

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute API request: %w", err)
	}
	defer resp.Body.Close()

	// Check for non-200 status codes
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf(
			"API returned non-200 status code: %d, Body: %s",
			resp.StatusCode,
			string(bodyBytes),
		)
	}

	// Decode the response
	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", fmt.Errorf("failed to decode API response: %w", err)
	}

	// Extract the generated text
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "Model did not return any text output.", nil
}

// processImageHandler handles the incoming POST request from the extension
func processImageHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("INFO: Received request from %s for %s", r.RemoteAddr, r.URL.Path)

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
		log.Printf("WARN: Invalid method %s received for /process-image", r.Method)
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload RequestPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Printf("ERROR: Invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 2. Clean up and Decode the Base64 string
	parts := strings.Split(payload.ImageData, ",")
	if len(parts) != 2 {
		log.Printf("ERROR: Invalid Data URL format, expected 2 parts, got %d", len(parts))
		http.Error(w, "Invalid Data URL format", http.StatusBadRequest)
		return
	}
	base64Data := parts[1]

	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		log.Printf("ERROR: Failed to decode Base64 data: %v", err)
		http.Error(w, "Failed to decode Base64 image data", http.StatusInternalServerError)
		return
	}

	lastImageBytes = imageBytes // Store bytes globally

	// 3. Call the Gemini API
	log.Printf(
		"INFO: Calling Gemini API with image size %d bytes and prompt length %d...",
		len(imageBytes),
		len(payload.Prompt),
	)

	geminiText, err := callGeminiApi(imageBytes, payload.Prompt)
	if err != nil {
		log.Printf("ERROR: Gemini API call failed: %v", err)
		http.Error(w, fmt.Sprintf("Gemini API Error: %v", err), http.StatusInternalServerError)
		return
	}

	// 4. Respond with the actual Gemini output
	response := map[string]string{
		"result_text": geminiText, // <-- Actual Gemini result
		"status":      "success",
		"message":     "Image processed by Gemini.",
		"image_size":  fmt.Sprintf("%d bytes", len(imageBytes)),
	}

	log.Printf(
		"SUCCESS: Gemini response received and returned to extension. Result length: %d",
		len(geminiText),
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// debugLastImageHandler (Serves the saved bytes)
func debugLastImageHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("INFO: Received debug request from %s for %s", r.RemoteAddr, r.URL.Path)

	if r.Method != http.MethodGet {
		http.Error(w, "Only GET method is allowed", http.StatusMethodNotAllowed)
		return
	}

	if len(lastImageBytes) == 0 {
		log.Println("WARN: Debug image requested but no image processed yet.")
		http.Error(w, "No image has been processed yet by /process-image.", http.StatusNotFound)
		return
	}

	// Set header to tell browser this is a PNG
	w.Header().Set("Content-Type", "image/png")

	log.Printf("SUCCESS: Serving debug image of size %d bytes.", len(lastImageBytes))
	// Write the raw bytes directly to the HTTP response writer
	w.Write(lastImageBytes)
}
