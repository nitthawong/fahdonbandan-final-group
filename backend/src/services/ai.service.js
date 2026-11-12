import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// โหลดข้อมูล portfolio.json มาเป็นบริบทให้ AI ตอบคำถาม
const portfolioPath = path.resolve("src/data/portfolio.json");
const portfolioData = fs.readFileSync(portfolioPath, "utf-8");

export async function askAI(messages) {
  // ดึงข้อความล่าสุดที่ผู้ใช้พิมพ์เข้ามา
  const lastUserMessage = messages[messages.length - 1]?.content?.trim().toLowerCase() || "";

  // ---------------------------------------------------------
  // ส่วนที่ 1: ตอบแบบมีแพทเทิร์น (Rule-based / Quick Replies)
  // ---------------------------------------------------------
  if (lastUserMessage === "สวัสดี" || lastUserMessage === "hello" || lastUserMessage === "hi") {
    return "สวัสดีครับ! ผมคือผู้ช่วย AI ของทีมฟ้าดลบันดาล สอบถามข้อมูลสมาชิก ทักษะ หรือผลงานโปรเจกต์ของทีมได้เลยครับ";
  }

  if (lastUserMessage.includes("ช่องทางติดต่อ") || lastUserMessage.includes("github")) {
    const parsedData = JSON.parse(portfolioData);
    return `คุณสามารถติดตามผลงานและโค้ดของทีมฟ้าดลบันดาลได้ที่ GitHub: ${parsedData.group.contact.github}`;
  }

  // ---------------------------------------------------------
  // ส่วนที่ 2: ตอบแบบดึงคำตอบจริงจาก Gemini (สำหรับคำถามทั่วไป/เจาะลึก)
  // ---------------------------------------------------------
  const formattedContents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await ai.models.generateContent({
    model: process.env.AI_MODEL || "gemini-2.5-flash",
    contents: formattedContents,
    config: {
      systemInstruction: `คุณคือผู้ช่วยตอบคำถามของทีม "ฟ้าดลบันดาล" จงตอบคำถามโดยอ้างอิงจากข้อมูล JSON ต่อไปนี้เท่านั้น ตอบให้กระชับ เป็นมิตร และใช้ภาษาเดียวกับที่ผู้ใช้ถาม:\n${portfolioData}`,
    },
  });

  return response.text;
}