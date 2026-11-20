import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  Activity,
  AppDataState,
  ConfirmDialogState,
  Employee,
  GasConnectionConfig,
  PointLog,
  Reward,
  WorkspaceTab,
} from './types';
import {
  callGasAction,
  fetchGasSnapshot,
  loadGasMeta,
  loadLocalData,
  loadSavedGasUrl,
  saveGasMeta,
  saveGasUrl,
  saveLocalData,
} from './services/gasClient';
import {
  fsAddReward,
  fsDeleteEmployee,
  fsLogPoints,
  fsRedeemReward,
  fsUpdateSharedEmails,
  fsUpsertActivity,
  fsUpsertEmployee,
  resolveOrInitializeWorkspace,
  subscribeWorkspaceData,
  WorkspaceMeta,
} from './services/firestoreSync';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/OverviewView';
import { ActivitiesView } from './components/ActivitiesView';
import { EmployeesView } from './components/EmployeesView';
import { RewardsView } from './components/RewardsView';
import { GasSetupView } from './components/GasSetupView';
import {
  ActivityModal,
  ConfirmModal,
  DeductPointsModal,
  EmployeeDrawer,
  EmployeeModal,
  LogPointsModal,
  RewardModal,
} from './components/Modals';

const EMPTY_CONFIRM: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'ยืนยัน',
  variant: 'primary',
  onConfirm: () => {},
};

