import Groq from "groq-sdk";
import { File } from "node:buffer";

function getGroqClient(apiKey = process.env.GROQ_API_KEY) {
  if (!apiKey) {
    return null;
  }

  return new Groq({ apiKey });
}

function ensureClient(client) {
  if (!client) {
    throw new Error("Missing GROQ_API_KEY");
  }

  return client;
}

export function createGroqClient(apiKey) {
  return getGroqClient(apiKey);
}

export async function transcribeAudio({ apiKey, audioFile, model }) {
  const client = ensureClient(getGroqClient(apiKey));
  const file = new File([audioFile.buffer], audioFile.originalname || "audio.webm", {
    type: audioFile.mimetype || "audio/webm",
  });

  const response = await client.audio.transcriptions.create({
    file,
    model,
  });

  return response;
}

export async function completeChat({ apiKey, model, messages, temperature = 0.3, max_tokens }) {
  const client = ensureClient(getGroqClient(apiKey));

  return client.chat.completions.create({
    model,
    messages,
    temperature,
    ...(typeof max_tokens === "number" ? { max_tokens } : {}),
  });
}
