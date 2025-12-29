import Anthropic from "@anthropic-ai/sdk";
import { swatchConfig } from "@/config/swatch.config";
import { contextBuilder } from "./context-builder";
import { divergenceDetector } from "./divergence-detector";
import { imageGenerator } from "./image-generator";
import type { AgentResponse, AgentStatus } from "@/types";
import type {
  MasterContext,
  ContextElement,
  Thread,
  Artifact,
} from "@/generated/prisma";

export interface ProcessRequestInput {
  projectId: string;
  threadId: string;
  userMessage: string;
  masterContext?: MasterContext & {
    elements: ContextElement[];
  };
  thread: Thread & {
    artifacts: (Artifact & { feedback?: any })[];
  };
}

export class CreativeDirector {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key is required");
    }

    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async processRequest(input: ProcessRequestInput): Promise<AgentResponse> {
    const statuses: AgentStatus[] = [];
    const artifacts: any[] = [];

    try {
      // 1. Build context
      statuses.push({
        type: "thinking",
        message: "Analyzing your request and gathering context...",
      });

      const contextResult = contextBuilder.buildContext({
        thread: input.thread,
        masterContext: input.masterContext,
      });

      // 2. Check for divergence
      const recentContext =
        contextResult.contextItems
          .filter((item) => item.source === "recent")
          .map((item) => item.content)
          .join("\n") || "No recent work";

      const divergence = await divergenceDetector.detectDivergence(
        input.thread.prompt,
        input.userMessage,
        recentContext
      );

      if (divergence.isDivergent) {
        statuses.push({
          type: "divergence",
          suggestion: divergence,
        });
        return { status: statuses, artifacts };
      }

      // 3. Process the request
      statuses.push({
        type: "thinking",
        message: "Understanding your creative direction...",
      });

      const decision = await this.analyzeRequest(
        input.userMessage,
        contextResult.contextItems.map((i) => i.content).join("\n\n")
      );

      // 4. Execute based on decision
      if (decision.action === "generate_image") {
        statuses.push({
          type: "generating",
          message: "Creating visual designs...",
        });

        const imageResponse = await imageGenerator.generateImage({
          prompt: decision.imagePrompt!,
          size: decision.imageSize,
          quality: decision.imageQuality,
          style: decision.imageStyle,
        });

        artifacts.push({
          type: "IMAGE",
          imageUrl: imageResponse.url,
          agentPrompt: decision.imagePrompt,
          metadata: {
            revisedPrompt: imageResponse.revisedPrompt,
            size: decision.imageSize,
            quality: decision.imageQuality,
            style: decision.imageStyle,
          },
        });

        statuses.push({
          type: "artifact",
          artifact: artifacts[0],
        });
      } else if (decision.action === "research") {
        statuses.push({
          type: "researching",
          message: decision.researchTopic || "Gathering design insights...",
        });

        // Placeholder for future research capabilities
        statuses.push({
          type: "complete",
          summary: decision.response,
        });
      } else {
        statuses.push({
          type: "complete",
          summary: decision.response,
        });
      }

      return { status: statuses, artifacts };
    } catch (error) {
      console.error("Creative Director error:", error);
      statuses.push({
        type: "error",
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
      return { status: statuses, artifacts };
    }
  }

  private async analyzeRequest(
    userMessage: string,
    context: string
  ): Promise<CreativeDecision> {
    const systemPrompt = `You are the Creative Director of Swatch, an AI-powered visual design tool.

Your role is to understand user requests and decide how to help them. You can:
1. Generate images using AI
2. Provide design advice and guidance
3. Suggest next steps
4. Research design topics (future capability)

Context about the current project:
${context}

User request:
${userMessage}

Respond in JSON format:
{
  "action": "generate_image" | "research" | "advise",
  "response": "Your response to the user",
  "imagePrompt": "Detailed prompt for image generation (if action is generate_image)",
  "imageSize": "1024x1024" | "1792x1024" | "1024x1792" (optional),
  "imageQuality": "standard" | "hd" (optional),
  "imageStyle": "vivid" | "natural" (optional),
  "researchTopic": "What to research (if action is research)"
}

Guidelines for image generation:
- Create detailed, specific prompts that incorporate context from the Master Context
- Include style, mood, color palette from context elements marked as MUST_HAVE or IMPORTANT
- Be specific about composition, lighting, and atmosphere
- Default to vivid style for creative work, natural for realistic designs`;

    try {
      const response = await this.client.messages.create({
        model: swatchConfig.defaultModel,
        max_tokens: 2000,
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

      const decision: CreativeDecision = JSON.parse(textContent.text);
      return decision;
    } catch (error) {
      console.error("Request analysis error:", error);
      return {
        action: "advise",
        response: "I had trouble understanding your request. Could you please rephrase it?",
      };
    }
  }
}

interface CreativeDecision {
  action: "generate_image" | "research" | "advise";
  response: string;
  imagePrompt?: string;
  imageSize?: "1024x1024" | "1792x1024" | "1024x1792";
  imageQuality?: "standard" | "hd";
  imageStyle?: "vivid" | "natural";
  researchTopic?: string;
}

export const creativeDirector = new CreativeDirector();
