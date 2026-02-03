import OpenAI from "openai";

let clientInstance: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  clientInstance = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_USER_APP_URL ?? "http://localhost:3000",
      "X-Title": "AI Telegram Channels Platform",
    },
    timeout: 120000, // 2 minute timeout for long-running SVG generation
    maxRetries: 2, // Retry on transient errors
  });

  return clientInstance;
}

export function getDefaultModel(): string {
  return process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getAIClient();
  const model = options?.model ?? getDefaultModel();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function streamChat(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<AsyncIterable<string>> {
  const client = getAIClient();
  const model = options?.model ?? getDefaultModel();

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  });

  async function* generateChunks() {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  return generateChunks();
}
