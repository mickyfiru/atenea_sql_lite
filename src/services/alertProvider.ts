import type { CommunityAlert } from '../types/domain';
import type { AlertEdits } from './firestoreAlertPolicy';

export type NewAlert = Omit<CommunityAlert, 'id' | 'createdAt'> & { userId: string };

export interface AlertProvider {
  insert(alert: NewAlert): Promise<string>;
  update(id: string, userId: string, edits: AlertEdits): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  subscribe(
    groupIds: string[],
    onAlerts: (alerts: CommunityAlert[]) => void,
    onError: (error: Error) => void,
    userId?: string,
  ): () => void;
}
