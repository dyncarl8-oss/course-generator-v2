import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function listModels() {
    try {
        const models = await ai.models.list();
        console.log("Available Models:");
        models.forEach(m => {
            console.log(`- ${m.name} (Supported methods: ${m.supportedMethods?.join(", ")})`);
        });
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
