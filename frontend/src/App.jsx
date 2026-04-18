import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TranscriptPanel from "./components/TranscriptPanel";
import SuggestionsPanel from "./components/SuggestionsPanel";
import ChatPanel from "./components/ChatPanel";
import useMeetingRecorder from "./hooks/useMeetingRecorder";
import { postChat, postSuggestions, postTranscribe } from "./services/api";

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function recentTranscriptWindow(transcript) {
  return transcript.slice(-8);
}

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("groq_api_key") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiWarning, setShowApiWarning] = useState(!localStorage.getItem("groq_api_key"));

  const [transcript, setTranscript] = useState([]);
  const [suggestionBatches, setSuggestionBatches] = useState([]);
  const [messages, setMessages] = useState([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const transcriptRef = useRef(transcript);
  const messagesRef = useRef(messages);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const onAudioChunk = useCallback(
    async (audioBlob) => {
      setIsTranscribing(true);
      try {
        const result = await postTranscribe({
          apiKey,
          audioBlob,
        });

        const next = {
          id: makeId("transcript"),
          text: result.text,
          timestamp: result.timestamp || new Date().toISOString(),
          source: result.source,
        };

        setTranscript((prev) => [...prev, next]);
      } catch (error) {
        setTranscript((prev) => [
          ...prev,
          {
            id: makeId("transcript_error"),
            text: `Transcription error: ${error.message}`,
            timestamp: new Date().toISOString(),
            source: "error",
          },
        ]);
      } finally {
        setIsTranscribing(false);
      }
    },
    [apiKey],
  );

  const { error: recorderError } = useMeetingRecorder({
    isRecording,
    onChunk: onAudioChunk,
    intervalMs: 30000,
  });

  const refreshSuggestions = useCallback(async () => {
    if (isRefreshingSuggestions) {
      return;
    }

    setIsRefreshingSuggestions(true);
    try {
      const result = await postSuggestions({
        apiKey,
        recentTranscript: recentTranscriptWindow(transcriptRef.current),
      });

      const batch = {
        id: makeId("batch"),
        createdAt: result.createdAt || new Date().toISOString(),
        note: result.message || "",
        suggestions: (result.suggestions || []).slice(0, 3).map((item, idx) => ({
          id: makeId(`suggestion_${idx}`),
          kind: item.type || item.kind || "suggestion",
          title: item.title || "Untitled suggestion",
          preview: item.preview || "No preview",
        })),
      };

      setSuggestionBatches((prev) => [batch, ...prev]);
    } catch (error) {
      setSuggestionBatches((prev) => [
        {
          id: makeId("batch_error"),
          createdAt: new Date().toISOString(),
          suggestions: [
            {
              id: makeId("suggestion_error_1"),
              kind: "question",
              title: "Unable to generate suggestions right now",
              preview: "Retry in a moment or check your Groq API key and backend connection.",
            },
            {
              id: makeId("suggestion_error_2"),
              kind: "insight",
              title: "Check API key or backend",
              preview: "The backend could not return three suggestions for this cycle.",
            },
            {
              id: makeId("suggestion_error_3"),
              kind: "clarification",
              title: "Try manual refresh",
              preview: "Retry once transcript has additional context.",
            },
          ],
          note: "Unable to generate suggestions right now",
        },
        ...prev,
      ]);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [apiKey, isRefreshingSuggestions]);

  const sendMessage = useCallback(
    async (text, source = "manual") => {
      const userMessage = {
        id: makeId("msg_user"),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        source,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsThinking(true);

      try {
        const result = await postChat({
          apiKey,
          messages: [...messagesRef.current, userMessage].slice(-12),
          transcriptContext: recentTranscriptWindow(transcriptRef.current),
          userMessage: text,
        });

        const assistantMessage = {
          id: makeId("msg_assistant"),
          role: "assistant",
          content: result.answer,
          timestamp: result.timestamp || new Date().toISOString(),
          source: result.source,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId("msg_error"),
            role: "assistant",
            content: `Chat error: ${error.message}`,
            timestamp: new Date().toISOString(),
            source: "error",
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [apiKey],
  );

  function handleSuggestionClick(suggestion) {
    const content = `${suggestion.title}\n\n${suggestion.preview}`;
    sendMessage(content, "suggestion-click");
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      transcript,
      suggestionBatches,
      messages,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meeting-copilot-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    localStorage.setItem("groq_api_key", apiKey);
    setShowApiWarning(!apiKey);
  }, [apiKey]);

  const totalSuggestions = useMemo(
    () => suggestionBatches.reduce((sum, batch) => sum + batch.suggestions.length, 0),
    [suggestionBatches],
  );

  return (
    <div className="h-screen bg-[#060b14] p-2 sm:p-3">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col rounded-xl border border-[#273247] bg-[#0a1221] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        <header className="rounded-md border border-[#273247] bg-gradient-to-b from-[#121a2a] to-[#0d1423] px-4 py-2.5">
          {showApiWarning ? (
            <div className="mb-2 rounded-md border border-amber-400/50 bg-amber-100/10 px-3 py-2 text-xs text-amber-100">
              GROQ_API_KEY is missing. Add it in Settings to enable live Groq responses.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold tracking-wide text-[#edf3ff]">TwinMind - Live Suggestions Web App (Reference Mockup)</h1>
              <p className="text-[11px] text-[#7f95bb]">
                Transcript: {transcript.length} | Suggestions: {totalSuggestions} | Chat: {messages.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="hidden text-xs text-[#87a2cf] lg:block">3-column layout - Transcript - Live Suggestions - Chat</p>
              <button
                type="button"
                onClick={() => {}}
                className="rounded-md border border-[#2f4368] bg-[#182235] px-3 py-1.5 text-xs text-[#a9bee1] hover:bg-[#1d2b43]"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-md border border-[#3877dd] bg-[#5ea2ff] px-3 py-1.5 text-xs font-semibold text-[#0b1930] hover:bg-[#76b0ff]"
              >
                Export JSON
              </button>
            </div>
          </div>

          {showSettings ? (
            <div className="mt-3 rounded-md border border-[#304567] bg-[#121d30] p-3">
              <label className="block text-xs font-medium text-[#9fb8df]">Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="mt-1 w-full rounded-md border border-[#304567] bg-[#0f1727] px-3 py-2 text-sm text-[#dbe7fb] outline-none focus:border-[#4d84de]"
                placeholder="gsk_..."
              />
              <p className="mt-1 text-xs text-[#7f95bb]">
                Key is stored in localStorage and sent via x-groq-api-key header.
              </p>
            </div>
          ) : null}
        </header>

        <main className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-3">
          <TranscriptPanel
            transcript={transcript}
            isRecording={isRecording}
            onToggleRecording={() => setIsRecording((prev) => !prev)}
            isTranscribing={isTranscribing}
            recorderError={recorderError}
          />
          <SuggestionsPanel
            suggestionBatches={suggestionBatches}
            onRefresh={refreshSuggestions}
            onSuggestionClick={handleSuggestionClick}
            isRefreshing={isRefreshingSuggestions}
          />
          <ChatPanel messages={messages} onSendMessage={sendMessage} isThinking={isThinking} />
        </main>
      </div>
    </div>
  );
}
