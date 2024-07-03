import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { WebsiteData } from "@/lib/callData";

// Create an OpenAI API client
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export const runtime = "edge";

// This is the instructions that GPT-4 will use to know how to respond. For more information on
// the difference between a system message and a user message, see:
// https://platform.openai.com/docs/guides/gpt/chat-completions-api
const systemMessage = {
  role: "system",
  content: `You are a skilled assistant at analyzing web content for brand elements. Analyze the given web content and return the response as a valid JSON object with the following keys: primary_color, secondary_color, color_scheme, fonts, key_adjectives, and key_verbs. Ensure the output is always in the following format: 
                    {
                        "primary_color": "#ffffff",
                        "secondary_color": "#101010",
                        "color_scheme": ["#ffffff", "#101010"],
                        "header_font": ["Nohemi"],
                        "paragraph_font": ["IBM Plex Mono, monospace"],
                        "key_adjectives": ["graphic", "visual", "creative", "professional"],
                        "key_verbs": ["design", "illustration", "create", "share"]
                    }. 
                    If any information is not available, return an empty string for colors and fonts, and an empty list for color_scheme, key_adjectives, and key_verbs.`,
} as const;

async function buildMessageForParsingPage(data: WebsiteData): Promise<WebsiteData> {
  try {
    console.log("Received WebsiteData:", data);
    const color = data.colors;

    const message = {
      role: "user",
      content: "The colors are " + color,
    };

    console.log("Built message for parsing page:", message);
    return message;
  } catch (error) {
    console.error("Error in buildMessageForParsingPage:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    console.log("Received POST request:", req);

    const data = await req.json();
    console.log("Parsed request JSON:", data);

    const userMessage = await buildMessageForParsingPage(data);
    console.log("User message for OpenAI:", userMessage);

    // Ask OpenAI for a streaming completion given the prompt
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      temperature: 0,
      messages: [systemMessage, userMessage],
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);
    
    // Debug: log the response from OpenAI
    console.log("OpenAI streaming response:", stream);

    // Respond with the stream
    const result = new StreamingTextResponse(stream);

    return result;
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
