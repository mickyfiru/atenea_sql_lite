import AsyncStorage from '@react-native-async-storage/async-storage';

import { AICommandHistoryEntry, AICommandStatus } from './types';

const AI_COMMAND_HISTORY_KEY = '@atenea/ai-command-history';
const MAX_HISTORY_ITEMS = 10;

function sortNewestFirst(entries: AICommandHistoryEntry[]) {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function sanitizeHistoryEntry(entry: AICommandHistoryEntry): AICommandHistoryEntry {
  return {
    ...entry,
    originalText: entry.originalText.trim(),
    executedAction: entry.executedAction.trim(),
  };
}

export function limitHistoryToLast10(entries: AICommandHistoryEntry[]) {
  return sortNewestFirst(entries).slice(0, MAX_HISTORY_ITEMS);
}

export async function getAICommandHistory() {
  try {
    const rawHistory = await AsyncStorage.getItem(AI_COMMAND_HISTORY_KEY);

    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory) as AICommandHistoryEntry[];

    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return limitHistoryToLast10(parsedHistory);
  } catch (error) {
    console.warn('[ai-history] could not read local command history', error);
    return [];
  }
}

export async function saveAICommandHistory(entry: AICommandHistoryEntry) {
  try {
    const currentHistory = await getAICommandHistory();
    const nextHistory = limitHistoryToLast10([
      sanitizeHistoryEntry(entry),
      ...currentHistory,
    ]);

    await AsyncStorage.setItem(AI_COMMAND_HISTORY_KEY, JSON.stringify(nextHistory));

    return nextHistory;
  } catch (error) {
    console.warn('[ai-history] could not save local command history', error);
    return getAICommandHistory();
  }
}

export async function updateAICommandHistoryStatus(
  id: string,
  status: AICommandStatus,
  actionExecuted?: string,
) {
  try {
    const currentHistory = await getAICommandHistory();
    const nextHistory = limitHistoryToLast10(
      currentHistory.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }

        return {
          ...entry,
          status,
          executedAction: actionExecuted ?? entry.executedAction,
        };
      }),
    );

    await AsyncStorage.setItem(AI_COMMAND_HISTORY_KEY, JSON.stringify(nextHistory));

    return nextHistory;
  } catch (error) {
    console.warn('[ai-history] could not update local command history', error);
    return getAICommandHistory();
  }
}

export async function clearAICommandHistory() {
  try {
    await AsyncStorage.removeItem(AI_COMMAND_HISTORY_KEY);
  } catch (error) {
    console.warn('[ai-history] could not clear local command history', error);
  }
}
