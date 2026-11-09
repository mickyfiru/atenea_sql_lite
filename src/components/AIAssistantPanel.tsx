import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius } from '../constants/theme';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import {
  AICommandHistoryEntry,
  AICommandOrigin,
  AICommandStatus,
  AIAssistantIntent,
  ParsedAlertCommand,
  getAIAssistantProviderLabel,
  getAIProviderDebugInfo,
  sendMessage,
  testOllamaConnection,
} from '../services/ai/index';
import {
  clearAICommandHistory,
  getAICommandHistory,
  saveAICommandHistory,
  updateAICommandHistoryStatus,
} from '../services/ai/aiHistory';
import { speak } from '../services/voice/tts';
import { getAlertCategoryTone } from '../utils/alerts';
import { PrimaryButton } from './PrimaryButton';

type AIAssistantPanelProps = {
  onCreateAlertDraft?: (
    command: ParsedAlertCommand,
    historyEntryId?: string,
    callbacks?: {
      onCreated: () => Promise<void>;
      onCreateFailed: () => Promise<void>;
    },
  ) => void;
  onIntent?: (
    intent: AIAssistantIntent,
    command?: ParsedAlertCommand,
    historyEntryId?: string,
  ) => Promise<boolean> | boolean;
};

export type AIAssistantPanelHandle = {
  runQuickActionCommand: (prompt: string, spokenResponse?: string) => Promise<void>;
  showLocalSummary: (input: {
    prompt: string;
    response: string;
    status: AICommandStatus;
    executedAction: string;
    spokenResponse: string;
  }) => Promise<void>;
};

