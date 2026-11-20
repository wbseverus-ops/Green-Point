export type WorkspaceTab =
  | 'overview'
  | 'activities'
  | 'employees'
  | 'rewards'
  | 'gas-setup';

export type ActivityStatus = 'active' | 'closed';

export type LogType = 'earn' | 'redeem';

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  role: string;
  email: string;
  availablePoints: number;
  lifetimePoints: number;
  activitiesCount: number;
  joinedDate: string;
}

export interface Activity {
  id: string;
  title: string;
  category: string;
  points: number;
  eventDate: string;
  status: ActivityStatus;
  participantsCount: number;
  description: string;
}

export interface PointLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  activityId: string;
  activityTitle: string;
  pointsDelta: number;
  type: LogType;
  note: string;
  recordedAt: string;
  recordedBy: string;
}

export interface Reward {
  id: string;
  title: string;
  category: string;
  pointsCost: number;
  stock: number;
  redeemedCount: number;
  description: string;
}

export interface AppDataState {
  employees: Employee[];
  activities: Activity[];
  logs: PointLog[];
  rewards: Reward[];
}

export interface GasConnectionConfig {
  webAppUrl: string;
  lastSyncedAt: string | null;
  spreadsheetUrl: string | null;
  syncStatus: 'local' | 'connected' | 'syncing' | 'error';
  lastError: string | null;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}
