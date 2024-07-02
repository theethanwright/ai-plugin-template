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
  formData.append('text', body.text);
  formData.append('css', JSON.stringify(body.css));
  formData.append('colors', JSON.stringify(body.colors));
  formData.append('screenshot', new Blob([body.screenshot]));

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

  // This is the same as above, but instead of updating React state, it adds the
  // text to the Figma canvas.
  const scrapeBrand = async () => {
    const data = await scrapeWebsiteData();

    const responseText = await streamAIResponse({
      data,
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

    text += responseText;
    await createOrUpdateTextNode();
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-5 mt-2">Poem Generator</h1>
      <div className="text-sm mb-5 text-gray-300">
        Select a node to create a poem about the text inside of it.
      </div>
      <div className="flex flex-row gap-2">
        <button
          onClick={scrapeBrand}
          className="mb-5 p-2 px-4 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Scrape Website
        </button>
      </div>
      <div>
        <input />
      </div>
    </div>
  );
}