export const AIAssistantPanel = forwardRef<AIAssistantPanelHandle, AIAssistantPanelProps>(
function AIAssistantPanel({ onCreateAlertDraft, onIntent }, ref) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [commandPreview, setCommandPreview] = useState<ParsedAlertCommand>();
  const [commandHistoryId, setCommandHistoryId] = useState<string>();
  const [history, setHistory] = useState<AICommandHistoryEntry[]>([]);
  const [providerLabel, setProviderLabel] = useState(getAIAssistantProviderLabel());
  const [fallbackActive, setFallbackActive] = useState(false);
  const [aiStatusVisible, setAiStatusVisible] = useState(false);
  const [ollamaTestMessage, setOllamaTestMessage] = useState('');
  const [ollamaTestOk, setOllamaTestOk] = useState<boolean | undefined>();
  const [testingOllama, setTestingOllama] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void refreshHistory();
  }, []);

  async function refreshHistory() {
    const nextHistory = await getAICommandHistory();
    setHistory(nextHistory);
  }

  const submitPrompt = useCallback(async (
    promptText: string,
    origin: AICommandOrigin,
    spokenResponse?: string,
  ) => {
    const prompt = promptText.trim();

    if (!prompt || loading) {
      return;
    }

    setLoading(true);
    setError('');
    setCommandPreview(undefined);
    setCommandHistoryId(undefined);

    try {
      const nextResponse = await sendMessage(prompt);
      const nextCommand = nextResponse.parsedCommand;
      const historyEntry = buildHistoryEntry({
        prompt,
        command: nextCommand,
        origin,
        status: getCommandStatus(nextCommand),
        executedAction: getInitialExecutedAction(nextCommand),
      });
      let nextHistory = await saveAICommandHistory(historyEntry);

      setResponse(nextResponse.text);
      setFallbackActive(Boolean(nextResponse.fallbackUsed));
      setProviderLabel(nextResponse.providerLabel ?? getAIAssistantProviderLabel());
      setCommandPreview(nextCommand);
      setCommandHistoryId(historyEntry.id);
      setHistory(nextHistory);
      setInput('');
      await speak(spokenResponse ?? getSpokenResponse(nextCommand));

      if (nextCommand?.intent === 'open_groups' || nextCommand?.intent === 'show_map') {
        const executed = await Promise.resolve(onIntent?.(nextCommand.intent, nextCommand, historyEntry.id));
        nextHistory = await updateAICommandHistoryStatus(
          historyEntry.id,
          executed === false ? 'fallido' : 'ejecutado',
          nextCommand.intent === 'open_groups' ? 'navegacion_grupos' : 'navegacion_mapa',
        );
        setHistory(nextHistory);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Atenea no pudo responder.';
      const nextHistory = await saveAICommandHistory(
        buildHistoryEntry({
          prompt,
          origin,
          status: 'fallido',
          executedAction: message,
        }),
      );

      setHistory(nextHistory);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loading, onIntent]);

  useImperativeHandle(ref, () => ({
    runQuickActionCommand: (prompt, spokenResponse) =>
      submitPrompt(prompt, 'quick_action', spokenResponse),
    async showLocalSummary({ prompt, response: nextResponse, status, executedAction, spokenResponse }) {
      const historyEntry = buildHistoryEntry({
        prompt,
        origin: 'quick_action',
        status,
        executedAction,
        command: {
          intent: 'show_summary',
          confidence: status === 'fallido' ? 0.3 : 0.8,
        },
      });
      const nextHistory = await saveAICommandHistory(historyEntry);

      setError('');
      setCommandPreview(undefined);
      setCommandHistoryId(historyEntry.id);
      setHistory(nextHistory);
      setFallbackActive(false);
      setProviderLabel(getAIAssistantProviderLabel());
      setResponse(nextResponse);
      await speak(spokenResponse);
    },
  }), [submitPrompt]);

  const voice = useVoiceCommand({
    onFinalTranscript: async (text) => {
      setInput(text);
      await submitPrompt(text, 'voice');
    },
  });

  async function submit() {
    await submitPrompt(input, 'text');
  }

  async function handleVoicePress() {
    if (voice.listening) {
      await voice.stop();
      return;
    }

    voice.reset();
    await voice.start();
  }

  async function handleClearHistory() {
    await clearAICommandHistory();
    setHistory([]);
  }

  async function handleTestOllama() {
    setTestingOllama(true);
    setOllamaTestMessage('');
    setOllamaTestOk(undefined);

    try {
      const result = await testOllamaConnection();
      setOllamaTestOk(result.ok);
      setOllamaTestMessage(result.message);

      if (!result.ok) {
        setFallbackActive(true);
        setProviderLabel('IA: Ollama no disponible, usando Mock Demo');
      }
    } finally {
      setTestingOllama(false);
    }
  }

  async function handleEmergencyOption(
    command: ParsedAlertCommand,
    emergencyGroupId?: ParsedAlertCommand['emergencyGroupId'],
  ) {
    const executed = await Promise.resolve(
      onIntent?.(
        command.intent,
        {
          ...command,
          emergencyGroupId,
        },
        commandHistoryId,
      ),
    );

    if (!commandHistoryId) {
      return;
    }

    const nextHistory = await updateAICommandHistoryStatus(
      commandHistoryId,
      executed === false ? 'fallido' : 'ejecutado',
      executed === false ? 'grupo_emergencia_no_encontrado' : 'grupo_emergencia_abierto',
    );
    setHistory(nextHistory);
  }

  const canCreateAlert = commandPreview?.intent === 'create_alert' && commandPreview.category;
  const isEmergency = commandPreview?.intent === 'call_emergency';
  const showEmergencyOptions = isEmergency && !commandPreview?.emergencyGroupId;
  const isNavigation = commandPreview?.intent === 'open_groups' || commandPreview?.intent === 'show_map';
  const isUnknown = commandPreview?.intent === 'unknown';
  const tone = commandPreview?.category ? getAlertCategoryTone(commandPreview.category) : undefined;
  const emergency = getEmergencyDisplay(commandPreview);
  const statusText = getVoiceStatusText(voice.listening, voice.processing);
  const visibleError = error || voice.error;
  const debugInfo = getAIProviderDebugInfo(fallbackActive);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>Atenea IA</Text>
        </View>
        <Text style={styles.badge}>{providerLabel}</Text>
      </View>

      <View style={styles.aiStatusSection}>
        <Pressable
          onPress={() => setAiStatusVisible((visible) => !visible)}
          style={styles.aiStatusHeader}
        >
          <Text style={styles.aiStatusTitle}>Estado IA</Text>
          <Ionicons
            name={aiStatusVisible ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={18}
            color={colors.muted}
          />
        </Pressable>

        {aiStatusVisible ? (
          <View style={styles.aiStatusBody}>
            <Text style={styles.aiStatusText}>
              Proveedor configurado: {debugInfo.configuredProvider}
            </Text>
            <Text style={styles.aiStatusText}>
              Proveedor activo: {debugInfo.effectiveProvider}
            </Text>
            <Text numberOfLines={1} style={styles.aiStatusText}>
              URL Ollama: {debugInfo.ollamaBaseUrl || 'no configurada'}
            </Text>
            <Text style={styles.aiStatusText}>Modelo Ollama: {debugInfo.ollamaModel}</Text>
            <Text style={styles.aiStatusText}>
              Estado: {getAIStatusLabel(ollamaTestOk, fallbackActive)}
            </Text>
            <PrimaryButton
              disabled={testingOllama}
              label={testingOllama ? 'Probando...' : 'Probar Ollama'}
              onPress={handleTestOllama}
              style={styles.testOllamaButton}
              variant="light"
            />
            {ollamaTestMessage ? (
              <Text style={[
                styles.aiStatusResult,
                { color: ollamaTestOk ? colors.success : colors.warning },
              ]}
              >
                {ollamaTestMessage}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          editable={!loading && !voice.processing}
          onChangeText={setInput}
          onSubmitEditing={submit}
          placeholder="Ej: Hay un accidente en avenida principal"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          style={styles.input}
          value={input}
        />
        <Pressable
          disabled={loading || voice.processing}
          onPress={handleVoicePress}
          style={[
            styles.voiceButton,
            voice.listening && styles.voiceButtonActive,
            (loading || voice.processing) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons
            name={voice.listening ? 'mic' : 'mic-outline'}
            size={19}
            color={voice.listening ? colors.background : colors.primary}
          />
        </Pressable>
        <Pressable
          disabled={loading || voice.processing || !input.trim()}
          onPress={submit}
          style={[styles.sendButton, (!input.trim() || loading || voice.processing) && styles.sendButtonDisabled]}
        >
          <Ionicons name="send-outline" size={19} color={colors.background} />
        </Pressable>
      </View>

      <Text style={[styles.voiceStatus, voice.listening && styles.voiceStatusActive]}>
        {statusText}
      </Text>

      {voice.transcript ? <Text style={styles.transcript}>Escuche: {voice.transcript}</Text> : null}

      {response ? <Text style={styles.response}>{response}</Text> : null}
      {visibleError ? <Text style={styles.error}>{visibleError}</Text> : null}

      {canCreateAlert && commandPreview ? (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: tone?.backgroundColor }]}>
              <Ionicons name={tone?.icon ?? 'alert-circle-outline'} size={18} color={tone?.color ?? colors.primary} />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>{commandPreview.title}</Text>
              <Text style={styles.previewMeta}>
                {commandPreview.category} · {Math.round(commandPreview.confidence * 100)}%
              </Text>
            </View>
          </View>
          <Text style={styles.previewDescription}>{commandPreview.description}</Text>
          <PrimaryButton
            label="Crear alerta"
            onPress={() => {
              onCreateAlertDraft?.(commandPreview, commandHistoryId, {
                onCreated: async () => {
                  if (!commandHistoryId) {
                    return;
                  }

                  const nextHistory = await updateAICommandHistoryStatus(
                    commandHistoryId,
                    'ejecutado',
                    'alerta_creada',
                  );
                  setHistory(nextHistory);
                },
                onCreateFailed: async () => {
                  if (!commandHistoryId) {
                    return;
                  }

                  const nextHistory = await updateAICommandHistoryStatus(
                    commandHistoryId,
                    'fallido',
                    'error_creando_alerta',
                  );
                  setHistory(nextHistory);
                },
              });
            }}
            style={styles.previewButton}
          />
        </View>
      ) : null}

      {isEmergency && commandPreview ? (
        <View style={styles.intentCard}>
          <View style={styles.intentHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: emergency.backgroundColor }]}>
              <Ionicons name={emergency.icon} size={18} color={emergency.color} />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>{emergency.title}</Text>
              <Text style={styles.previewMeta}>Llamadas reales no activadas</Text>
            </View>
          </View>
          <Text style={styles.previewDescription}>
            {showEmergencyOptions
              ? 'Elige un contacto SOS para abrir su grupo de emergencia.'
              : 'Puedo abrir el grupo de emergencia para coordinar la alerta.'}
          </Text>
          {showEmergencyOptions ? (
            <View style={styles.emergencyOptions}>
              {EMERGENCY_OPTIONS.map((option) => (
                <Pressable
                  key={option.groupId}
                  onPress={() => handleEmergencyOption(commandPreview, option.groupId)}
                  style={styles.emergencyOption}
                >
                  <Ionicons name={option.icon} size={18} color={option.color} />
                  <Text style={styles.emergencyOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <PrimaryButton
              label="Abrir grupo"
              onPress={() => handleEmergencyOption(commandPreview, commandPreview.emergencyGroupId)}
              style={styles.previewButton}
              variant="light"
            />
          )}
        </View>
      ) : null}

      {isNavigation && commandPreview ? (
        <View style={styles.intentCard}>
          <View style={styles.intentHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={commandPreview.intent === 'show_map' ? 'map-outline' : 'people-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>
                {commandPreview.intent === 'show_map' ? 'Mapa de alertas' : 'Grupos comunitarios'}
              </Text>
              <Text style={styles.previewMeta}>Accion ejecutada</Text>
            </View>
          </View>
        </View>
      ) : null}

      {isUnknown ? (
        <View style={styles.unknownCard}>
          <Ionicons name="help-circle-outline" size={20} color={colors.muted} />
          <Text style={styles.unknownText}>
            No entendi el comando. Puedes decir: hay un accidente, llama a bomberos o abre grupos.
          </Text>
        </View>
      ) : null}

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Historial IA</Text>
          {history.length ? (
            <Pressable onPress={handleClearHistory} style={styles.clearHistoryButton}>
              <Text style={styles.clearHistoryText}>Limpiar historial</Text>
            </Pressable>
          ) : null}
        </View>

        {history.length ? (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <Text numberOfLines={2} style={styles.historyText}>
                    {entry.originalText}
                  </Text>
                  <View style={styles.historySide}>
                    <Text style={styles.historyTime}>{formatHistoryTime(entry.createdAt)}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getHistoryStatusTone(entry.status).backgroundColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getHistoryStatusTone(entry.status).color },
                        ]}
                      >
                        {entry.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.historyMeta}>
                  {formatIntent(entry.intent)}
                  {entry.category ? ` / ${entry.category}` : ''} · {formatOrigin(entry.origin)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.historyEmpty}>Tus ultimos comandos apareceran aqui.</Text>
        )}
      </View>
    </View>
  );
});

const EMERGENCY_OPTIONS = [
  {
    label: 'Bomberos',
    groupId: 'default-firefighters' as const,
    icon: 'flame-outline' as const,
    color: colors.danger,
  },
  {
    label: 'Ambulancia',
    groupId: 'default-ambulance' as const,
    icon: 'pulse-outline' as const,
    color: colors.success,
  },
  {
    label: 'Policia',
    groupId: 'default-police' as const,
    icon: 'shield-checkmark-outline' as const,
    color: colors.primary,
  },
];

function buildHistoryEntry({
  prompt,
  command,
  origin,
  status,
  executedAction,
}: {
  prompt: string;
  command?: ParsedAlertCommand;
  origin: AICommandOrigin;
  status: AICommandStatus;
  executedAction?: string;
}): AICommandHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originalText: prompt,
    intent: command?.intent ?? 'unknown',
    category: command?.category,
    title: command?.title,
    description: command?.description,
    executedAction: executedAction ?? getInitialExecutedAction(command),
    origin,
    createdAt: new Date().toISOString(),
    status,
  };
}

function getCommandStatus(command?: ParsedAlertCommand): AICommandStatus {
  if (!command || command.intent === 'unknown') {
    return 'fallido';
  }

  return 'detectado';
}

function getInitialExecutedAction(command?: ParsedAlertCommand) {
  switch (command?.intent) {
    case 'create_alert':
      return 'previsualizacion_alerta';
    case 'call_emergency':
      return 'preparar_contacto_emergencia';
    case 'open_groups':
      return 'preparar_navegacion_grupos';
    case 'show_map':
      return 'preparar_navegacion_mapa';
    case 'show_summary':
      return 'preparar_resumen';
    case 'unknown':
    default:
      return 'sin_accion';
  }
}

function formatIntent(intent: AIAssistantIntent) {
  switch (intent) {
    case 'create_alert':
      return 'crear alerta';
    case 'call_emergency':
      return 'emergencia';
    case 'open_groups':
      return 'grupos';
    case 'show_map':
      return 'mapa';
    case 'show_summary':
      return 'resumen';
    case 'unknown':
      return 'desconocido';
  }
}

function formatOrigin(origin: AICommandOrigin) {
  switch (origin) {
    case 'voice':
      return 'voz';
    case 'quick_action':
      return 'quick action';
    case 'text':
    default:
      return 'texto';
  }
}

function getAIStatusLabel(testOk: boolean | undefined, fallbackActive: boolean) {
  if (testOk) {
    return 'conectado';
  }

  if (fallbackActive) {
    return 'usando mock fallback';
  }

  if (testOk === false) {
    return 'no conectado';
  }

  return 'sin probar';
}

function formatHistoryTime(createdAt: string) {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

function getHistoryStatusTone(status: AICommandStatus) {
  switch (status) {
    case 'ejecutado':
      return {
        color: colors.success,
        backgroundColor: colors.successSoft,
      };
    case 'fallido':
      return {
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };
    case 'detectado':
    default:
      return {
        color: colors.primary,
        backgroundColor: colors.primarySoft,
      };
  }
}

function getVoiceStatusText(listening: boolean, processing: boolean) {
  if (processing) {
    return 'Procesando comando...';
  }

  if (listening) {
    return 'Escuchando...';
  }

  return 'Hablar';
}

function getSpokenResponse(command?: ParsedAlertCommand) {
  switch (command?.intent) {
    case 'create_alert':
      return `Detect\u00e9 una posible alerta de ${command.category?.toLowerCase() ?? 'comunidad'}.`;
    case 'call_emergency':
      return 'Prepar\u00e9 el contacto de emergencia.';
    case 'open_groups':
      return 'Abriendo grupos.';
    case 'show_map':
      return 'Abriendo mapa.';
    case 'show_summary':
      return 'Resumen de tu zona preparado.';
    case 'unknown':
    default:
      return 'No entend\u00ed el comando.';
  }
}

function getEmergencyDisplay(command?: ParsedAlertCommand) {
  switch (command?.emergencyGroupId) {
    case 'default-firefighters':
      return {
        title: 'Bomberos',
        icon: 'flame-outline' as const,
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };
    case 'default-police':
      return {
        title: 'Carabineros',
        icon: 'shield-checkmark-outline' as const,
        color: colors.primary,
        backgroundColor: colors.primarySoft,
      };
    case 'default-ambulance':
      return {
        title: 'Ambulancia',
        icon: 'pulse-outline' as const,
        color: colors.success,
        backgroundColor: colors.successSoft,
      };
    default:
      return {
        title: 'Emergencia',
        icon: 'call-outline' as const,
        color: colors.danger,
        backgroundColor: colors.dangerSoft,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 14,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    maxWidth: '58%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textAlign: 'right',
  },
  aiStatusSection: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aiStatusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  aiStatusTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  aiStatusBody: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 7,
    padding: 12,
  },
  aiStatusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  aiStatusResult: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  testOllamaButton: {
    minHeight: 42,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#DCE5F2',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  voiceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderWidth: 2,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  voiceStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  voiceStatusActive: {
    color: colors.primary,
    fontSize: 13,
  },
  transcript: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  response: {
    color: '#263D5C',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  previewCard: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  intentCard: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  intentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  previewDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  previewButton: {
    minHeight: 44,
  },
  emergencyOptions: {
    gap: 8,
  },
  emergencyOption: {
    alignItems: 'center',
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  emergencyOptionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  unknownCard: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  unknownText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  historySection: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  clearHistoryButton: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearHistoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 5,
    padding: 10,
  },
  historyItemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  historyText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  historyTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  historySide: {
    alignItems: 'flex-end',
    gap: 5,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  historyEmpty: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
