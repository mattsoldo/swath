import OpenAI from "openai";
import { swatchConfig } from "@/config/swatch.config";

export interface ImageGenerationRequest {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

export interface ImageGenerationResponse {
  url: string;
  revisedPrompt?: string;
}

export class ImageGenerator {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    if (!apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    this.model = model || swatchConfig.defaultImageModel;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await this.client.images.generate({
        model: this.model,
        prompt: request.prompt,
        n: 1,
        size: request.size || "1024x1024",
        quality: request.quality || "standard",
        style: request.style || "vivid",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No image data in response");
      }

      const imageData = response.data[0];

      if (!imageData || !imageData.url) {
        throw new Error("No image URL in response");
      }

      return {
        url: imageData.url,
        revisedPrompt: imageData.revised_prompt,
      };
    } catch (error) {
      console.error("Image generation error:", error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async generateMultiple(
    request: ImageGenerationRequest,
    count: number
  ): Promise<ImageGenerationResponse[]> {
    const promises = Array.from({ length: count }, () => this.generateImage(request));
    return Promise.all(promises);
  }
}

// Singleton instance
export const imageGenerator = new ImageGenerator();
