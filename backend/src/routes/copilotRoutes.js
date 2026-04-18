import express from "express";
import multer from "multer";
import {
  generateSuggestions,
  generateTranscriptText,
  generateChatReply,
} from "../services/copilotService.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/transcribe", (_req, res) => {
  res.status(405).json({
    error: "Method not allowed",
    details: "Use POST /api/transcribe with multipart/form-data",
  });
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const apiKey = req.header("x-groq-api-key") || process.env.GROQ_API_KEY;
    const result = await generateTranscriptText({
      apiKey,
      audioFile: req.file,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message,
    });
  }
});

router.post("/suggestions", async (req, res) => {
  try {
    const apiKey = req.header("x-groq-api-key") || process.env.GROQ_API_KEY;
    const transcript = Array.isArray(req.body?.transcript)
      ? req.body.transcript
      : Array.isArray(req.body?.recentTranscript)
        ? req.body.recentTranscript
        : [];

    const result = await generateSuggestions({
      apiKey,
      transcript,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate suggestions",
      details: error.message,
    });
  }
});

router.get("/suggestions", (_req, res) => {
  res.status(405).json({
    error: "Method not allowed",
    details: "Use POST /api/suggestions with application/json",
  });
});

router.post("/chat", async (req, res) => {
  try {
    const apiKey = req.header("x-groq-api-key") || process.env.GROQ_API_KEY;
    const transcript = Array.isArray(req.body?.transcript)
      ? req.body.transcript
      : Array.isArray(req.body?.transcriptContext)
        ? req.body.transcriptContext
        : [];
    const message = req.body?.message || req.body?.userMessage || "";

    const result = await generateChatReply({
      apiKey,
      message,
      transcript,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate chat response",
      details: error.message,
    });
  }
});

router.get("/chat", (_req, res) => {
  res.status(405).json({
    error: "Method not allowed",
    details: "Use POST /api/chat with application/json",
  });
});

export default router;
