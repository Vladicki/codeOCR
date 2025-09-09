package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	fmt.Println("hui")

	f, err := os.Open("./test.txt")

	if err != nil {
		panic(err)
	}

	for {
		data := make([]byte, 10)
		_, err := f.Read(data)
		if err != nil {
			break
		}
		fmt.Printf("read: %s\n", string(data))

	}

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
	fmt.Println(string(body))
}
