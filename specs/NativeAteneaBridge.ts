import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export type SQLiteAlert = {
  id: string;
  groupId: string;
  userId: string | null;
  createdBy: string | null;
  category: string;
  title: string;
  description: string;
  soundType: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  district: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: number;
};

export interface Spec extends TurboModule {
  getDiagnosticMessage(): string;
  insertAlert(alert: SQLiteAlert): Promise<void>;
  listAlerts(groupId: string | null): Promise<SQLiteAlert[]>;
  findAlert(id: string): Promise<SQLiteAlert | null>;
  updateAlert(alert: SQLiteAlert): Promise<boolean>;
  deleteAlert(id: string): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>('NativeAteneaBridge');
