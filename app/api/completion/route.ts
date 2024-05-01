import { ChatCompletionRequestMessage } from "openai-edge";
import { CompletionRequestBody } from "@/lib/types";
import { CohereClient } from "cohere-ai";
import { z } from "zod";

// Set up the Cohere client with your API key
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export const runtime = "edge";

// Different prompts for different use cases can be used to guide the AI
const spellcheckSystemMessage = {
  role: "system",
  content: `As an AI language assistant specialized in French, your task is to identify any misspelled words in the text provided and provide their correct spellings. Only correct the words and skip missing spaces or ":" or "," or any possible punctuations. You should respond in that format: "The word [word] should be replaced with [correct word]". If no misspelled words are found, respond with "No misspelled words found".`,
} as const;

const grammarCheckSystemMessage = {
  role: "system",
  content: `As an AI language assistant specialized in French, your task is to identify any french errors in the text provided and provide corrections. You should respond in that format: "The word [word] should be replaced with [correct word]". If no grammatical errors are found, respond with "No grammatical errors found".`,
} as const;

const designerSystemMessage = {
  role: "system",
  content: `You are an AI design assistant. You will be given a design prompt or concept, and you will generate design ideas or variations based on it. Keep your answer short and to the point.`,
} as const;

// This is used to format the message that the user sends to the API.
// Note we should never have the client create the prompt directly as this could mean that the client
// could use your api for any general purpose completion and leak the "secret sauce" of
// your prompt.
async function buildUserMessage(
  req: Request,
): Promise<ChatCompletionRequestMessage> {
  const body = await req.json();
  const { layers, systemRole } = CompletionRequestBody.parse(body);
  const bulletedList = layers.map((layer) => `* ${layer}`).join("\n");

  const systemMessages: { [key: string]: string } = {
    spellcheck: spellcheckSystemMessage.content,
    grammarCheck: grammarCheckSystemMessage.content,
    designer: designerSystemMessage.content,
  };

  const systemMessage =
    systemMessages[systemRole] ||
    "You are an AI assistant. Please provide instructions.";

  // Combine the system message and user message into a single string
  const combinedMessage = `${systemMessage}\n${bulletedList}`;

  return {
    role: "user",
    content: combinedMessage,
  };
}

export async function POST(req: Request) {
  // Build the user message
  const userMessage = await buildUserMessage(req);

  // Combine the system message and user message into a single string
  const combinedMessage = `${userMessage.content}`;
  // Ask Cohere for a chat completion given the combined message
  const response = await cohere.chat({ message: combinedMessage });
  // Convert the response into a friendly text-stream
  // Respond with the stream to the client
  const result = new Response(response.text);
  return result;
}
