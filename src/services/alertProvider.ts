import type { CommunityAlert } from '../types/domain';

export type NewAlert = Omit<CommunityAlert, 'id' | 'createdAt'> & { userId: string };

export interface AlertProvider {
  insert(alert: NewAlert): Promise<string>;
  subscribe(
    groupIds: string[],
    onAlerts: (alerts: CommunityAlert[]) => void,
    onError: (error: Error) => void,
    userId?: string,
  ): () => void;
}
