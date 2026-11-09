import { aiConfig, AteneaAiProvider } from '../config/ai';
import { AlertCategory, Message, UserLocation } from '../types/domain';
import { SummaryEvent } from './summary';

export type AteneaPriority = 'baja' | 'media' | 'alta';

export type AteneaSummaryInput = {
  recentAlerts: SummaryEvent[];
  recentMessages: Message[];
  category: 'Todas' | AlertCategory;
  userLocation?: UserLocation;
};

export type AteneaSummaryResult = {
  summary: string;
  keyPoints: string[];
  priority: AteneaPriority;
  recommendation: string;
};

type ProviderHandler = (input: AteneaSummaryInput) => Promise<AteneaSummaryResult>;

export async function generateAteneaSummary(input: AteneaSummaryInput) {
  validateSummaryInput(input);

  const provider = aiConfig.provider;
  const handlers: Record<AteneaAiProvider, ProviderHandler> = {
    mock: generateMockSummary,
    openai: generateOpenAiSummary,
    gemini: generateGeminiSummary,
    ollama: generateOllamaSummary,
    deepseek: generateDeepSeekSummary,
  };

  return handlers[provider](input);
}

function validateSummaryInput(input: AteneaSummaryInput) {
  if (!input.recentAlerts.length && !input.recentMessages.length) {
    throw new Error('No hay datos suficientes para generar un resumen.');
  }
}

async function generateMockSummary(input: AteneaSummaryInput): Promise<AteneaSummaryResult> {
  const nearbyAlerts = input.recentAlerts.filter((alert) => alert.distanceKm !== undefined);
  const closeAlerts = nearbyAlerts.filter((alert) => (alert.distanceKm ?? Number.POSITIVE_INFINITY) < 1);
  const priority = getMockPriority(input.recentAlerts.length, closeAlerts.length);
  const categoryLabel = input.category === 'Todas' ? 'todas las categorias' : input.category;
  const sector = getSectorLabel(input.userLocation);
  const alertTitles = input.recentAlerts.slice(0, 3).map((alert) => alert.title);
  const messageCount = input.recentMessages.length;

  return {
    summary: `Atenea reviso ${input.recentAlerts.length} alertas y ${messageCount} mensajes recientes en ${sector} para ${categoryLabel}.`,
    keyPoints: [
      ...alertTitles,
      closeAlerts.length ? `${closeAlerts.length} alerta(s) a menos de 1 km.` : 'No hay alertas a menos de 1 km.',
      messageCount ? `${messageCount} mensaje(s) comunitarios recientes considerados.` : 'Sin mensajes recientes relevantes.',
    ].slice(0, 5),
    priority,
    recommendation: getMockRecommendation(priority),
  };
}

function getMockPriority(alertCount: number, closeAlertCount: number): AteneaPriority {
  if (closeAlertCount > 0 || alertCount >= 5) {
    return 'alta';
  }

  if (alertCount >= 2) {
    return 'media';
  }

  return 'baja';
}

function getMockRecommendation(priority: AteneaPriority) {
  switch (priority) {
    case 'alta':
      return 'Revisa las alertas cercanas, evita desplazamientos innecesarios y mantente atento a tu grupo principal.';
    case 'media':
      return 'Monitorea la actividad y comparte informacion verificada con tus grupos.';
    case 'baja':
      return 'No hay indicios criticos; revisa nuevas actualizaciones mas tarde.';
  }
}

function getSectorLabel(userLocation?: UserLocation) {
  if (!userLocation?.locationEnabled) {
    return 'tu sector';
  }

  return [userLocation.district, userLocation.city].filter(Boolean).join(', ') || 'tu sector';
}

function buildPrompt(input: AteneaSummaryInput) {
  return [
    'Eres Atenea, una asistente comunitaria. Genera un resumen breve, puntos importantes, prioridad baja/media/alta y recomendacion.',
    `Categoria: ${input.category}`,
    `Sector: ${getSectorLabel(input.userLocation)}`,
    `Alertas: ${JSON.stringify(input.recentAlerts)}`,
    `Mensajes: ${JSON.stringify(input.recentMessages.slice(0, 20))}`,
  ].join('\n');
}

async function generateOpenAiSummary(input: AteneaSummaryInput): Promise<AteneaSummaryResult> {
  if (!aiConfig.openAiApiKey) {
    throw new Error('Configura EXPO_PUBLIC_OPENAI_API_KEY para usar OpenAI.');
  }

  // Integration placeholder: send buildPrompt(input) to the configured OpenAI model and map JSON output.
  throw new Error('Proveedor OpenAI preparado, pero no activado en esta version.');
}

async function generateGeminiSummary(input: AteneaSummaryInput): Promise<AteneaSummaryResult> {
  if (!aiConfig.geminiApiKey) {
    throw new Error('Configura EXPO_PUBLIC_GEMINI_API_KEY para usar Gemini.');
  }

  // Integration placeholder: send buildPrompt(input) to Gemini and map JSON output.
  throw new Error('Proveedor Gemini preparado, pero no activado en esta version.');
}

async function generateOllamaSummary(input: AteneaSummaryInput): Promise<AteneaSummaryResult> {
  if (!aiConfig.ollamaBaseUrl || !aiConfig.ollamaModel) {
    throw new Error('Configura EXPO_PUBLIC_OLLAMA_BASE_URL y EXPO_PUBLIC_OLLAMA_MODEL.');
  }

  // Integration placeholder: send buildPrompt(input) to a local Ollama-compatible endpoint.
  throw new Error('Proveedor Ollama preparado, pero no activado en esta version.');
}

async function generateDeepSeekSummary(input: AteneaSummaryInput): Promise<AteneaSummaryResult> {
  if (!aiConfig.deepSeekApiKey) {
    throw new Error('Configura EXPO_PUBLIC_DEEPSEEK_API_KEY para usar DeepSeek.');
  }

  // Integration placeholder: send buildPrompt(input) to DeepSeek and map JSON output.
  throw new Error('Proveedor DeepSeek preparado, pero no activado en esta version.');
}

export function previewAteneaPrompt(input: AteneaSummaryInput) {
  return buildPrompt(input);
}
