import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const portfolio = JSON.parse(
  readFileSync(new URL("../data/portfolio.json", import.meta.url), "utf-8")
);

// สร้าง system prompt จากข้อมูล Portfolio ของกลุ่มและสมาชิกทุกคน
function buildSystemPrompt() {
  return `คุณคือผู้ช่วย AI ประจำเว็บ Portfolio ของกลุ่ม "${portfolio.group.name}"
หน้าที่: ตอบคำถามเกี่ยวกับกลุ่มและสมาชิกแต่ละคน โดยอิงจากข้อมูลด้านล่างนี้เท่านั้น
ถ้าคำถามไม่เกี่ยวกับข้อมูลนี้ หรือไม่มีข้อมูลในส่วนนั้น ให้บอกตรง ๆ ว่าไม่ทราบ ห้ามเดาหรือแต่งข้อมูลเพิ่ม
ตอบเป็นภาษาเดียวกับที่ผู้ใช้ถาม สุภาพและกระชับ

ข้อมูล Portfolio (JSON):
${JSON.stringify(portfolio, null, 2)}`;
}

// messages = [{ role: "user" | "assistant", content: "..." }]
export async function askAI(messages) {
  const response = await client.messages.create({
    model: process.env.AI_MODEL || "claude-sonnet-4-6",
    max_tokens: 1000,
    system: buildSystemPrompt(),
    messages,
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
