import pg from "pg";
import { readFileSync } from "fs";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // ถ้า deploy บน Render/Railway ที่ต้องใช้ SSL ให้เปิดบรรทัดล่าง
  // ssl: { rejectUnauthorized: false },
});

// สร้างตารางอัตโนมัติจาก schema.sql ตอนเริ่มเซิร์ฟเวอร์
export async function initDb() {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf-8");
  await pool.query(sql);
  console.log("Database ready");
}
