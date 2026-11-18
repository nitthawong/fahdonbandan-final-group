import pg from "pg";
import { readFileSync } from "fs";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // บน Render/Neon/Railway ให้ตั้ง DATABASE_SSL=true
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// สร้างตารางอัตโนมัติจาก schema.sql ตอนเริ่มเซิร์ฟเวอร์
export async function initDb() {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf-8");
  await pool.query(sql);
  console.log("Database ready");
}