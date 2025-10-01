package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://postman-echo.com/get"

	resp, err := http.Get(url)
	if err != nil {
		println(err)
		return
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response body:", err)
		return
	}

	fmt.Println(string(body))
}
