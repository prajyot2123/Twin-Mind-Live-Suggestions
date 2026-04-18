import { completeChat, transcribeAudio } from "./groqClient.js";

const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b";
const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3";

const LIVE_SUGGESTIONS_PROMPT = `You are a real-time meeting copilot actively listening to a live conversation.

Your job is to generate EXACTLY 3 high-quality suggestions based ONLY on the MOST RECENT 1–2 lines of the transcript.

STEP 1 — Understand what is happening RIGHT NOW:
(greeting, problem, planning, decision, interview, etc.)

STEP 2 — Generate 3 DIFFERENT suggestions:

1. A natural question to ask next
2. A practical talking point or action
3. A useful clarification or improvement

STRICT RULES:

* Be specific to THIS exact moment
* Do NOT give generic or reusable advice
* Do NOT assume facts not mentioned in the transcript
* Keep suggestions grounded in the actual conversation
* Each suggestion must feel like something a smart human teammate would say
* Use natural, conversational tone (not corporate or robotic)
* Keep preview concise (max 2 lines)
* If a suggestion could apply to any meeting -> rewrite it

STYLE EXAMPLES:
Bad: "What are the primary objectives of this meeting?"
Good: "Ask: What do we want to get done today?"

OUTPUT FORMAT (STRICT JSON ONLY):
[
{
"title": "...",
"preview": "...",
"type": "question"
},
{
"title": "...",
"preview": "...",
"type": "insight"
},
{
"title": "...",
"preview": "...",
"type": "clarification"
}
]

TRANSCRIPT:
{recent_transcript}`;

const FALLBACK_SUGGESTIONS_MESSAGE = "Unable to generate suggestions right now";

function nowIso() {
  return new Date().toISOString();
}

function normalizeTranscriptEntries(transcript = []) {
  return transcript
    .slice(-2)
    .map((entry) => {
      if (typeof entry === "string") {
        return { text: entry, timestamp: nowIso() };
      }

      return {
        text: String(entry?.text || entry?.content || "").trim(),
        timestamp: entry?.timestamp || nowIso(),
      };
    })
    .filter((entry) => entry.text && entry.text.trim().length > 5);
}

function formatTranscript(transcript = []) {
  return normalizeTranscriptEntries(transcript)
    .map((entry) => entry.text)
    .join("\n");
}

function truncateContext(text, maxChars = 3500) {
  if (!text) {
    return "";
  }

  return text.length > maxChars ? text.slice(text.length - maxChars) : text;
}

function safeParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function fallbackSuggestions(transcript = []) {
  const context = normalizeTranscriptEntries(transcript);
  const recentTopic = context[context.length - 1]?.text || "the latest discussion";

  return [
    {
      title: "What decision is still open?",
      preview: `Ask which part of ${recentTopic.slice(0, 90)} still needs a final decision before the meeting ends.`,
      type: "question",
    },
    {
      title: "Main risk or dependency",
      preview: "Call out the biggest blocker, owner, and deadline so the team can move immediately.",
      type: "insight",
    },
    {
      title: "Clarify success criteria",
      preview: "Confirm the exact success metric so follow-up actions stay aligned with the meeting outcome.",
      type: "clarification",
    },
  ];
}

function buildSuggestionPrompt(recentTranscript) {
  return LIVE_SUGGESTIONS_PROMPT.replace("{recent_transcript}", truncateContext(recentTranscript));
}

export async function generateTranscriptText({ apiKey, audioFile }) {
  if (!apiKey) {
    return { text: "Unable to transcribe without GROQ_API_KEY", timestamp: nowIso(), source: "missing-api-key" };
  }

  const response = await transcribeAudio({
    apiKey,
    audioFile,
    model: WHISPER_MODEL,
  });

  return {
    text: response?.text || "",
    timestamp: nowIso(),
    source: "groq-whisper-large-v3",
  };
}

export async function generateSuggestions({ apiKey, transcript = [] }) {
  const recentTranscript = normalizeTranscriptEntries(transcript);

  if (!recentTranscript.length) {
    return {
      suggestions: fallbackSuggestions(recentTranscript),
      createdAt: nowIso(),
      source: "fallback",
    };
  }

  if (!apiKey) {
    return {
      suggestions: fallbackSuggestions(recentTranscript),
      createdAt: nowIso(),
      source: "missing-api-key",
    };
  }

  try {
    const response = await completeChat({
      apiKey,
      model: CHAT_MODEL,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: buildSuggestionPrompt(formatTranscript(recentTranscript)) },
        { role: "user", content: "Generate the JSON now." },
      ],
    });

    const rawContent = response?.choices?.[0]?.message?.content || "[]";
    const parsed = safeParseJson(rawContent) || [];
    const entries = Array.isArray(parsed) ? parsed.slice(0, 3) : [];

    const normalized = ["question", "insight", "clarification"].map((type, index) => ({
      type,
      title: String(entries[index]?.title || fallbackSuggestions(recentTranscript)[index].title),
      preview: String(entries[index]?.preview || fallbackSuggestions(recentTranscript)[index].preview),
    }));

    return {
      suggestions: normalized,
      createdAt: nowIso(),
      source: "groq-gpt-oss-120b",
    };
  } catch {
    return {
      suggestions: fallbackSuggestions(recentTranscript),
      createdAt: nowIso(),
      source: "fallback-error",
      message: FALLBACK_SUGGESTIONS_MESSAGE,
    };
  }
}

export async function generateChatReply({ apiKey, message, transcript = [] }) {
  const recentTranscript = formatTranscript(transcript);

  if (!message?.trim()) {
    return {
      answer: "Please provide a message so I can help.",
      timestamp: nowIso(),
      source: "validation",
    };
  }

  if (!apiKey) {
    return {
      answer: `Summary response based on current context:\n- Main focus: ${recentTranscript || "No transcript yet"}\n- Next step: confirm owner, deadline, and success metric.\n- Suggested action: turn this into a clear task list and assign follow-ups.`,
      timestamp: nowIso(),
      source: "missing-api-key",
    };
  }

  try {
    const prompt = `User message:\n${message}\n\nContext:\n${recentTranscript || "No recent transcript"}`;

    const response = await completeChat({
      apiKey,
      model: CHAT_MODEL,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a sharp, real-time meeting copilot. Be specific, non-generic, and conversational.",
        },
        { role: "user", content: prompt },
      ],
    });

    return {
      answer: response?.choices?.[0]?.message?.content || "I could not generate a response right now.",
      timestamp: nowIso(),
      source: "groq-gpt-oss-120b",
    };
  } catch {
    return {
      answer: "Unable to generate a detailed answer right now.",
      timestamp: nowIso(),
      source: "fallback-error",
    };
  }
}