export default function App() {
  const [data, setData] = useState<AppDataState>(() => loadLocalData());
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceMeta, setWorkspaceMeta] = useState<WorkspaceMeta | null>(null);

  const [gasConfig, setGasConfig] = useState<GasConnectionConfig>(() => {
    const savedUrl = loadSavedGasUrl();
    const meta = loadGasMeta();
    return {
      webAppUrl: savedUrl,
      lastSyncedAt: meta.lastSyncedAt,
      spreadsheetUrl: meta.spreadsheetUrl,
      syncStatus: savedUrl ? 'connected' : 'local',
      lastError: null,
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [logModalState, setLogModalState] = useState<{
    isOpen: boolean;
    employeeId?: string;
    activityId?: string;
  }>({ isOpen: false });

  const [employeeModalState, setEmployeeModalState] = useState<{
    isOpen: boolean;
    editing: Employee | null;
  }>({ isOpen: false, editing: null });

  const [activityModalState, setActivityModalState] = useState<{
    isOpen: boolean;
    editing: Activity | null;
  }>({ isOpen: false, editing: null });

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [deductModalState, setDeductModalState] = useState<{
    isOpen: boolean;
    employeeId?: string;
    rewardId?: string;
  }>({ isOpen: false });
  const [inspectedEmployeeId, setInspectedEmployeeId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(EMPTY_CONFIRM);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    saveLocalData(data);
  }, [data]);

  // Listen to Firebase Auth state & subscribe to Cloud Firestore workspace
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        setWorkspaceMeta(null);
        return;
      }

      try {
        const meta = await resolveOrInitializeWorkspace(user, data);
        setWorkspaceMeta(meta);
        const userEmail = (user.email || '').trim().toLowerCase();
        unsubFirestore = subscribeWorkspaceData(meta.id, userEmail, {
          onWorkspaceMeta: (nextMeta) => setWorkspaceMeta(nextMeta),
          onEmployees: (employees) =>
            setData((prev) => ({ ...prev, employees })),
          onActivities: (activities) =>
            setData((prev) => ({ ...prev, activities })),
          onLogs: (logs) => setData((prev) => ({ ...prev, logs })),
          onRewards: (rewards) => setData((prev) => ({ ...prev, rewards })),
          onError: (err) => {
            showToast('error', `ซิงค์ข้อมูลออนไลน์ขัดข้อง: ${err.message}`);
          },
        });
      } catch (err) {
        showToast(
          'error',
          err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อฐานข้อมูลออนไลน์ได้'
        );
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('success', 'เข้าสู่ระบบออนไลน์สำเร็จ กำลังซิงค์ข้อมูลข้ามเครื่อง...');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setWorkspaceMeta(null);
      showToast('success', 'ออกจากระบบออนไลน์แล้ว');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'ออกจากระบบไม่สำเร็จ');
    }
  };

  const handleUpdateSharedEmails = async (nextEmails: string[]) => {
    if (!workspaceMeta) return;
    try {
      const updated = await fsUpdateSharedEmails(workspaceMeta, nextEmails, data);
      setWorkspaceMeta((prev) => (prev ? { ...prev, sharedEmails: updated } : prev));
      showToast('success', 'อัปเดตรายชื่ออีเมลทีมงานออนไลน์เรียบร้อย');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'อัปเดตสิทธิ์ทีมงานไม่สำเร็จ'
      );
    }
  };

  const applyGasSnapshot = useCallback(
    (res: {
      employees?: Employee[];
      activities?: Activity[];
      logs?: PointLog[];
      rewards?: Reward[];
      spreadsheetUrl?: string;
    }) => {
      if (!currentUser && res.employees && res.activities) {
        setData({
          employees: res.employees,
          activities: res.activities,
          logs: res.logs || [],
          rewards: res.rewards || [],
        });
      }
      const nowIso = new Date().toISOString();
      setGasConfig((prev) => {
        const nextUrl = res.spreadsheetUrl || prev.spreadsheetUrl;
        saveGasMeta({ lastSyncedAt: nowIso, spreadsheetUrl: nextUrl });
        return {
          ...prev,
          syncStatus: 'connected',
          lastSyncedAt: nowIso,
          spreadsheetUrl: nextUrl,
          lastError: null,
        };
      });
    },
    [currentUser]
  );

  const handleSyncFromSheet = useCallback(async () => {
    if (!gasConfig.webAppUrl) return;
    setIsSyncing(true);
    try {
      const res = await fetchGasSnapshot(gasConfig.webAppUrl);
      applyGasSnapshot(res);
      showToast('success', 'ซิงค์ข้อมูลจาก Google Sheet เรียบร้อยแล้ว');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถซิงค์ข้อมูลได้';
      setGasConfig((prev) => ({ ...prev, syncStatus: 'error', lastError: msg }));
      showToast('error', msg);
    } finally {
      setIsSyncing(false);
    }
  }, [gasConfig.webAppUrl, applyGasSnapshot, showToast]);

  useEffect(() => {
    if (gasConfig.webAppUrl && !currentUser) {
      handleSyncFromSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndTestUrl = async (url: string) => {
    const cleaned = url.trim();
    if (!cleaned) return;
    setIsSyncing(true);
    try {
      const pingRes = await callGasAction(cleaned, 'ping');
      saveGasUrl(cleaned);
      const snapshotRes = await fetchGasSnapshot(cleaned);
      setGasConfig({
        webAppUrl: cleaned,
        lastSyncedAt: new Date().toISOString(),
        spreadsheetUrl: pingRes.spreadsheetUrl || snapshotRes.spreadsheetUrl || null,
        syncStatus: 'connected',
        lastError: null,
      });
      if (!currentUser && snapshotRes.employees && snapshotRes.employees.length > 0) {
        applyGasSnapshot(snapshotRes);
        showToast('success', 'เชื่อมต่อและโหลดข้อมูลจาก Google Sheet สำเร็จ');
      } else {
        showToast('success', 'เชื่อมต่อ Google Apps Script สำเร็จ');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เชื่อมต่อไม่สำเร็จ';
      setGasConfig((prev) => ({ ...prev, syncStatus: 'error', lastError: msg }));
      showToast('error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGas = () => {
    saveGasUrl('');
    saveGasMeta({ lastSyncedAt: null, spreadsheetUrl: null });
    setGasConfig({
      webAppUrl: '',
      lastSyncedAt: null,
      spreadsheetUrl: null,
      syncStatus: 'local',
      lastError: null,
    });
    showToast('success', 'ตัดการเชื่อมต่อ Google Sheet แล้ว');
  };

  const handleRequestPushSeedData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการส่งข้อมูลขึ้น Google Sheet',
      message:
        'การดำเนินการนี้จะเขียนข้อมูลพนักงาน กิจกรรม ประวัติคะแนน และของรางวัลปัจจุบันทั้งหมดลงใน Google Sheet ที่เชื่อมต่ออยู่ คุณต้องการดำเนินการต่อหรือไม่?',
      confirmLabel: 'ส่งข้อมูลขึ้น Sheet',
      variant: 'primary',
      onConfirm: async () => {
        if (!gasConfig.webAppUrl) return;
        setIsSubmitting(true);
        try {
          const res = await callGasAction(gasConfig.webAppUrl, 'pushSeedData', data);
          applyGasSnapshot(res);
          showToast('success', 'อัปโหลดข้อมูลลง Google Sheet สำเร็จ');
        } catch (err) {
          showToast(
            'error',
            err instanceof Error ? err.message : 'ไม่สามารถส่งข้อมูลขึ้น Sheet ได้'
          );
        } finally {
          setIsSubmitting(false);
          setConfirmDialog(EMPTY_CONFIRM);
        }
      },
    });
  };

  const handleLogPointsSubmit = async (payload: {
    employeeIds: string[];
    activityId?: string;
    activityTitle: string;
    points: number;
    note: string;
  }) => {
    const matchedActivity = payload.activityId
      ? data.activities.find((a) => a.id === payload.activityId)
      : data.activities.find(
          (a) => a.title.trim().toLowerCase() === payload.activityTitle.trim().toLowerCase()
        );
    const resolvedActivityId = matchedActivity?.id ?? `custom-${Date.now()}`;
    const resolvedActivityTitle = matchedActivity?.title ?? payload.activityTitle;

    const nowIso = new Date().toISOString();
    const newLogs: PointLog[] = payload.employeeIds
      .map((empId, idx): PointLog | null => {
        const emp = data.employees.find((e) => e.id === empId);
        if (!emp) return null;
        return {
          id: `log-${Date.now()}-${idx}`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          department: emp.department,
          activityId: resolvedActivityId,
          activityTitle: resolvedActivityTitle,
          pointsDelta: payload.points,
          type: 'earn',
          note: payload.note,
          recordedAt: nowIso,
          recordedBy: currentUser?.email || 'HR Admin',
        };
      })
      .filter((x): x is PointLog => x !== null);

    setIsSubmitting(true);
    try {
      if (currentUser && workspaceMeta) {
        const updatedEmployees = data.employees
          .filter((emp) => payload.employeeIds.includes(emp.id))
          .map((emp) => ({
            ...emp,
            availablePoints: emp.availablePoints + payload.points,
            lifetimePoints: emp.lifetimePoints + payload.points,
            activitiesCount: emp.activitiesCount + 1,
          }));
        await fsLogPoints(workspaceMeta, newLogs, updatedEmployees, matchedActivity);
      } else {
        setData((prev) => ({
          ...prev,
          employees: prev.employees.map((emp) => {
            if (!payload.employeeIds.includes(emp.id)) return emp;
            return {
              ...emp,
              availablePoints: emp.availablePoints + payload.points,
              lifetimePoints: emp.lifetimePoints + payload.points,
              activitiesCount: emp.activitiesCount + 1,
            };
          }),
          activities: matchedActivity
            ? prev.activities.map((act) =>
                act.id === matchedActivity.id
                  ? { ...act, participantsCount: act.participantsCount + newLogs.length }
                  : act
              )
            : prev.activities,
          logs: [...newLogs, ...prev.logs],
        }));
      }

      if (gasConfig.webAppUrl) {
        void callGasAction(gasConfig.webAppUrl, 'logPoints', { logs: newLogs }).catch(() => {});
      }

      setLogModalState({ isOpen: false });
      showToast('success', `บันทึกคะแนนให้พนักงาน ${newLogs.length} คนเรียบร้อยแล้ว`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'บันทึกคะแนนไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEmployee = async (
    empPayload: Omit<Employee, 'id'> & { id?: string }
  ) => {
    const isUpdate = Boolean(empPayload.id);
    const fullEmployee: Employee = {
      ...empPayload,
      id: empPayload.id || `emp-${Date.now()}`,
    };

    setIsSubmitting(true);
    try {
      if (currentUser && workspaceMeta) {
        await fsUpsertEmployee(workspaceMeta, fullEmployee, isUpdate);
      } else {
        setData((prev) => ({
          ...prev,
          employees: isUpdate
            ? prev.employees.map((e) => (e.id === fullEmployee.id ? fullEmployee : e))
            : [...prev.employees, fullEmployee],
        }));
      }

      if (gasConfig.webAppUrl) {
        void callGasAction(
          gasConfig.webAppUrl,
          isUpdate ? 'updateEmployee' : 'addEmployee',
          fullEmployee
        ).catch(() => {});
      }

      setEmployeeModalState({ isOpen: false, editing: null });
      showToast('success', isUpdate ? 'อัปเดตข้อมูลพนักงานแล้ว' : 'เพิ่มพนักงานใหม่เรียบร้อย');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'บันทึกข้อมูลพนักงานไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: `ลบข้อมูลพนักงาน "${employee.fullName}"`,
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานรหัส ${employee.employeeCode} (${employee.fullName}) ออกจากระบบ? ข้อมูลในทะเบียนพนักงานจะถูกลบถาวร`,
      confirmLabel: 'ยืนยันการลบ',
      variant: 'danger',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          if (currentUser && workspaceMeta) {
            await fsDeleteEmployee(workspaceMeta, employee.id);
          } else {
            setData((prev) => ({
              ...prev,
              employees: prev.employees.filter((e) => e.id !== employee.id),
            }));
          }

          if (gasConfig.webAppUrl) {
            void callGasAction(gasConfig.webAppUrl, 'deleteEmployee', {
              id: employee.id,
            }).catch(() => {});
          }

          showToast('success', `ลบพนักงาน ${employee.fullName} เรียบร้อยแล้ว`);
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'ลบพนักงานไม่สำเร็จ');
        } finally {
          setIsSubmitting(false);
          setConfirmDialog(EMPTY_CONFIRM);
        }
      },
    });
  };

  const handleSaveActivity = async (
    actPayload: Omit<Activity, 'id'> & { id?: string }
  ) => {
    const isUpdate = Boolean(actPayload.id);
    const fullActivity: Activity = {
      ...actPayload,
      id: actPayload.id || `act-${Date.now()}`,
    };

    setIsSubmitting(true);
    try {
      if (currentUser && workspaceMeta) {
        await fsUpsertActivity(workspaceMeta, fullActivity, isUpdate);
      } else {
        setData((prev) => ({
          ...prev,
          activities: isUpdate
            ? prev.activities.map((a) => (a.id === fullActivity.id ? fullActivity : a))
            : [fullActivity, ...prev.activities],
        }));
      }

      if (gasConfig.webAppUrl) {
        void callGasAction(
          gasConfig.webAppUrl,
          isUpdate ? 'updateActivity' : 'addActivity',
          fullActivity
        ).catch(() => {});
      }

      setActivityModalState({ isOpen: false, editing: null });
      showToast('success', isUpdate ? 'อัปเดตกิจกรรมแล้ว' : 'สร้างกิจกรรมใหม่เรียบร้อย');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'บันทึกกิจกรรมไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivityStatus = async (activity: Activity) => {
    const updated: Activity = {
      ...activity,
      status: activity.status === 'active' ? 'closed' : 'active',
    };
    try {
      if (currentUser && workspaceMeta) {
        await fsUpsertActivity(workspaceMeta, updated, true);
      } else {
        setData((prev) => ({
          ...prev,
          activities: prev.activities.map((a) => (a.id === updated.id ? updated : a)),
        }));
      }

      if (gasConfig.webAppUrl) {
        void callGasAction(gasConfig.webAppUrl, 'updateActivity', updated).catch(() => {});
      }

      showToast(
        'success',
        updated.status === 'active' ? 'เปิดรับลงทะเบียนกิจกรรมแล้ว' : 'ปิดรับกิจกรรมแล้ว'
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const handleAddReward = async (rewardPayload: Omit<Reward, 'id' | 'redeemedCount'>) => {
    const newReward: Reward = {
      ...rewardPayload,
      id: `rew-${Date.now()}`,
      redeemedCount: 0,
    };
    setIsSubmitting(true);
    try {
      if (currentUser && workspaceMeta) {
        await fsAddReward(workspaceMeta, newReward);
      } else {
        setData((prev) => ({
          ...prev,
          rewards: [...prev.rewards, newReward],
        }));
      }

      if (gasConfig.webAppUrl) {
        void callGasAction(gasConfig.webAppUrl, 'addReward', newReward).catch(() => {});
      }

      setIsRewardModalOpen(false);
      showToast('success', 'เพิ่มของรางวัลใหม่เรียบร้อย');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'เพิ่มของรางวัลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDeductPoints = (payload: {
    employee: Employee;
    reward?: Reward;
    rewardTitle: string;
    quantity: number;
    pointsCost: number;
    note: string;
  }) => {
    const { employee, reward, rewardTitle, quantity, pointsCost, note } = payload;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการตัดคะแนนรับของรางวัล',
      message: `ยืนยันตัดคะแนนของ ${employee.fullName} (${employee.employeeCode}) จำนวน ${pointsCost.toLocaleString()} คะแนน สำหรับ "${rewardTitle}" (คะแนนคงเหลือหลังตัด ${(employee.availablePoints - pointsCost).toLocaleString()} คะแนน)?`,
      confirmLabel: 'ยืนยันตัดคะแนน',
      variant: 'primary',
      onConfirm: async () => {
        const logEntry: PointLog = {
          id: `log-${Date.now()}`,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          department: employee.department,
          activityId: reward?.id ?? 'custom',
          activityTitle: `รับรางวัล: ${rewardTitle}`,
          pointsDelta: -pointsCost,
          type: 'redeem',
          note,
          recordedAt: new Date().toISOString(),
          recordedBy: currentUser?.email || 'HR Admin',
        };

        setIsSubmitting(true);
        try {
          if (currentUser && workspaceMeta) {
            await fsRedeemReward(
              workspaceMeta,
              employee,
              pointsCost,
              logEntry,
              reward,
              quantity
            );
          } else {
            setData((prev) => ({
              ...prev,
              employees: prev.employees.map((e) =>
                e.id === employee.id
                  ? { ...e, availablePoints: e.availablePoints - pointsCost }
                  : e
              ),
              rewards: reward
                ? prev.rewards.map((r) =>
                    r.id === reward.id
                      ? {
                          ...r,
                          stock: Math.max(0, r.stock - quantity),
                          redeemedCount: r.redeemedCount + quantity,
                        }
                      : r
                  )
                : prev.rewards,
              logs: [logEntry, ...prev.logs],
            }));
          }

          if (gasConfig.webAppUrl) {
            void callGasAction(gasConfig.webAppUrl, 'redeemReward', {
              employeeId: employee.id,
              rewardId: reward?.id ?? 'custom',
              quantity,
              logEntry,
            }).catch(() => {});
          }

          setDeductModalState({ isOpen: false });
          showToast(
            'success',
            `ตัดคะแนน ${employee.fullName} (-${pointsCost.toLocaleString()} คะแนน) เรียบร้อยแล้ว`
          );
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'ตัดคะแนนไม่สำเร็จ');
        } finally {
          setIsSubmitting(false);
          setConfirmDialog(EMPTY_CONFIRM);
        }
      },
    });
  };

  const nextEmployeeCode = useMemo(() => {
    const nums = data.employees
      .map((e) => Number(e.employeeCode.replace(/\D+/g, '')))
      .filter((n) => !Number.isNaN(n));
    const maxNum = nums.length ? Math.max(...nums) : 0;
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  }, [data.employees]);

  const inspectedEmployee = useMemo(
    () => data.employees.find((e) => e.id === inspectedEmployeeId) || null,
    [data.employees, inspectedEmployeeId]
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        gasConfig={gasConfig}
        currentUser={currentUser}
        authReady={authReady}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          gasConfig={gasConfig}
          isSyncing={isSyncing}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenLogPoints={() => setLogModalState({ isOpen: true })}
          onSyncNow={handleSyncFromSheet}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {authReady && !currentUser && (
            <div className="mb-6 px-5 py-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  ต้องการใช้งานออนไลน์พร้อมกันหลายเครื่อง?
                </span>{' '}
                เข้าสู่ระบบด้วย Google เพื่อซิงค์คะแนนพนักงานและประวัติกิจกรรมข้ามเครื่องแบบ Real-time
              </div>
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {toast && (
            <div
              role="status"
              className={`mb-5 px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-between ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{toast.text}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs underline ml-4"
              >
                ปิด
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewView
              data={data}
              onSelectEmployee={(emp) => setInspectedEmployeeId(emp.id)}
              onOpenLogPoints={(employeeId) =>
                setLogModalState({ isOpen: true, employeeId })
              }
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesView
              activities={data.activities}
              onOpenAddActivity={() =>
                setActivityModalState({ isOpen: true, editing: null })
              }
              onEditActivity={(act) =>
                setActivityModalState({ isOpen: true, editing: act })
              }
              onToggleStatus={handleToggleActivityStatus}
              onLogForActivity={(activityId) =>
                setLogModalState({ isOpen: true, activityId })
              }
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={data.employees}
              onOpenAddEmployee={() =>
                setEmployeeModalState({ isOpen: true, editing: null })
              }
              onEditEmployee={(emp) =>
                setEmployeeModalState({ isOpen: true, editing: emp })
              }
              onDeleteEmployee={handleDeleteEmployee}
              onInspectEmployee={(emp) => setInspectedEmployeeId(emp.id)}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsView
              rewards={data.rewards}
              employees={data.employees}
              logs={data.logs}
              onOpenAddReward={() => setIsRewardModalOpen(true)}
              onOpenDeductPoints={(employeeId, rewardId) =>
                setDeductModalState({ isOpen: true, employeeId, rewardId })
              }
            />
          )}

          {activeTab === 'gas-setup' && (
            <GasSetupView
              gasConfig={gasConfig}
              isSyncing={isSyncing}
              currentUser={currentUser}
              workspaceMeta={workspaceMeta}
              onSignIn={handleSignIn}
              onUpdateSharedEmails={handleUpdateSharedEmails}
              onSaveAndTestUrl={handleSaveAndTestUrl}
              onSyncFromSheet={handleSyncFromSheet}
              onRequestPushSeedData={handleRequestPushSeedData}
              onDisconnect={handleDisconnectGas}
            />
          )}
        </main>
      </div>

      <LogPointsModal
        isOpen={logModalState.isOpen}
        employees={data.employees}
        activities={data.activities}
        preselectedEmployeeId={logModalState.employeeId}
        preselectedActivityId={logModalState.activityId}
        isSubmitting={isSubmitting}
        onClose={() => setLogModalState({ isOpen: false })}
        onSubmit={handleLogPointsSubmit}
      />

      <EmployeeModal
        isOpen={employeeModalState.isOpen}
        editingEmployee={employeeModalState.editing}
        nextEmployeeCode={nextEmployeeCode}
        isSubmitting={isSubmitting}
        onClose={() => setEmployeeModalState({ isOpen: false, editing: null })}
        onSubmit={handleSaveEmployee}
      />

      <ActivityModal
        isOpen={activityModalState.isOpen}
        editingActivity={activityModalState.editing}
        isSubmitting={isSubmitting}
        onClose={() => setActivityModalState({ isOpen: false, editing: null })}
        onSubmit={handleSaveActivity}
      />

      <RewardModal
        isOpen={isRewardModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsRewardModalOpen(false)}
        onSubmit={handleAddReward}
      />

      <DeductPointsModal
        isOpen={deductModalState.isOpen}
        employees={data.employees}
        rewards={data.rewards}
        preselectedEmployeeId={deductModalState.employeeId}
        preselectedRewardId={deductModalState.rewardId}
        isSubmitting={isSubmitting}
        onClose={() => setDeductModalState({ isOpen: false })}
        onRequestDeduct={handleRequestDeductPoints}
      />

      <ConfirmModal
        dialog={confirmDialog}
        isBusy={isSubmitting}
        onCancel={() => setConfirmDialog(EMPTY_CONFIRM)}
      />

      <EmployeeDrawer
        employee={inspectedEmployee}
        logs={data.logs}
        onClose={() => setInspectedEmployeeId(null)}
        onOpenLogPoints={(employeeId) => {
          setInspectedEmployeeId(null);
          setLogModalState({ isOpen: true, employeeId });
        }}
        onOpenDeductPoints={(employeeId) => {
          setInspectedEmployeeId(null);
          setDeductModalState({ isOpen: true, employeeId });
        }}
      />
    </div>
  );
}
