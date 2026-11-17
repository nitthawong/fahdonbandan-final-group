import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const portfolioPath = path.resolve("src/data/portfolio.json");
const portfolioData = fs.readFileSync(portfolioPath, "utf-8");

let cachedModel = null;

async function getAvailableModel() {
  if (cachedModel) return cachedModel;

  const list = await groq.models.list();
  // กรองเอาเฉพาะโมเดลแชทหลัก ตัดตัวเสียง/ป้องกัน/โมเดลตัวเล็ก และ qwen (ติด limit 1000 OTPM) ออก
  const chatModels = list.data.filter(
    (m) =>
      !m.id.includes("whisper") &&
      !m.id.includes("guard") &&
      !m.id.includes("tts") &&
      !m.id.includes("instant") &&
      !m.id.includes("qwen")
  );

  const pool = chatModels.length > 0 ? chatModels : list.data;

  const preferred =
    pool.find((m) => m.id.includes("70b")) ||
    pool.find((m) => m.id.includes("gpt")) ||
    pool.find((m) => m.id.includes("llama")) ||
    pool[0];

  cachedModel = preferred.id;
  console.log("Using Groq Model:", cachedModel);
  return cachedModel;
}

export async function askAI(messages) {
  const lastMsg = messages[messages.length - 1]?.content?.trim().toLowerCase() || "";

  if (lastMsg === "สวัสดี" || lastMsg === "hello" || lastMsg === "hi") {
    return "สวัสดีครับ! ผมคือผู้ช่วย AI ของทีมฟ้าดลบันดาล สอบถามข้อมูลสมาชิก ทักษะ หรือโปรเจกต์ของทีมได้เลยครับ";
  }

  if (lastMsg.includes("github") || lastMsg.includes("ช่องทางติดต่อ")) {
    const data = JSON.parse(portfolioData);
    return `สามารถดูโค้ดและติดตามผลงานของทีมฟ้าดลบันดาลได้ที่ GitHub: ${data.group.contact.github}`;
  }

  const modelId = await getAvailableModel();

  const response = await groq.chat.completions.create({
    model: modelId,
    temperature: 0.3,
    max_tokens: 500, // จำกัดความยาวคำตอบไม่ให้เกินโควตา Free Tier
    messages: [
      {
        role: "system",
        content: `คุณคือผู้ช่วยตอบคำถามของทีม "ฟ้าดลบันดาล" จงตอบคำถามโดยอ้างอิงจากข้อมูล JSON ต่อไปนี้เท่านั้น ห้ามแต่งเรื่องเพิ่ม
กฎการจัดรูปแบบข้อความ (สำคัญมาก):
- ห้ามใช้เครื่องหมายดอกจัน (**) หรือสัญลักษณ์ Markdown ใดๆ เด็ดขาด ให้ตอบเป็นข้อความธรรมดาที่สะอาดตา
- หากมีหลายข้อ ให้ขึ้นบรรทัดใหม่และใช้ขีด (-) นำหน้าแต่ละข้อ
- ตอบให้กระชับ เป็นมิตร และใช้ภาษาเดียวกับที่ผู้ใช้ถาม

ข้อมูลทีม:\n${portfolioData}`,
      },
      ...messages.map((m) => ({
        role: m.role === "model" ? "assistant" : m.role,
        content: m.content,
      })),
    ],
  });

  const rawReply = response.choices[0]?.message?.content || "ขออภัย ไม่สามารถประมวลผลคำตอบได้";
  return rawReply.replace(/\*\*/g, "").replace(/^\*\s/gm, "- ");
}