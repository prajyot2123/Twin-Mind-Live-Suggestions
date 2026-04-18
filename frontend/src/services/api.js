const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const API_PREFIX = "/api";

function buildHeaders(apiKey, extra = {}) {
  return {
    ...(apiKey ? { "x-groq-api-key": apiKey } : {}),
    ...extra,
  };
}

async function parseJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.details || data?.error || "Request failed");
  }
  return data;
}

export async function postTranscribe({ apiKey, audioBlob }) {
  const formData = new FormData();
  if (audioBlob) {
    formData.append("audio", audioBlob, `chunk-${Date.now()}.webm`);
  }

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: formData,
  });

  return parseJson(response);
}

export async function postSuggestions({ apiKey, recentTranscript }) {
  const response = await fetch(`${API_BASE_URL}/suggestions`, {
    method: "POST",
    headers: buildHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ transcript: recentTranscript }),
  });

  return parseJson(response);
}

export async function postChat({ apiKey, messages, transcriptContext, userMessage }) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: buildHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ message: userMessage, transcript: transcriptContext, messages }),
  });

  return parseJson(response);
}
