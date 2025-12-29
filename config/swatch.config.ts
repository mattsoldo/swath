export const swatchConfig = {
  // Context management
  recentIterationsWindow: parseInt(process.env.RECENT_ITERATIONS_WINDOW || "5"),
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || "100000"),
  compressionThreshold: parseFloat(process.env.COMPRESSION_THRESHOLD || "0.8"),

  // Agent settings
  defaultModel: process.env.DEFAULT_LLM_MODEL || "claude-sonnet-4-5-20250929",
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL || "gpt-4o",

  // Divergence detection
  divergenceThreshold: parseFloat(process.env.DIVERGENCE_THRESHOLD || "0.7"),
} as const;
