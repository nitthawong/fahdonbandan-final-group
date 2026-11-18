import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import { initDb } from "./db/index.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "10kb" }));

// จำกัดจำนวนคำขอต่อ IP กันโควตา Groq ฟรีหมด (20 ครั้ง/นาที)
const hits = new Map();
app.use("/api/chat", (req, res, next) => {
  if (req.method !== "POST") return next();
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({ error: "ส่งข้อความถี่เกินไป กรุณารอสักครู่" });
  }
  recent.push(now);
  hits.set(req.ip, recent);
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/chat", chatRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database init failed:", err);
    process.exit(1);
  });