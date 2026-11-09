export type AteneaAiProvider = 'mock' | 'openai' | 'gemini' | 'ollama' | 'deepseek';

const provider = process.env.EXPO_PUBLIC_ATENEA_AI_PROVIDER;
const validProviders: AteneaAiProvider[] = ['mock', 'openai', 'gemini', 'ollama', 'deepseek'];

function resolveProvider(value?: string): AteneaAiProvider {
  return validProviders.includes(value as AteneaAiProvider)
    ? (value as AteneaAiProvider)
    : 'mock';
}

export const aiConfig = {
  provider: resolveProvider(provider),
  openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  openAiModel: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-1.5-flash',
  ollamaBaseUrl: process.env.EXPO_PUBLIC_OLLAMA_BASE_URL ?? 'http://localhost:11434',
  ollamaModel: process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? 'llama3.1',
  deepSeekApiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
  deepSeekModel: process.env.EXPO_PUBLIC_DEEPSEEK_MODEL ?? 'deepseek-chat',
} as const;
