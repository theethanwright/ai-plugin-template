"use client";

import { figmaAPI } from "@/lib/figmaAPI";
import { scrapeWebsiteData } from "@/lib/scrapeWebsiteData";
import { CompletionRequestBody } from "@/lib/types";
import { useState } from "react";
import { z } from "zod";

// This function calls our API and lets you read each character as it comes in.
// To change the prompt of our AI, go to `app/api/completion.ts`.
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

  // This function calls our API and handles the streaming response.
  // This ends up building the text up and using React state to update the UI.
  const onStreamToIFrame = async () => {
    setCompletion("");
    const layers = await scrapeWebsiteData();

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
      </div>
      <input>

      </input>
      <div>
  
      </div>
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
