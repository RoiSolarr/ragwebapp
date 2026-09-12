import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-1.5-flash was retired in 2025; gemini-3.5-flash is the current
// GA flash model.
const CHAT_MODEL = "gemini-3.5-flash";

export async function generateRAGAnswer(query: string, context: string) {
  const result = await genAI.models.generateContent({
    model: CHAT_MODEL,
    contents: `Context:\n${context}\n\nQuestion: ${query}`,
    config: {
      systemInstruction:
        "Answer the question using ONLY the numbered sources given in the context. " +
        "Cite the source for every claim by putting its bracketed number, e.g. [1], " +
        "immediately after the sentence it supports. If the sources don't contain " +
        "the answer, say so plainly instead of guessing.",
    },
  });
  return result.text ?? "";
}