import { useEffect, useRef, useState } from "react";

export default function useMeetingRecorder({ isRecording, onChunk, intervalMs = 30000 }) {
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackIntervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function startRecording() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
          fallbackIntervalRef.current = setInterval(() => {
            onChunk(null);
          }, intervalMs);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            onChunk(event.data);
          }
        };

        recorder.onerror = (event) => {
          setError(event.error?.message || "Recorder error");
        };

        recorder.start(intervalMs);
      } catch (err) {
        setError(err.message || "Unable to access microphone");
        fallbackIntervalRef.current = setInterval(() => {
          onChunk(null);
        }, intervalMs);
      }
    }

    function stopRecording() {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      mediaRecorderRef.current = null;
    }

    if (isRecording) {
      setError("");
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      mounted = false;
      stopRecording();
    };
  }, [isRecording, intervalMs, onChunk]);

  return { error };
}
