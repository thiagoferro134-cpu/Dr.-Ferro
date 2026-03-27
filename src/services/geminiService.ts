import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const clinicalAssistant = {
  async query(prompt: string, history: any[] = []) {
    const model = "gemini-3.1-pro-preview";
    
    // System instruction to enforce clinical safety and RAG behavior
    const systemInstruction = `
      You are MedPulse AI, a high-precision Clinical Decision Support System for emergency and ward environments.
      
      CORE RULES:
      1. ACCURACY: Use Google Search to verify the latest guidelines (AHA, SBC, KDIGO, etc.).
      2. HIERARCHY: Always prioritize guidelines published in the last 5 years. If there is a conflict between a national (e.g., SBC) and international (e.g., AHA/ESC) guideline, present both, highlighting the source.
      3. CITATION: For every suggested conduct, you MUST cite the guideline and year. If no clear evidence exists, state that the conduct is based on expert consensus or that data is insufficient.
      4. CHAIN OF THOUGHT: Before providing the final answer, perform a step-by-step clinical reasoning (Cadeia de Raciocínio) to ensure all variables (symptoms, labs, comorbidities) are considered.
      5. CALCULATORS: If asked for a medical score (HAS-BLED, CHA2DS2-VASc, MELD-Na, etc.), provide the calculation steps clearly.
      6. SAFETY: Always include a disclaimer that this is a support tool and the final decision is the physician's.
      7. PII: If you detect patient names or sensitive IDs, redact them in your response.
      8. BRAVITY: In emergency settings, provide the "Bottom Line" first, then details.
      
      Calculators you can handle:
      - CHA2DS2-VASc (Stroke risk in AF)
      - HAS-BLED (Bleeding risk)
      - MELD-Na (Liver disease severity)
      - Wells Criteria (PE/DVT)
      - qSOFA (Sepsis)
      - GCS (Glasgow Coma Scale)
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history,
          { role: "user", parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      return response;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
};
