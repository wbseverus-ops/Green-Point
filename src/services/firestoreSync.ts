import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Activity, AppDataState, Employee, PointLog, Reward } from '../types';
import { INITIAL_APP_DATA } from '../data/initialData';

export const SHARED_ADMIN_EMAIL = 'wbseverus@gmail.com';
export const DEFAULT_ORG_WORKSPACE_ID = 'she-main';

export interface WorkspaceMeta {
  id: string;
  name: string;
  ownerUid: string;
  sharedEmails: string[];
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned.slice(0, 128) || `id-${Date.now()}`;
}

function clampStr(val: string, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function normalizeSharedEmails(emails: string[], requiredEmail?: string | null): string[] {
  const set = new Set<string>();
  if (requiredEmail) set.add(requiredEmail.trim().toLowerCase());
  set.add(SHARED_ADMIN_EMAIL);
  for (const e of emails) {
    const cleaned = e.trim().toLowerCase();
    if (cleaned && cleaned.length <= 160) {
      set.add(cleaned);
    }
    if (set.size >= 20) break;
  }
  return Array.from(set);
}

function toEmployeeDoc(
  emp: Employee,
  ownerUid: string,
  sharedEmails: string[],
  isNew: boolean
) {
  const base: Record<string, unknown> = {
    id: sanitizeId(emp.id),
    ownerUid,
    sharedEmails,
    employeeCode: clampStr(emp.employeeCode, 32) || 'EMP-000',
    fullName: clampStr(emp.fullName, 120) || 'พนักงาน',
    department: clampStr(emp.department, 80) || 'General',
    role: clampStr(emp.role, 100) || 'Staff',
    email: clampStr(emp.email, 160),
    availablePoints: Math.max(0, Number(emp.availablePoints) || 0),
    lifetimePoints: Math.max(0, Number(emp.lifetimePoints) || 0),
    activitiesCount: Math.max(0, Number(emp.activitiesCount) || 0),
    joinedDate: clampStr(emp.joinedDate, 32) || new Date().toISOString().slice(0, 10),
    updatedAt: serverTimestamp(),
  };
  if (isNew) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

function toActivityDoc(
  act: Activity,
  ownerUid: string,
  sharedEmails: string[],
  isNew: boolean
) {
  const base: Record<string, unknown> = {
    id: sanitizeId(act.id),
    ownerUid,
    sharedEmails,
    title: clampStr(act.title, 200) || 'กิจกรรม',
    category: clampStr(act.category, 80) || 'ทั่วไป',
    points: Math.max(1, Number(act.points) || 1),
    eventDate: clampStr(act.eventDate, 32) || new Date().toISOString().slice(0, 10),
    status: act.status === 'closed' ? 'closed' : 'active',
    participantsCount: Math.max(0, Number(act.participantsCount) || 0),
    description: clampStr(act.description, 500),
    updatedAt: serverTimestamp(),
  };
  if (isNew) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

function toPointLogDoc(log: PointLog, ownerUid: string, sharedEmails: string[]) {
  return {
    id: sanitizeId(log.id),
    ownerUid,
    sharedEmails,
    employeeId: sanitizeId(log.employeeId),
    employeeCode: clampStr(log.employeeCode, 32) || 'EMP',
    employeeName: clampStr(log.employeeName, 120) || 'พนักงาน',
    department: clampStr(log.department, 80) || 'General',
    activityId: sanitizeId(log.activityId),
    activityTitle: clampStr(log.activityTitle, 240) || 'กิจกรรม',
    pointsDelta: Number(log.pointsDelta) || 0,
    type: log.type === 'redeem' ? 'redeem' : 'earn',
    note: clampStr(log.note, 500),
    recordedAt: clampStr(log.recordedAt, 64) || new Date().toISOString(),
    recordedBy: clampStr(log.recordedBy, 120) || 'HR Admin',
    createdAt: serverTimestamp(),
  };
}

function toRewardDoc(
  reward: Reward,
  ownerUid: string,
  sharedEmails: string[],
  isNew: boolean
) {
  const base: Record<string, unknown> = {
    id: sanitizeId(reward.id),
    ownerUid,
    sharedEmails,
    title: clampStr(reward.title, 200) || 'ของรางวัล',
    category: clampStr(reward.category, 80) || 'ทั่วไป',
    pointsCost: Math.max(1, Number(reward.pointsCost) || 1),
    stock: Math.max(0, Number(reward.stock) || 0),
    redeemedCount: Math.max(0, Number(reward.redeemedCount) || 0),
    description: clampStr(reward.description, 500),
    updatedAt: serverTimestamp(),
  };
  if (isNew) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export async function resolveOrInitializeWorkspace(
  user: User,
  seedFallback: AppDataState = INITIAL_APP_DATA
): Promise<WorkspaceMeta> {
  const userEmail = (user.email || '').trim().toLowerCase();
  const workspacesCol = collection(db, 'workspaces');

  try {
    // 1. First look for any workspace shared with this user's email
    const q = query(workspacesCol, where('sharedEmails', 'array-contains', userEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const preferred =
        snap.docs.find((d) => d.id === DEFAULT_ORG_WORKSPACE_ID) || snap.docs[0];
      const d = preferred.data();
      return {
        id: preferred.id,
        name: String(d.name || 'PulsePoint HR Workspace'),
        ownerUid: String(d.ownerUid),
        sharedEmails: Array.isArray(d.sharedEmails) ? d.sharedEmails : [userEmail],
      };
    }

    // 2. If user is bootstrapped admin, create or load she-main
    const targetId =
      userEmail === SHARED_ADMIN_EMAIL
        ? DEFAULT_ORG_WORKSPACE_ID
        : sanitizeId(`ws-${user.uid.slice(0, 16)}`);
    const wsRef = doc(db, 'workspaces', targetId);
    const existingSnap = await getDoc(wsRef);

    if (existingSnap.exists()) {
      const d = existingSnap.data();
      return {
        id: existingSnap.id,
        name: String(d.name || 'PulsePoint HR Workspace'),
        ownerUid: String(d.ownerUid),
        sharedEmails: Array.isArray(d.sharedEmails) ? d.sharedEmails : [userEmail],
      };
    }

    const sharedEmails = normalizeSharedEmails([], userEmail);
    const batch = writeBatch(db);
    batch.set(wsRef, {
      name: 'PulsePoint SHE & ENVI Workspace',
      ownerUid: user.uid,
      sharedEmails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const emp of seedFallback.employees) {
      batch.set(
        doc(db, 'workspaces', targetId, 'employees', sanitizeId(emp.id)),
        toEmployeeDoc(emp, user.uid, sharedEmails, true)
      );
    }
    for (const act of seedFallback.activities) {
      batch.set(
        doc(db, 'workspaces', targetId, 'activities', sanitizeId(act.id)),
        toActivityDoc(act, user.uid, sharedEmails, true)
      );
    }
    for (const log of seedFallback.logs) {
      batch.set(
        doc(db, 'workspaces', targetId, 'logs', sanitizeId(log.id)),
        toPointLogDoc(log, user.uid, sharedEmails)
      );
    }
    for (const rew of seedFallback.rewards) {
      batch.set(
        doc(db, 'workspaces', targetId, 'rewards', sanitizeId(rew.id)),
        toRewardDoc(rew, user.uid, sharedEmails, true)
      );
    }

    await batch.commit();

    return {
      id: targetId,
      name: 'PulsePoint SHE & ENVI Workspace',
      ownerUid: user.uid,
      sharedEmails,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workspaces');
  }
}

export function subscribeWorkspaceData(
  workspaceId: string,
  userEmail: string,
  callbacks: {
    onWorkspaceMeta: (meta: WorkspaceMeta) => void;
    onEmployees: (employees: Employee[]) => void;
    onActivities: (activities: Activity[]) => void;
    onLogs: (logs: PointLog[]) => void;
    onRewards: (rewards: Reward[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const emailLower = userEmail.trim().toLowerCase();

  const unsubWs = onSnapshot(
    doc(db, 'workspaces', workspaceId),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        callbacks.onWorkspaceMeta({
          id: snap.id,
          name: String(d.name || 'PulsePoint Workspace'),
          ownerUid: String(d.ownerUid),
          sharedEmails: Array.isArray(d.sharedEmails) ? d.sharedEmails : [],
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `workspaces/${workspaceId}`);
      } catch (e) {
        callbacks.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const empPath = `workspaces/${workspaceId}/employees`;
  const unsubEmp = onSnapshot(
    query(collection(db, empPath), where('sharedEmails', 'array-contains', emailLower)),
    (snap) => {
      const items: Employee[] = snap.docs.map((d) => {
        const v = d.data();
        return {
          id: String(v.id || d.id),
          employeeCode: String(v.employeeCode || ''),
          fullName: String(v.fullName || ''),
          department: String(v.department || ''),
          role: String(v.role || ''),
          email: String(v.email || ''),
          availablePoints: Number(v.availablePoints) || 0,
          lifetimePoints: Number(v.lifetimePoints) || 0,
          activitiesCount: Number(v.activitiesCount) || 0,
          joinedDate: String(v.joinedDate || ''),
        };
      });
      callbacks.onEmployees(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, empPath);
      } catch (e) {
        callbacks.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const actPath = `workspaces/${workspaceId}/activities`;
  const unsubAct = onSnapshot(
    query(collection(db, actPath), where('sharedEmails', 'array-contains', emailLower)),
    (snap) => {
      const items: Activity[] = snap.docs.map((d) => {
        const v = d.data();
        return {
          id: String(v.id || d.id),
          title: String(v.title || ''),
          category: String(v.category || ''),
          points: Number(v.points) || 0,
          eventDate: String(v.eventDate || ''),
          status: v.status === 'closed' ? 'closed' : 'active',
          participantsCount: Number(v.participantsCount) || 0,
          description: String(v.description || ''),
        };
      });
      callbacks.onActivities(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, actPath);
      } catch (e) {
        callbacks.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const logPath = `workspaces/${workspaceId}/logs`;
  const unsubLogs = onSnapshot(
    query(collection(db, logPath), where('sharedEmails', 'array-contains', emailLower)),
    (snap) => {
      const items: PointLog[] = snap.docs
        .map((d) => {
          const v = d.data();
          return {
            id: String(v.id || d.id),
            employeeId: String(v.employeeId || ''),
            employeeCode: String(v.employeeCode || ''),
            employeeName: String(v.employeeName || ''),
            department: String(v.department || ''),
            activityId: String(v.activityId || ''),
            activityTitle: String(v.activityTitle || ''),
            pointsDelta: Number(v.pointsDelta) || 0,
            type: (v.type === 'redeem' ? 'redeem' : 'earn') as PointLog['type'],
            note: String(v.note || ''),
            recordedAt: String(v.recordedAt || ''),
            recordedBy: String(v.recordedBy || ''),
          };
        })
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      callbacks.onLogs(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, logPath);
      } catch (e) {
        callbacks.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const rewPath = `workspaces/${workspaceId}/rewards`;
  const unsubRew = onSnapshot(
    query(collection(db, rewPath), where('sharedEmails', 'array-contains', emailLower)),
    (snap) => {
      const items: Reward[] = snap.docs.map((d) => {
        const v = d.data();
        return {
          id: String(v.id || d.id),
          title: String(v.title || ''),
          category: String(v.category || ''),
          pointsCost: Number(v.pointsCost) || 0,
          stock: Number(v.stock) || 0,
          redeemedCount: Number(v.redeemedCount) || 0,
          description: String(v.description || ''),
        };
      });
      callbacks.onRewards(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, rewPath);
      } catch (e) {
        callbacks.onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  return () => {
    unsubWs();
    unsubEmp();
    unsubAct();
    unsubLogs();
    unsubRew();
  };
}

export async function fsLogPoints(
  meta: WorkspaceMeta,
  newLogs: PointLog[],
  employeesToUpdate: Employee[],
  matchedActivity?: Activity
): Promise<void> {
  const path = `workspaces/${meta.id}/logs`;
  try {
    const batch = writeBatch(db);
    for (const log of newLogs) {
      batch.set(
        doc(db, 'workspaces', meta.id, 'logs', sanitizeId(log.id)),
        toPointLogDoc(log, meta.ownerUid, meta.sharedEmails)
      );
    }
    for (const emp of employeesToUpdate) {
      batch.update(
        doc(db, 'workspaces', meta.id, 'employees', sanitizeId(emp.id)),
        {
          availablePoints: Math.max(0, emp.availablePoints),
          lifetimePoints: Math.max(0, emp.lifetimePoints),
          activitiesCount: Math.max(0, emp.activitiesCount),
          updatedAt: serverTimestamp(),
        }
      );
    }
    if (matchedActivity) {
      batch.update(
        doc(db, 'workspaces', meta.id, 'activities', sanitizeId(matchedActivity.id)),
        {
          participantsCount: Math.max(
            0,
            matchedActivity.participantsCount + newLogs.length
          ),
          updatedAt: serverTimestamp(),
        }
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpsertEmployee(
  meta: WorkspaceMeta,
  emp: Employee,
  isUpdate: boolean
): Promise<void> {
  const empId = sanitizeId(emp.id);
  const path = `workspaces/${meta.id}/employees/${empId}`;
  try {
    const batch = writeBatch(db);
    const ref = doc(db, 'workspaces', meta.id, 'employees', empId);
    if (isUpdate) {
      batch.update(ref, toEmployeeDoc(emp, meta.ownerUid, meta.sharedEmails, false));
    } else {
      batch.set(ref, toEmployeeDoc(emp, meta.ownerUid, meta.sharedEmails, true));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function fsDeleteEmployee(
  meta: WorkspaceMeta,
  employeeId: string
): Promise<void> {
  const empId = sanitizeId(employeeId);
  const path = `workspaces/${meta.id}/employees/${empId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'workspaces', meta.id, 'employees', empId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsUpsertActivity(
  meta: WorkspaceMeta,
  act: Activity,
  isUpdate: boolean
): Promise<void> {
  const actId = sanitizeId(act.id);
  const path = `workspaces/${meta.id}/activities/${actId}`;
  try {
    const batch = writeBatch(db);
    const ref = doc(db, 'workspaces', meta.id, 'activities', actId);
    if (isUpdate) {
      batch.update(ref, toActivityDoc(act, meta.ownerUid, meta.sharedEmails, false));
    } else {
      batch.set(ref, toActivityDoc(act, meta.ownerUid, meta.sharedEmails, true));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function fsAddReward(
  meta: WorkspaceMeta,
  reward: Reward
): Promise<void> {
  const rewId = sanitizeId(reward.id);
  const path = `workspaces/${meta.id}/rewards/${rewId}`;
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'workspaces', meta.id, 'rewards', rewId),
      toRewardDoc(reward, meta.ownerUid, meta.sharedEmails, true)
    );
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsRedeemReward(
  meta: WorkspaceMeta,
  employee: Employee,
  pointsCost: number,
  logEntry: PointLog,
  reward?: Reward,
  quantity = 1
): Promise<void> {
  const path = `workspaces/${meta.id}/logs/${sanitizeId(logEntry.id)}`;
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'workspaces', meta.id, 'logs', sanitizeId(logEntry.id)),
      toPointLogDoc(logEntry, meta.ownerUid, meta.sharedEmails)
    );
    batch.update(
      doc(db, 'workspaces', meta.id, 'employees', sanitizeId(employee.id)),
      {
        availablePoints: Math.max(0, employee.availablePoints - pointsCost),
        updatedAt: serverTimestamp(),
      }
    );
    if (reward) {
      batch.update(
        doc(db, 'workspaces', meta.id, 'rewards', sanitizeId(reward.id)),
        {
          stock: Math.max(0, reward.stock - quantity),
          redeemedCount: reward.redeemedCount + quantity,
          updatedAt: serverTimestamp(),
        }
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsUpdateSharedEmails(
  meta: WorkspaceMeta,
  nextEmails: string[],
  currentData: AppDataState
): Promise<string[]> {
  const normalized = normalizeSharedEmails(nextEmails);
  const path = `workspaces/${meta.id}`;
  try {
    const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [
      {
        ref: doc(db, 'workspaces', meta.id),
        data: { sharedEmails: normalized, updatedAt: serverTimestamp() },
      },
      ...currentData.employees.map((emp) => ({
        ref: doc(db, 'workspaces', meta.id, 'employees', sanitizeId(emp.id)),
        data: { sharedEmails: normalized, updatedAt: serverTimestamp() },
      })),
      ...currentData.activities.map((act) => ({
        ref: doc(db, 'workspaces', meta.id, 'activities', sanitizeId(act.id)),
        data: { sharedEmails: normalized, updatedAt: serverTimestamp() },
      })),
      ...currentData.logs.map((log) => ({
        ref: doc(db, 'workspaces', meta.id, 'logs', sanitizeId(log.id)),
        data: { sharedEmails: normalized },
      })),
      ...currentData.rewards.map((rew) => ({
        ref: doc(db, 'workspaces', meta.id, 'rewards', sanitizeId(rew.id)),
        data: { sharedEmails: normalized, updatedAt: serverTimestamp() },
      })),
    ];

    const CHUNK_SIZE = 400;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + CHUNK_SIZE)) {
        batch.update(op.ref, op.data);
      }
      await batch.commit();
    }
    return normalized;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
