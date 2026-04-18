import "dotenv/config";
import express from "express";
import cors from "cors";
import copilotRoutes from "./routes/copilotRoutes.js";

const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-groq-api-key"]
}));

app.use(express.json({ limit: "2mb" }));

app.get("/api/test", (_req, res) => {
  res.json({ message: "API routes working", routes: ["/api/chat", "/api/suggestions", "/api/transcribe"] });
});


app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

app.use("/api", copilotRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
