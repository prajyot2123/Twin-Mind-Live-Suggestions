import "dotenv/config";
import express from "express";
import cors from "cors";
import copilotRoutes from "./routes/copilotRoutes.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use(copilotRoutes);
app.use("/api", copilotRoutes);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
