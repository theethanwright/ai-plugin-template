"use client";

import { useState } from "react";
import { callData, WebsiteData } from "@/lib/callData"; // Adjust the import path as needed

const Plugin: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [scrapedData, setScrapedData] = useState<WebsiteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function streamAIResponse(data: WebsiteData) {
    try {
      console.log("Sending data to /api/completion:", data);
      const resp = await fetch("/api/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!resp.body) {
        throw new Error("No response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      console.log("Received response from /api/completion:", result);

      try {
        const jsonResult = JSON.parse(result);
        setScrapedData(jsonResult);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

    } catch (error) {
      console.error("Error in streamAIResponse:", error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }

  const scrapeBrand = async () => {
    try {
      console.log("Starting scrapeBrand with URL:", url);
      const data = await callData(url);
      console.log("Received data from callData:", data);
      
      await streamAIResponse(data);
      setError(null); // Clear any previous error
    } catch (error) {
      console.error("Error in scrapeBrand:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-5 mt-2">Brand Analyzer</h1>
      <div className="text-sm mb-5 text-gray-300">Input brand URL to analyze.</div>
      <div className="flex flex-row gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="mb-5 p-2 px-4 rounded bg-gray-800 text-white"
        />
        <button
          onClick={scrapeBrand}
          className="mb-5 p-2 px-4 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Scrape Website
        </button>
      </div>
      {error && (
        <div className="border border-red-600 rounded p-5 bg-red-800 shadow-lg m-2 text-gray-200">
          <p className="text-md">Error: {error}</p>
        </div>
      )}
      {scrapedData && (
        <div className="border border-gray-600 rounded p-5 bg-gray-800 shadow-lg m-2 text-gray-200">
          <pre className="whitespace-pre-wrap">
            <p className="text-md">Scraped Data: {JSON.stringify(scrapedData, null, 2)}</p>
          </pre>
        </div>
      )}
    </div>
  );
};

export default Plugin;
