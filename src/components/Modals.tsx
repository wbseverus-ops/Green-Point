import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import {
  Activity,
  ConfirmDialogState,
  Employee,
  PointLog,
  Reward,
} from '../types';
import { ACTIVITY_CATEGORIES, DEPARTMENT_OPTIONS } from '../data/initialData';
import {
  SHE_ACTIVITY_PRESETS,
  SHE_CATEGORY_TABS,
  SheCategoryKey,
} from '../data/sheRules';

type RemediationMode = 'none' | 'immediate' | 'later';

interface LogPointsModalProps {
  isOpen: boolean;
  employees: Employee[];
  activities: Activity[];
  preselectedEmployeeId?: string;
  preselectedActivityId?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    employeeIds: string[];
    activityId?: string;
    activityTitle: string;
    points: number;
    note: string;
  }) => Promise<void>;
}

export const LogPointsModal: React.FC<LogPointsModalProps> = ({
  isOpen,
  employees,
  activities,
  preselectedEmployeeId,
  preselectedActivityId,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SheCategoryKey>('envi_issue');
  const [activityTitle, setActivityTitle] = useState<string>('');
  const [basePoints, setBasePoints] = useState<number>(40);
  const [remediationMode, setRemediationMode] = useState<RemediationMode>('none');
  const [laterBonusPoints, setLaterBonusPoints] = useState<string>('10');
  const [pointsOverride, setPointsOverride] = useState<string>('40');
  const [note, setNote] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const categoryPresets = useMemo(
    () =>
      selectedCategory === 'custom'
        ? []
        : SHE_ACTIVITY_PRESETS.filter((p) => p.categoryKey === selectedCategory),
    [selectedCategory]
  );

  const matchedPreset = useMemo(
    () =>
      SHE_ACTIVITY_PRESETS.find(
        (p) => p.title.trim().toLowerCase() === activityTitle.trim().toLowerCase()
      ),
    [activityTitle]
  );

  const isIssueCategory =
    selectedCategory === 'envi_issue' ||
    selectedCategory === 'safety_issue' ||
    Boolean(matchedPreset?.supportsRemediation);

  useEffect(() => {
    if (!isOpen) return;
    const preselectedPreset = preselectedActivityId
      ? SHE_ACTIVITY_PRESETS.find((p) => p.id === preselectedActivityId)
      : undefined;
    const preselectedAct = preselectedActivityId
      ? activities.find((a) => a.id === preselectedActivityId)
      : undefined;

    if (preselectedPreset) {
      setSelectedCategory(preselectedPreset.categoryKey);
      setActivityTitle(preselectedPreset.title);
      setBasePoints(preselectedPreset.basePoints);
      setPointsOverride(String(preselectedPreset.basePoints));
    } else if (preselectedAct) {
      setSelectedCategory('custom');
      setActivityTitle(preselectedAct.title);
      setBasePoints(preselectedAct.points);
      setPointsOverride(String(preselectedAct.points));
    } else {
      const firstPreset = SHE_ACTIVITY_PRESETS[0];
      setSelectedCategory(firstPreset.categoryKey);
      setActivityTitle(firstPreset.title);
      setBasePoints(firstPreset.basePoints);
      setPointsOverride(String(firstPreset.basePoints));
    }

    setRemediationMode('none');
    setLaterBonusPoints('10');
    setSelectedIds(preselectedEmployeeId ? [preselectedEmployeeId] : []);
    setNote('');
    setEmpSearch('');
  }, [isOpen, preselectedEmployeeId, preselectedActivityId, activities]);

  if (!isOpen) return null;

  const matchedActivity = activities.find(
    (a) => a.title.trim().toLowerCase() === activityTitle.trim().toLowerCase()
  );

  const filteredEmployees = employees.filter((e) => {
    const q = empSearch.trim().toLowerCase();
    return (
      !q ||
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const recalcTotalPoints = (
    nextBase: number,
    nextMode: RemediationMode,
    nextLaterBonus: string,
    allowRemediation: boolean
  ) => {
    if (!allowRemediation) {
      setPointsOverride(String(nextBase));
      return;
    }
    if (nextMode === 'immediate') {
      setPointsOverride(String(nextBase + 20));
    } else if (nextMode === 'later') {
      const bonus = Math.max(0, Number(nextLaterBonus) || 0);
      setPointsOverride(String(nextBase + bonus));
    } else {
      setPointsOverride(String(nextBase));
    }
  };

  const handleCategoryChange = (cat: SheCategoryKey) => {
    setSelectedCategory(cat);
    if (cat === 'custom') {
      setActivityTitle('');
      setBasePoints(20);
      setRemediationMode('none');
      setPointsOverride('20');
      return;
    }
    const first = SHE_ACTIVITY_PRESETS.find((p) => p.categoryKey === cat);
    if (first) {
      setActivityTitle(first.title);
      setBasePoints(first.basePoints);
      const nextMode = first.supportsRemediation ? remediationMode : 'none';
      if (!first.supportsRemediation) setRemediationMode('none');
      recalcTotalPoints(first.basePoints, nextMode, laterBonusPoints, first.supportsRemediation);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = SHE_ACTIVITY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivityTitle(preset.title);
    setBasePoints(preset.basePoints);
    const nextMode = preset.supportsRemediation ? remediationMode : 'none';
    if (!preset.supportsRemediation) setRemediationMode('none');
    recalcTotalPoints(preset.basePoints, nextMode, laterBonusPoints, preset.supportsRemediation);
  };

  const handleActivityInputChange = (nextTitle: string) => {
    setActivityTitle(nextTitle);
    const preset = SHE_ACTIVITY_PRESETS.find(
      (p) => p.title.trim().toLowerCase() === nextTitle.trim().toLowerCase()
    );
    if (preset) {
      setBasePoints(preset.basePoints);
      recalcTotalPoints(
        preset.basePoints,
        remediationMode,
        laterBonusPoints,
        preset.supportsRemediation
      );
      return;
    }
    const matched = activities.find(
      (a) => a.title.trim().toLowerCase() === nextTitle.trim().toLowerCase()
    );
    if (matched) {
      setBasePoints(matched.points);
      setPointsOverride(String(matched.points));
    }
  };

  const handleRemediationChange = (nextMode: RemediationMode) => {
    setRemediationMode(nextMode);
    recalcTotalPoints(basePoints, nextMode, laterBonusPoints, true);
  };

  const handleLaterBonusChange = (val: string) => {
    setLaterBonusPoints(val);
    recalcTotalPoints(basePoints, 'later', val, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedTitle = activityTitle.trim();
    if (!selectedIds.length || !cleanedTitle) return;
    const numericPoints = Math.max(1, Number(pointsOverride) || 0);

    let finalNote = note.trim();
    if (isIssueCategory) {
      const remLabel =
        remediationMode === 'immediate'
          ? 'แก้ไขทันที (+20 คะแนน)'
          : remediationMode === 'later'
          ? `แก้ไขภายหลัง (+${Math.max(0, Number(laterBonusPoints) || 0)} คะแนน)`
          : 'แจ้งประเด็นอย่างเดียว';
      finalNote = finalNote ? `${remLabel} — ${finalNote}` : remLabel;
    }

    await onSubmit({
      employeeIds: selectedIds,
      activityId: matchedActivity?.id,
      activityTitle: cleanedTitle,
      points: numericPoints,
      note: finalNote,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            บันทึกคะแนนร่วมกิจกรรมพนักงาน (SHE &amp; ENVI)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ชื่อกิจกรรม / ประเด็นที่แจ้ง
              </label>
              <input
                type="text"
                list="activity-title-suggestions"
                value={activityTitle}
                onChange={(e) => handleActivityInputChange(e.target.value)}
                required
                placeholder="พิมพ์ชื่อกิจกรรมเอง หรือเลือกจากหมวดหมู่ด้านล่าง..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
              <datalist id="activity-title-suggestions">
                {activities.map((act) => (
                  <option key={act.id} value={act.title}>
                    {act.title} ({act.points} คะแนน)
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                คะแนนรวมที่ได้รับ
              </label>
              <input
                type="number"
                min={1}
                value={pointsOverride}
                onChange={(e) => setPointsOverride(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono font-semibold text-teal-700 tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-slate-50/80 border border-slate-200 rounded-lg">
            <div className="flex flex-wrap gap-1.5">
              {SHE_CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleCategoryChange(tab.key)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                    selectedCategory === tab.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {categoryPresets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryPresets.map((preset) => {
                  const isSelected =
                    preset.title.trim().toLowerCase() === activityTitle.trim().toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`px-3 py-2 text-left rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 text-teal-950'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-medium leading-snug">
                        {preset.title.replace(/^[^:]+:\s*/, '')}
                      </span>
                      <span className="font-mono text-xs font-semibold text-teal-700 tabular-nums shrink-0">
                        +{preset.basePoints}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {isIssueCategory && (
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="text-xs font-medium text-slate-700">
                  สถานะการแก้ไขประเด็น (คะแนนฐาน {basePoints} คะแนน)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemediationChange('none')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      remediationMode === 'none'
                        ? 'bg-white border-teal-600 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    แจ้งประเด็นอย่างเดียว (+0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemediationChange('immediate')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      remediationMode === 'immediate'
                        ? 'bg-white border-teal-600 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    แก้ไขทันที (+20 คะแนน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemediationChange('later')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      remediationMode === 'later'
                        ? 'bg-white border-teal-600 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    แก้ไขภายหลัง (ระบุคะแนนเอง)
                  </button>
                </div>

                {remediationMode === 'later' && (
                  <div className="flex items-center gap-3 pt-1">
                    <label
                      htmlFor="later-bonus-input"
                      className="text-xs font-medium text-slate-700 whitespace-nowrap"
                    >
                      คะแนนเพิ่มเมื่อแก้ไขภายหลัง (+):
                    </label>
                    <input
                      id="later-bonus-input"
                      type="number"
                      min={0}
                      value={laterBonusPoints}
                      onChange={(e) => handleLaterBonusChange(e.target.value)}
                      className="w-28 px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                    <span className="text-xs text-slate-500 tabular-nums">
                      รวม {basePoints} + {Math.max(0, Number(laterBonusPoints) || 0)} ={' '}
                      {basePoints + Math.max(0, Number(laterBonusPoints) || 0)} คะแนน
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">
                เลือกพนักงานผู้เข้าร่วม ({selectedIds.length} คน)
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedIds(filteredEmployees.map((e) => e.id))}
                  className="text-teal-700 hover:underline"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-slate-500 hover:underline"
                >
                  ล้างที่เลือก
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white"
              />
            </div>

            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const checked = selectedIds.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 ${
                      checked ? 'bg-teal-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 accent-teal-600 rounded"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {emp.employeeCode} · {emp.department}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                      {emp.availablePoints.toLocaleString()} pts
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              หมายเหตุเพิ่มเติม / จุดที่พบ (ถ้ามี)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                activityTitle.trim()
                  ? `เช่น ${activityTitle.trim()} โซนไลน์ผลิต A`
                  : 'ระบุรายละเอียดเพิ่มเติม...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 tabular-nums">
              รวมมอบคะแนนให้ {selectedIds.length} คน (
              {(selectedIds.length * (Number(pointsOverride) || 0)).toLocaleString()} คะแนน)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedIds.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EmployeeModalProps {
  isOpen: boolean;
  editingEmployee: Employee | null;
  nextEmployeeCode: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'> & { id?: string }) => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  editingEmployee,
  nextEmployeeCode,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingEmployee) {
      setEmployeeCode(editingEmployee.employeeCode);
      setFullName(editingEmployee.fullName);
      setDepartment(editingEmployee.department);
      setRole(editingEmployee.role);
    } else {
      setEmployeeCode(nextEmployeeCode);
      setFullName('');
      setDepartment('');
      setRole('');
    }
  }, [isOpen, editingEmployee, nextEmployeeCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      id: editingEmployee?.id,
      employeeCode: employeeCode.trim(),
      fullName: fullName.trim(),
      department: department.trim() || 'General',
      role: role.trim() || 'Staff',
      email: editingEmployee?.email ?? '',
      availablePoints: editingEmployee?.availablePoints ?? 0,
      lifetimePoints: editingEmployee?.lifetimePoints ?? 0,
      activitiesCount: editingEmployee?.activitiesCount ?? 0,
      joinedDate: editingEmployee?.joinedDate ?? new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสพนักงาน
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">แผนก</label>
              <input
                type="text"
                list="employee-department-suggestions"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                maxLength={80}
                placeholder="เช่น ฝ่ายผลิต, SHE, HR"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              />
              <datalist id="employee-department-suggestions">
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="เช่น สมชาย ใจดี"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่ง</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="เช่น Software Engineer"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ActivityModalProps {
  isOpen: boolean;
  editingActivity: Activity | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (activity: Omit<Activity, 'id'> & { id?: string }) => Promise<void>;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  editingActivity,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(ACTIVITY_CATEGORIES[0]);
  const [points, setPoints] = useState('100');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingActivity) {
      setTitle(editingActivity.title);
      setCategory(editingActivity.category);
      setPoints(String(editingActivity.points));
      setEventDate(editingActivity.eventDate);
      setDescription(editingActivity.description);
    } else {
      setTitle('');
      setCategory(ACTIVITY_CATEGORIES[0]);
      setPoints('100');
      setEventDate(new Date().toISOString().slice(0, 10));
      setDescription('');
    }
  }, [isOpen, editingActivity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      id: editingActivity?.id,
      title: title.trim(),
      category,
      points: Math.max(1, Number(points) || 50),
      eventDate,
      status: editingActivity?.status ?? 'active',
      participantsCount: editingActivity?.participantsCount ?? 0,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {editingActivity ? 'แก้ไขรายละเอียดกิจกรรม' : 'สร้างกิจกรรมสะสมคะแนนใหม่'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อกิจกรรม</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="เช่น ปลูกป่าชายเลนประจำปี"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                {ACTIVITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">คะแนน</label>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              วันที่จัดกิจกรรม
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">คำอธิบาย</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เงื่อนไขการเข้าร่วมและรับคะแนน..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RewardModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reward: Omit<Reward, 'id' | 'redeemedCount'>) => Promise<void>;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ของที่ระลึกองค์กร');
  const [pointsCost, setPointsCost] = useState('200');
  const [stock, setStock] = useState('10');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setCategory('ของที่ระลึกองค์กร');
    setPointsCost('200');
    setStock('10');
    setDescription('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: title.trim(),
      category: category.trim(),
      pointsCost: Math.max(10, Number(pointsCost) || 100),
      stock: Math.max(1, Number(stock) || 1),
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">เพิ่มของรางวัลใหม่</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อของรางวัล</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="เช่น เสื้อยืดองค์กร Limited Edition"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                คะแนนที่ใช้
              </label>
              <input
                type="number"
                min={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนสิทธิ์</label>
              <input
                type="number"
                min={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">หมวดหมู่</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">รายละเอียด</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เงื่อนไขการรับของรางวัล..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มของรางวัล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeductPointsModalProps {
  isOpen: boolean;
  employees: Employee[];
  rewards: Reward[];
  preselectedEmployeeId?: string;
  preselectedRewardId?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onRequestDeduct: (payload: {
    employee: Employee;
    reward?: Reward;
    rewardTitle: string;
    quantity: number;
    pointsCost: number;
    note: string;
  }) => void;
}

export const DeductPointsModal: React.FC<DeductPointsModalProps> = ({
  isOpen,
  employees,
  rewards,
  preselectedEmployeeId,
  preselectedRewardId,
  isSubmitting,
  onClose,
  onRequestDeduct,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [rewardId, setRewardId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customTitle, setCustomTitle] = useState('');
  const [customPoints, setCustomPoints] = useState('100');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const defaultEmpId = preselectedEmployeeId || employees[0]?.id || '';
    setEmployeeId(defaultEmpId);
    if (preselectedRewardId) {
      setMode('catalog');
      setRewardId(preselectedRewardId);
    } else if (rewards.length > 0) {
      setMode('catalog');
      setRewardId(rewards[0].id);
    } else {
      setMode('custom');
      setRewardId('');
    }
    setQuantity('1');
    setCustomTitle('');
    setCustomPoints('100');
    setNote('');
  }, [isOpen, preselectedEmployeeId, preselectedRewardId, employees, rewards]);

  if (!isOpen) return null;

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const selectedReward = rewards.find((r) => r.id === rewardId);
  const parsedQty = Math.max(1, Number(quantity) || 1);
  const totalDeductPoints =
    mode === 'catalog'
      ? (selectedReward?.pointsCost ?? 0) * parsedQty
      : Math.max(1, Number(customPoints) || 0);

  const currentBalance = selectedEmployee?.availablePoints ?? 0;
  const remainingBalance = currentBalance - totalDeductPoints;
  const insufficientPoints = !selectedEmployee || remainingBalance < 0;
  const insufficientStock =
    mode === 'catalog' && (!selectedReward || selectedReward.stock < parsedQty);
  const missingCustomTitle = mode === 'custom' && !customTitle.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || insufficientPoints || insufficientStock || missingCustomTitle) {
      return;
    }
    const resolvedTitle =
      mode === 'catalog' && selectedReward
        ? parsedQty > 1
          ? `${selectedReward.title} (${parsedQty} ชิ้น)`
          : selectedReward.title
        : customTitle.trim();

    onRequestDeduct({
      employee: selectedEmployee,
      reward: mode === 'catalog' ? selectedReward : undefined,
      rewardTitle: resolvedTitle,
      quantity: mode === 'catalog' ? parsedQty : 1,
      pointsCost: totalDeductPoints,
      note: note.trim() || 'พนักงานมารับของรางวัลเรียบร้อย',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            ตัดคะแนนพนักงานเมื่อมารับของรางวัล
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              เลือกพนักงานที่มารับรางวัล
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} · {emp.fullName} ({emp.department}) — คงเหลือ{' '}
                  {emp.availablePoints.toLocaleString()} คะแนน
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('catalog')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === 'catalog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เลือกจากรายการของรางวัล
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ระบุรางวัล / คะแนนที่ตัดเอง
            </button>
          </div>

          {mode === 'catalog' ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ของรางวัลที่มารับ
                </label>
                <select
                  value={rewardId}
                  onChange={(e) => setRewardId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                >
                  {rewards.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.pointsCost.toLocaleString()} คะแนน · เหลือ {r.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  จำนวน
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedReward?.stock || 99}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ชื่อของรางวัล / รายการที่รับ
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  placeholder="เช่น เสื้อโปโล SHE, บัตรของขวัญ"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  คะแนนที่ตัดออก
                </label>
                <input
                  type="number"
                  min={1}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono font-semibold text-amber-700 tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              หมายเหตุ / ผู้รับมอบ (ถ้ามี)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น รับของรางวัลที่เคาน์เตอร์ SHE / HR เรียบร้อย"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="text-slate-500">สรุปยอดคะแนนหลังตัด</div>
              <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {currentBalance.toLocaleString()} − {totalDeductPoints.toLocaleString()} ={' '}
                <span className={remainingBalance < 0 ? 'text-red-600' : 'text-teal-700'}>
                  {remainingBalance.toLocaleString()} คะแนน
                </span>
              </div>
            </div>
            {(insufficientPoints || insufficientStock) && (
              <span className="text-xs font-medium text-red-600">
                {insufficientStock ? 'จำนวนของรางวัลคงเหลือไม่พอ' : 'คะแนนคงเหลือไม่พอ'}
              </span>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || insufficientPoints || insufficientStock || missingCustomTitle
              }
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-40"
            >
              ดำเนินการตัดคะแนน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  dialog: ConfirmDialogState;
  isBusy: boolean;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  dialog,
  isBusy,
  onCancel,
}) => {
  if (!dialog.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">{dialog.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{dialog.message}</p>
        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={isBusy}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
              dialog.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isBusy ? 'กำลังดำเนินการ...' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EmployeeDrawerProps {
  employee: Employee | null;
  logs: PointLog[];
  onClose: () => void;
  onOpenLogPoints: (employeeId: string) => void;
  onOpenDeductPoints: (employeeId: string) => void;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  employee,
  logs,
  onClose,
  onOpenLogPoints,
  onOpenDeductPoints,
}) => {
  if (!employee) return null;

  const employeeLogs = logs.filter((l) => l.employeeId === employee.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="bg-white w-full max-w-md h-full border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-500 tabular-nums">
              {employee.employeeCode} · {employee.department}
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">
              {employee.fullName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200 grid grid-cols-3 gap-4 bg-slate-50/70">
          <div>
            <div className="text-xs text-slate-500">คะแนนคงเหลือ</div>
            <div className="font-mono text-xl font-semibold text-teal-700 tabular-nums mt-0.5">
              {employee.availablePoints.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">สะสมทั้งหมด</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {employee.lifetimePoints.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">กิจกรรมที่ร่วม</div>
            <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
              {employee.activitiesCount}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            ประวัติคะแนน ({employeeLogs.length})
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenDeductPoints(employee.id)}
              className="text-xs font-medium text-amber-700 hover:underline whitespace-nowrap"
            >
              − ตัดคะแนนรับรางวัล
            </button>
            <button
              type="button"
              onClick={() => onOpenLogPoints(employee.id)}
              className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
            >
              + เพิ่มคะแนนกิจกรรม
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {employeeLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ยังไม่มีประวัติการรับหรือแลกคะแนน
            </div>
          ) : (
            employeeLogs.map((log) => (
              <div key={log.id} className="px-6 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {log.activityTitle}
                  </div>
                  {log.note && (
                    <div className="text-xs text-slate-600 mt-0.5">{log.note}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1 tabular-nums">
                    {new Date(log.recordedAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <span
                  className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                    log.pointsDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {log.pointsDelta >= 0 ? `+${log.pointsDelta}` : log.pointsDelta}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
