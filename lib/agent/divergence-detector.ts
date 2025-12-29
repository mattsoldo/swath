import Anthropic from "@anthropic-ai/sdk";
import { swatchConfig } from "@/config/swatch.config";
import type { DivergenceSuggestion } from "@/types";

export class DivergenceDetector {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key is required");
    }

    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async detectDivergence(
    threadPrompt: string,
    userMessage: string,
    recentContext: string
  ): Promise<DivergenceSuggestion> {
    const systemPrompt = `You are a divergence detection system for a visual design application.

Your task is to determine if a user's new request diverges significantly from the current thread's purpose.

Guidelines:
- A thread has a specific focus defined by its prompt
- Minor variations or iterations on the same theme are NOT divergent
- Completely new topics, different design areas, or unrelated requests ARE divergent
- Return a confidence score between 0 and 1 (0 = definitely on-topic, 1 = definitely divergent)
- If divergent, suggest a new thread prompt that captures the user's new direction

Thread Purpose: ${threadPrompt}

Recent work in this thread:
${recentContext}

User's new request:
${userMessage}

Respond in JSON format:
{
  "isDivergent": boolean,
  "confidence": number,
  "suggestedNewPrompt": string (only if divergent)
}`;

    try {
      const response = await this.client.messages.create({
        model: swatchConfig.defaultModel,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from API");
      }

      const result = JSON.parse(textContent.text);

      return {
        isDivergent: result.confidence >= swatchConfig.divergenceThreshold,
        confidence: result.confidence,
        suggestedNewPrompt: result.suggestedNewPrompt,
      };
    } catch (error) {
      console.error("Divergence detection error:", error);
      // Default to not divergent on error
      return {
        isDivergent: false,
        confidence: 0,
      };
    }
  }
}

export const divergenceDetector = new DivergenceDetector();
