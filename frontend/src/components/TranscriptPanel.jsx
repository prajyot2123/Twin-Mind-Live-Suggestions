import { useEffect, useRef } from "react";

export default function TranscriptPanel({
  transcript,
  isRecording,
  onToggleRecording,
  isTranscribing,
  recorderError,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[10px] border border-[#24344f] bg-[#0b1324]">
      <div className="flex items-center justify-between border-b border-[#1e2c44] px-3 py-2.5">
        <h2 className="text-sm uppercase tracking-wide text-[#8ca6cf]">1. Mic & Transcript</h2>
        <span className="text-xs uppercase tracking-wide text-[#8ca6cf]">{isRecording ? "Recording" : "Idle"}</span>
      </div>

      <div className="border-b border-[#16233a] px-3 py-3">
        <button
          type="button"
          onClick={onToggleRecording}
          className="inline-flex items-center gap-3 rounded-md text-left"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${isRecording ? "bg-[#4f8eed]" : "bg-[#6da9ff]"}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-[#07152b]" />
          </span>
          <span className="text-sm text-[#90a8ce]">
            {isRecording ? "Mic live. Transcript appends every ~30s." : "Click mic to start. Transcript appends every ~30s."}
          </span>
        </button>

        <div className="mt-3 rounded-md border border-[#2f4f80] bg-[#15243c] p-3 text-sm leading-relaxed text-[#d5e3fd]">
          The transcript scrolls and appends new chunks every ~30 seconds while recording. Use the mic button to
          start/stop. Include an export button so we can pull the full session.
        </div>
      </div>

      {recorderError ? (
        <div className="mx-3 mt-3 rounded-md border border-amber-400/60 bg-amber-100/10 px-2 py-1 text-xs text-amber-200">
          {recorderError}
        </div>
      ) : null}

      <div className="panel-scroll flex-1 overflow-y-auto px-3 py-4">
        {!transcript.length ? (
          <p className="pt-6 text-center text-[22px] text-[#273957]">No transcript yet - start the mic.</p>
        ) : (
          <ul className="space-y-2">
            {transcript.map((entry) => (
              <li key={entry.id} className="rounded-md border border-[#2f4f80] bg-[#15243c] p-2.5">
                <p className="text-sm text-[#d5e3fd]">{entry.text}</p>
                <p className="mt-1 text-[11px] text-[#8ca6cf]">{new Date(entry.timestamp).toLocaleTimeString()}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[#8ca6cf]">{isTranscribing ? "Transcribing current chunk..." : ""}</p>
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
