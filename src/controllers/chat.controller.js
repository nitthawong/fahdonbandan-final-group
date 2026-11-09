import { pool } from "../db/index.js";
import { askAI } from "../services/ai.service.js";

// POST /api/chat  body: { sessionId, message }
export async function sendMessage(req, res) {
  const { sessionId, message } = req.body;

  if (!sessionId || !message || !message.trim()) {
    return res.status(400).json({ error: "sessionId และ message จำเป็นต้องมี" });
  }

  try {
    // ดึงประวัติเดิม 20 ข้อความล่าสุด เพื่อให้ AI จำบทสนทนาได้
    const { rows } = await pool.query(
      `SELECT role, content FROM (
         SELECT role, content, id FROM messages
         WHERE session_id = $1 ORDER BY id DESC LIMIT 20
       ) t ORDER BY id ASC`,
      [sessionId]
    );

    const reply = await askAI([...rows, { role: "user", content: message }]);

    await pool.query(
      "INSERT INTO messages (session_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)",
      [sessionId, message, reply]
    );

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อ AI" });
  }
}

// GET /api/chat/history/:sessionId
export async function getHistory(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT role, content, created_at FROM messages WHERE session_id = $1 ORDER BY id ASC",
      [req.params.sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ดึงประวัติไม่สำเร็จ" });
  }
}
