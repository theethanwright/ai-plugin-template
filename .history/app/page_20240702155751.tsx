"use client";

import { figmaAPI } from "@/lib/figmaAPI";
import { getTextForSelection } from "@/lib/getTextForSelection";
import { getTextOffset } from "@/lib/getTextOffset";
import { callData } from "@/lib/callData";
import { DataSchema } from "@/lib/types2";
import { useState } from "react";
import { z } from "zod";

// This function calls our API and returns the complete text response.
async function streamAIResponse(body: z.infer<typeof DataSchema>) {
  const formData = new FormData();
  formData.append("text", body.text);
  formData.append("css", JSON.stringify(body.css));
  formData.append("colors", JSON.stringify(body.colors));
  formData.append("screenshot", new Blob([body.screenshot]));

  const resp = await fetch("/api/completion", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    throw new Error("Error fetching response");
  }

  const text = await resp.text();
  return text;
}

export default function Plugin() {
  const [completion, setCompletion] = useState("");
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState<z.infer<typeof DataSchema> | null>(null);

  // This function scrapes the website and updates the Figma canvas with the scraped data.
  const scrapeBrand = async () => {
    try {
      const data = await callData(url);
      console.log(data);
      setScrapedData(data);

      const responseText = await streamAIResponse(data);

      let text = "";
      let nodeID: string | null = null;
      const textPosition = await getTextOffset();

      const createOrUpdateTextNode = async () => {
        nodeID = await figmaAPI.run(
          async (figma, { nodeID, text, textPosition }) => {
            let node = figma.getNodeById(nodeID ?? "");

            if (!node) {
              node = figma.createText();
              node.x = textPosition?.x ?? 0;
              node.y = textPosition?.y ?? 0;
            }

            if (node.type !== "TEXT") {
              return "";
            }

            const oldHeight = node.height;

            await figma.loadFontAsync({ family: "Inter", style: "Medium" });
            node.fontName = { family: "Inter", style: "Medium" };

            node.characters = text;

            if (oldHeight !== node.height) {
              figma.viewport.scrollAndZoomIntoView([node]);
            }

            return node.id;
          },
          { nodeID, text, textPosition }
        );
      };

      text += responseText;
      await createOrUpdateTextNode();
    } catch (error) {
      console.error("Error scraping brand:", error);
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
      {scrapedData && (
        <div className="border border-gray-600 rounded p-5 bg-gray-800 shadow-lg m-2 text-gray-200">
          <pre className="whitespace-pre-wrap">
            <p className="text-md">Scraped Data: {JSON.stringify(scrapedData, null, 2)}</p>
          </pre>
        </div>
      )}
      {completion && (
        <div className="border border-gray-600 rounded p-5 bg-gray-800 shadow-lg m-2 text-gray-200">
          <pre className="whitespace-pre-wrap">
            <p className="text-md">{completion}</p>
          </pre>
        </div>
      )}
    </div>
  );
}
