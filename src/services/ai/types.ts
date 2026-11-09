import { AlertCategory } from '../../types/domain';

export type AIAssistantProviderName = 'deepseek' | 'ollama' | 'mock';

export type AIAssistantIntent =
  | 'create_alert'
  | 'open_groups'
  | 'show_map'
  | 'call_emergency'
  | 'show_summary'
  | 'unknown';

export type EmergencyGroupId =
  | 'default-police'
  | 'default-firefighters'
  | 'default-ambulance';

export type ParsedAlertCommand = {
  intent: AIAssistantIntent;
  category?: AlertCategory;
  title?: string;
  description?: string;
  emergencyGroupId?: EmergencyGroupId;
  confidence: number;
};

export type AICommandOrigin = 'text' | 'voice' | 'quick_action';

export type AICommandStatus = 'detectado' | 'ejecutado' | 'fallido';

export type AICommandHistoryEntry = {
  id: string;
  originalText: string;
  intent: AIAssistantIntent;
  category?: AlertCategory;
  title?: string;
  description?: string;
  executedAction: string;
  origin: AICommandOrigin;
  createdAt: string;
  status: AICommandStatus;
};

export type AIMessageContext = {
  sector?: string;
  userId?: string;
  recentAlerts?: unknown[];
  recentMessages?: unknown[];
};

export type AIMessageResponse = {
  text: string;
  parsedCommand?: ParsedAlertCommand;
  providerLabel?: string;
  providerUsed?: AIAssistantProviderName;
  fallbackUsed?: boolean;
};

export type AIAssistantProvider = {
  provider: AIAssistantProviderName;
  sendMessage: (prompt: string, context?: AIMessageContext) => Promise<AIMessageResponse>;
  parseAlertCommand: (text: string) => Promise<ParsedAlertCommand>;
};
