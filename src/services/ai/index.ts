import { deepSeekProvider } from './deepseekProvider';
import { mockProvider } from './mockProvider';
import { getOllamaConfig, ollamaProvider, testOllamaConnection } from './ollamaProvider';
import {
  AIAssistantProvider,
  AIAssistantProviderName,
  AIMessageContext,
  AIMessageResponse,
} from './types';

export * from './types';
export { testOllamaConnection };

const providers: Record<AIAssistantProviderName, AIAssistantProvider> = {
  deepseek: deepSeekProvider,
  ollama: ollamaProvider,
  mock: mockProvider,
};

function resolveProviderName(value?: string): AIAssistantProviderName {
  if (value === 'deepseek' || value === 'ollama' || value === 'mock') {
    return value;
  }

  return 'mock';
}

function getConfiguredProviderName() {
  return resolveProviderName(process.env.EXPO_PUBLIC_ATENEA_AI_COMMAND_PROVIDER);
}

function getProviderLabel(provider: AIAssistantProviderName, fallbackUsed = false) {
  if (fallbackUsed && provider === 'ollama') {
    return 'IA: Ollama no disponible, usando Mock Demo';
  }

  switch (provider) {
    case 'ollama':
      return 'IA: Ollama';
    case 'deepseek':
      return 'IA: DeepSeek backend';
    case 'mock':
    default:
      return 'IA: Mock Demo';
  }
}

function withProviderMetadata(
  response: AIMessageResponse,
  providerUsed: AIAssistantProviderName,
  fallbackUsed = false,
) {
  return {
    ...response,
    providerUsed,
    fallbackUsed,
    providerLabel: getProviderLabel(providerUsed, fallbackUsed),
  };
}

export function resolveAIProvider() {
  const providerName = getConfiguredProviderName();

  return {
    providerName,
    provider: providers[providerName],
    label: getProviderLabel(providerName),
  };
}

export async function sendAICommandWithFallback(prompt: string, context?: AIMessageContext) {
  const { providerName, provider } = resolveAIProvider();

  if (providerName === 'mock') {
    return withProviderMetadata(await mockProvider.sendMessage(prompt, context), 'mock');
  }

  if (providerName === 'ollama') {
    try {
      return withProviderMetadata(await provider.sendMessage(prompt, context), 'ollama');
    } catch (error) {
      console.warn('[Atenea IA] Ollama no disponible, usando mock fallback.', error);
      return withProviderMetadata(await mockProvider.sendMessage(prompt, context), 'ollama', true);
    }
  }

  // La API key de DeepSeek no debe ir en el frontend. Usar backend o Firebase Function.
  try {
    return withProviderMetadata(await provider.sendMessage(prompt, context), 'deepseek');
  } catch (error) {
    console.warn('[Atenea IA] DeepSeek backend no disponible, usando mock fallback.', error);
    return withProviderMetadata(await mockProvider.sendMessage(prompt, context), 'deepseek', true);
  }
}

export function getAIAssistantProvider() {
  return providers[getConfiguredProviderName()];
}

export function getAIAssistantProviderLabel() {
  return resolveAIProvider().label;
}

export function getAIProviderDebugInfo(fallbackActive = false) {
  const configuredProvider = getConfiguredProviderName();
  const ollamaConfig = getOllamaConfig();

  return {
    configuredProvider,
    effectiveProvider: fallbackActive ? 'mock' as const : configuredProvider,
    ollamaBaseUrl: ollamaConfig.baseUrl,
    ollamaModel: ollamaConfig.model,
    deepseekBackendConfigured: Boolean(process.env.EXPO_PUBLIC_DEEPSEEK_BACKEND_URL),
    mockFallbackAvailable: true,
  };
}

export function sendMessage(prompt: string, context?: AIMessageContext) {
  return sendAICommandWithFallback(prompt, context);
}

export async function parseAlertCommand(text: string) {
  const { providerName, provider } = resolveAIProvider();

  if (providerName === 'mock') {
    return mockProvider.parseAlertCommand(text);
  }

  try {
    return await provider.parseAlertCommand(text);
  } catch (error) {
    if (providerName === 'ollama') {
      console.warn('[Atenea IA] Ollama no disponible, usando mock fallback.', error);
    } else {
      console.warn('[Atenea IA] DeepSeek backend no disponible, usando mock fallback.', error);
    }

    return mockProvider.parseAlertCommand(text);
  }
}
