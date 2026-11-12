import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// โหลดข้อมูล portfolio.json
const portfolioPath = path.resolve("src/data/portfolio.json");
const portfolioData = fs.readFileSync(portfolioPath, "utf-8");

let cachedModel = null;

async function getAvailableModel() {
  if (cachedModel) return cachedModel;

  const list = await groq.models.list();
  // กรองเอาเฉพาะโมเดลสำหรับแชท (ตัดโมเดลเสียง whisper และระบบป้องกัน guard ออก)
  const chatModels = list.data.filter(
    (m) =>
      !m.id.includes("whisper") &&
      !m.id.includes("guard") &&
      !m.id.includes("tts")
  );

  if (chatModels.length === 0) {
    throw new Error("ไม่พบโมเดลที่เปิดใช้งานในบัญชี Groq นี้");
  }

  // เลือกตระกูล llama หรือ qwen หรือ gpt ก่อน หากไม่มีให้เอาตัวแรกที่บัญชีรองรับ
  const preferred =
    chatModels.find((m) => m.id.includes("llama")) ||
    chatModels.find((m) => m.id.includes("qwen")) ||
    chatModels.find((m) => m.id.includes("gpt")) ||
    chatModels[0];

  cachedModel = preferred.id;
  console.log("Using Groq Model:", cachedModel);
  return cachedModel;
}

export async function askAI(messages) {
  const lastMsg = messages[messages.length - 1]?.content?.trim().toLowerCase() || "";

  // 1. ตอบแบบมีแพทเทิร์น (Rule-based)
  if (lastMsg === "สวัสดี" || lastMsg === "hello" || lastMsg === "hi") {
    return "สวัสดีครับ! ผมคือผู้ช่วย AI ของทีมฟ้าดลบันดาล สอบถามข้อมูลสมาชิก ทักษะ หรือโปรเจกต์ของทีมได้เลยครับ";
  }

  if (lastMsg.includes("github") || lastMsg.includes("ช่องทางติดต่อ")) {
    const data = JSON.parse(portfolioData);
    return `สามารถดูโค้ดและติดตามผลงานของทีมฟ้าดลบันดาลได้ที่ GitHub: ${data.group.contact.github}`;
  }

  // 2. ดึงชื่อโมเดลที่บัญชีใช้งานได้จริง แล้วถามตอบจาก portfolio.json
  const modelId = await getAvailableModel();

  const response = await groq.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: "system",
        content: `คุณคือผู้ช่วยตอบคำถามของทีม "ฟ้าดลบันดาล" จงตอบคำถามโดยอ้างอิงจากข้อมูล JSON ต่อไปนี้เท่านั้น ห้ามแต่งเรื่องเพิ่ม ตอบให้กระชับ เป็นมิตร และใช้ภาษาเดียวกับที่ผู้ใช้ถาม:\n${portfolioData}`,
      },
      ...messages.map((m) => ({
        role: m.role === "model" ? "assistant" : m.role,
        content: m.content,
      })),
    ],
  });

  return response.choices[0]?.message?.content || "ขออภัย ไม่สามารถประมวลผลคำตอบได้";
}