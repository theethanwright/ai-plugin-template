"use client";

import { figmaAPI } from "@/lib/figmaAPI";
import { getTextForSelection } from "@/lib/getTextForSelection";
import { getTextOffset } from "@/lib/getTextOffset";
import { CompletionRequestBody } from "@/lib/types";
import { useState } from "react";
import { z } from "zod";
import { callData } from "@/path/to/your/callData"; // Adjust the import path as needed

async function streamAIResponse(body: z.infer<typeof CompletionRequestBody>) {
  const resp = await fetch("/api/completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const reader = resp.body?.pipeThrough(new TextDecoderStream()).getReader();

  if (!reader) {
    throw new Error("Error reading response");
  }

  return reader;
}

export default function Plugin() {
  const [completion, setCompletion] = useState("");
  const [scrapedData, setScrapedData] = useState<WebsiteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchData = async () => {
    const url = "https://example.com"; // Replace with the URL you want to scrape
    try {
      const data = await callData(url);
      setScrapedData(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const onStreamToIFrame = async () => {
    setCompletion("");
    const layers = await getTextForSelection();

    if (!layers.length) {
      figmaAPI.run(async (figma) => {
        figma.notify(
          "Please select a layer with text in it to generate a poem.",
          { error: true },
        );
      });
      return;
    }

    const reader = await streamAIResponse({
      layers,
    });

    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      text += value;
      setCompletion(text);
    }
  };

  // This is the same as above, but instead of updating React state, it adds the
  // text to the Figma canvas.
  const onStreamToCanvas = async () => {
    const layers = await getTextForSelection();

    if (!layers.length) {
      figmaAPI.run(async (figma) => {
        figma.notify(
          "Please select a layer with text in it to generate a poem.",
          { error: true },
        );
      });
      return;
    }

    const reader = await streamAIResponse({
      layers,
    });

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
        { nodeID, text, textPosition },
      );
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      text += value;
      await createOrUpdateTextNode();
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-5 mt-2">Poem Generator</h1>
      <div className="text-sm mb-5 text-gray-300">
        Select a node to create a poem about the text inside of it.
      </div>
      <div className="flex flex-row gap-2">
        <button
          onClick={onStreamToIFrame}
          className="mb-5 p-2 px-4 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Generate Poem in iframe
        </button>
        <button
          onClick={onStreamToCanvas}
          className="mb-5 p-2 px-4 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Generate Poem on Canvas
        </button>
        <button
          onClick={handleFetchData}
          className="mb-5 p-2 px-4 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Fetch Scraped Data
        </button>
      </div>
      {scrapedData && (
        <div className="border border-gray-600 rounded p-5 bg-gray-800 shadow-lg m-2 text-gray-200">
          <pre className="whitespace-pre-wrap">
            <p className="text-md">Scraped Data: {JSON.stringify(scrapedData, null, 2)}</p>
          </pre>
        </div>
      )}
      {error && (
        <div className="border border-red-600 rounded p-5 bg-red-800 shadow-lg m-2 text-gray-200">
          <p className="text-md">Error: {error}</p>
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
