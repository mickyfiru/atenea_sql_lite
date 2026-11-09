import { mockProvider } from './mockProvider';
import { AIAssistantProvider, ParsedAlertCommand } from './types';

const deepSeekBackendUrl = process.env.EXPO_PUBLIC_DEEPSEEK_BACKEND_URL;
const deepSeekModel = process.env.EXPO_PUBLIC_DEEPSEEK_MODEL ?? 'deepseek-chat';

async function postToBackend<T>(path: string, body: unknown): Promise<T> {
  if (!deepSeekBackendUrl) {
    throw new Error('Configura EXPO_PUBLIC_DEEPSEEK_BACKEND_URL para probar DeepSeek.');
  }

  const response = await fetch(`${deepSeekBackendUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('DeepSeek no pudo responder en este momento.');
  }

  return response.json() as Promise<T>;
}

export const deepSeekProvider: AIAssistantProvider = {
  provider: 'deepseek',
  async sendMessage(prompt, context) {
    // La API key de DeepSeek no debe ir en el frontend. Usar backend o Firebase Function.
    // Nunca pongas una API key real de DeepSeek en el frontend. Usa un backend propio
    // que firme la solicitud, aplique cuotas y filtre datos sensibles antes de llamar al modelo.
    return postToBackend('/chat', {
      provider: 'deepseek',
      model: deepSeekModel,
      prompt,
      context,
    });
  },
  async parseAlertCommand(text) {
    try {
      return await postToBackend<ParsedAlertCommand>('/parse-alert-command', {
        provider: 'deepseek',
        model: deepSeekModel,
        text,
      });
    } catch (error) {
      console.warn('[ai] deepseek parse fallback mock', error);
      return mockProvider.parseAlertCommand(text);
    }
  },
};
