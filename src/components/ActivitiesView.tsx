import React, { useMemo, useState } from 'react';
import { Plus, Search, CheckCircle2, XCircle, UserPlus, Edit3 } from 'lucide-react';
import { Activity, ActivityStatus } from '../types';

interface ActivitiesViewProps {
  activities: Activity[];
  onOpenAddActivity: () => void;
  onEditActivity: (activity: Activity) => void;
  onToggleStatus: (activity: Activity) => void;
  onLogForActivity: (activityId: string) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities,
  onOpenAddActivity,
  onEditActivity,
  onToggleStatus,
  onLogForActivity,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | ActivityStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((act) => {
      const matchStatus = filterStatus === 'all' || act.status === filterStatus;
      const matchSearch =
        !q ||
        act.title.toLowerCase().includes(q) ||
        act.category.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [activities, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">รายการกิจกรรมสะสมคะแนน</h2>
          <p className="text-sm text-slate-500">
            กำหนดคะแนนของแต่ละกิจกรรมและบันทึกผู้เข้าร่วมลงใน Google Sheet
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddActivity}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างกิจกรรมใหม่</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({activities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterStatus === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เปิดรับ ({activities.filter((a) => a.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('closed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterStatus === 'closed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปิดแล้ว ({activities.filter((a) => a.status === 'closed').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรือหมวดหมู่..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900">ไม่พบกิจกรรมในหมวดหมู่นี้</div>
            <button
              type="button"
              onClick={onOpenAddActivity}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              เพิ่มกิจกรรมแรก
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((act) => {
              const isActive = act.status === 'active';
              return (
                <div
                  key={act.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                      <span>{act.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">วันที่จัด: {act.eventDate}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isActive ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {isActive ? 'เปิดรับลงทะเบียน' : 'ปิดกิจกรรมแล้ว'}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{act.title}</h3>
                    <p className="text-sm text-slate-600 max-w-2xl">{act.description}</p>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0">
                    <div className="flex items-center gap-6 pr-2 border-r border-slate-200">
                      <div>
                        <div className="text-xs text-slate-500">คะแนน</div>
                        <div className="font-mono text-base font-semibold text-teal-700 tabular-nums">
                          +{act.points}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">ผู้เข้าร่วม</div>
                        <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                          {act.participantsCount}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditActivity(act)}
                        className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                        title="แก้ไขกิจกรรม"
                        aria-label={`แก้ไข ${act.title}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(act)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        {isActive ? 'ปิดรับ' : 'เปิดรับอีกครั้ง'}
                      </button>
                      <button
                        type="button"
                        disabled={!isActive}
                        onClick={() => onLogForActivity(act.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>เช็คอินผู้ร่วม</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
