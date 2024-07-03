import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { CompletionRequestBody } from "@/lib/types";
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

// This is used to format the message that the user sends to the API. Note we should
// never have the client create the prompt directly as this could mean that the client
// could use your api for any general purpose completion and leak the "secret sauce" of
// your prompt.
async function buildUserMessage(
  req: Request,
): Promise<ChatCompletionRequestMessage> {
  const body = await req.json();

  // We use zod to validate the request body. To change the data that is sent to the API,
  // change the CompletionRequestBody type in lib/types.ts
  const { layers } = CompletionRequestBody.parse(body);

  const bulletedList = layers.map((layer) => `* ${layer}`).join("\n");

  return {
    role: "user",
    content: bulletedList,
  };
}

async function buildMessageForParsingPage(data: WebsiteData) {
  return "The colors are " + data.colors;
}

export async function POST(req: Request) {
  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: true,
    temperature: 0,
    messages: [systemMessage, await buildMessageForParsingPage(req)],
  });

  // // Convert the response into a friendly text-stream
  // const stream = OpenAIStream(response);
  // // Respond with the stream
  // const result = new StreamingTextResponse(stream);

  // return result;

  return response;
}
