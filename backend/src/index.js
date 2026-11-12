import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import { initDb } from "./db/index.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/chat", chatRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database init failed:", err.message);
    process.exit(1);
  });
