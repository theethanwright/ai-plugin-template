"use client";

import { figmaAPI, FigmaData } from "@/lib/figmaAPI";
import { useState } from "react";
import { callData, WebsiteData } from "@/lib/callData";

const Plugin: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [scrapedData, setScrapedData] = useState<WebsiteData | null>(null);
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
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
        console.log("Parsed JSON result:", jsonResult);
        return jsonResult;
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

    } catch (error) {
      console.error("Error in streamAIResponse:", error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      return null;
    }
  }

  const scrapeBrand = async () => {
    try {
      console.log("Starting scrapeBrand with URL:", url);
      const data = await callData(url);
      console.log("Received data from callData:", data);
      
      const scrapedData = await streamAIResponse(data);
      console.log("The scraped data is:", scrapedData);
      if (scrapedData) {
        await createFigmaFrameWithBox(scrapedData);
      }

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

  const createFigmaFrameWithBox = async (scrapedData: any) => {
    try {
      const { primary_color, secondary_color, key_verbs } = scrapedData;
      console.log("Primary color from scraped data:", primary_color);
      let frameID: string | null = null;

      frameID = await figmaAPI.run(
        async (figma, { frameID, primary_color, key_verbs, secondary_color }) => {
          console.log("Running figmaAPI script with frameID:", frameID);

          let frame = figma.getNodeById(frameID ?? "") as FrameNode;

          if (!frame) {
            console.log("Creating a new frame");
            frame = figma.createFrame();
            frame.x = 0;
            frame.y = 0;
            frame.resize(471, 142);
          } else {
            console.log("Using existing frame:", frameID);
          }

          const primaryTitle = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          primaryTitle.fontName = { family: "Inter", style: "Regular" };
          primaryTitle.fontSize = 10;
          primaryTitle.characters = `Primary Color`;
          primaryTitle.x = 12;
          primaryTitle.y = 14;
          console.log("Created text node");

          frame.appendChild(primaryTitle);

          const primaryContainer = figma.createFrame();
          primaryContainer.x = 14;
          primaryContainer.x = 27;

          const priamryColor = figma.createRectangle();
          priamryColor.resize(100, 100);
          priamryColor.fills = [{ type: "SOLID", color: figma.util.rgb(primary_color) }];
          priamryColor.x = 20;
          priamryColor.y = 20;
          console.log("Created rectangle with color:", primary_color);

          frame.appendChild(priamryColor);

          const colorText = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          colorText.fontName = { family: "Inter", style: "Regular" };
          colorText.characters = `Primary Color is ${primary_color}`;
          colorText.x = rect1.x + rect1.width + 10;
          colorText.y = rect1.y;
          console.log("Created text node");

          frame.appendChild(colorText);

          const keyVerbs = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          keyVerbs.fontName = { family: "Inter", style: "Regular" };
          keyVerbs.fontSize = 10;
          keyVerbs.characters = `The key verbs are ${key_verbs}`;
          keyVerbs.x = rect1.x + rect1.width + 10;
          keyVerbs.y = colorText.height + 20;

          frame.appendChild(keyVerbs);


          console.log("Frame after adding elements:", frame);
          return frame.id;
        },
        { frameID, primary_color, key_verbs, secondary_color },
      );

      console.log("Created frame with box in Figma with ID:", frameID);
    } catch (error) {
      console.error("Error creating frame in Figma:", error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred while creating frame in Figma');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-5 mt-2">Brand Analyzer</h1>
      <div className="text-sm mb-5 text-gray-300">Input brand URL to analyze or fetch data from Figma.</div>
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
      {figmaData && (
        <div className="border border-gray-600 rounded p-5 bg-gray-800 shadow-lg m-2 text-gray-200">
          <pre className="whitespace-pre-wrap">
            <p className="text-md">Figma Data: {JSON.stringify(figmaData, null, 2)}</p>
          </pre>
        </div>
      )}
    </div>
  );
};

export default Plugin;
