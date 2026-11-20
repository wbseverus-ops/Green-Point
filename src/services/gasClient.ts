import { AppDataState } from '../types';
import { INITIAL_APP_DATA } from '../data/initialData';

const STORAGE_DATA_KEY = 'pulsepoint_hr_state_v2';
const STORAGE_URL_KEY = 'pulsepoint_hr_gas_url_v1';
const STORAGE_META_KEY = 'pulsepoint_hr_gas_meta_v1';

export function loadLocalData(): AppDataState {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (!raw) return INITIAL_APP_DATA;
    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    if (!Array.isArray(parsed.employees) || !Array.isArray(parsed.activities)) {
      return INITIAL_APP_DATA;
    }
    return {
      employees: parsed.employees,
      activities: parsed.activities,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : INITIAL_APP_DATA.rewards,
    };
  } catch {
    return INITIAL_APP_DATA;
  }
}

export function saveLocalData(data: AppDataState): void {
  try {
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedGasUrl(): string {
  try {
    return localStorage.getItem(STORAGE_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGasUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(STORAGE_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(STORAGE_URL_KEY);
    }
  } catch {
    // Ignore
  }
}

export function loadGasMeta(): { lastSyncedAt: string | null; spreadsheetUrl: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return { lastSyncedAt: null, spreadsheetUrl: null };
    return JSON.parse(raw);
  } catch {
    return { lastSyncedAt: null, spreadsheetUrl: null };
  }
}

export function saveGasMeta(meta: { lastSyncedAt: string | null; spreadsheetUrl: string | null }): void {
  try {
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore
  }
}

export interface GasApiResponse {
  ok: boolean;
  error?: string;
  message?: string;
  spreadsheetUrl?: string;
  employees?: AppDataState['employees'];
  activities?: AppDataState['activities'];
  logs?: AppDataState['logs'];
  rewards?: AppDataState['rewards'];
}

export async function callGasAction(
  webAppUrl: string,
  action: string,
  payload?: unknown
): Promise<GasApiResponse> {
  const res = await fetch('/api/gas-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webAppUrl.trim(),
      method: 'POST',
      payload: { action, payload },
    }),
  });

  const data = (await res.json()) as GasApiResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'การเชื่อมต่อ Google Apps Script ล้มเหลว');
  }
  return data;
}

export async function fetchGasSnapshot(webAppUrl: string): Promise<GasApiResponse> {
  const res = await fetch('/api/gas-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webAppUrl.trim(),
      method: 'GET',
    }),
  });

  const data = (await res.json()) as GasApiResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้');
  }
  return data;
}

export function exportLeaderboardCsv(data: AppDataState): void {
  const headers = [
    'Employee Code',
    'Full Name',
    'Department',
    'Role',
    'Email',
    'Activities Joined',
    'Available Points',
    'Lifetime Points',
  ];
  const rows = data.employees.map((e) => [
    e.employeeCode,
    e.fullName,
    e.department,
    e.role,
    e.email,
    String(e.activitiesCount),
    String(e.availablePoints),
    String(e.lifetimePoints),
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `employee-activity-points-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
