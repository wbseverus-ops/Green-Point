import React, { useMemo, useState } from 'react';
import { Download, Search, ArrowUpDown } from 'lucide-react';
import { AppDataState, Employee } from '../types';
import { exportLeaderboardCsv } from '../services/gasClient';

interface OverviewViewProps {
  data: AppDataState;
  onSelectEmployee: (employee: Employee) => void;
  onOpenLogPoints: (preselectedEmployeeId?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  onSelectEmployee,
  onOpenLogPoints,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'available' | 'lifetime' | 'activities'>('available');

  const departments = useMemo(() => {
    const unique = Array.from(new Set(data.employees.map((e) => e.department))).sort();
    return ['ALL', ...unique];
  }, [data.employees]);

  const metrics = useMemo(() => {
    const totalEmployees = data.employees.length;
    const totalLifetimePoints = data.employees.reduce((sum, e) => sum + e.lifetimePoints, 0);
    const activeActivities = data.activities.filter((a) => a.status === 'active').length;
    const earnLogsCount = data.logs.filter((l) => l.type === 'earn').length;
    return { totalEmployees, totalLifetimePoints, activeActivities, earnLogsCount };
  }, [data]);

  const rankedEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...data.employees]
      .filter((emp) => {
        const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;
        const matchQuery =
          !q ||
          emp.fullName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q);
        return matchDept && matchQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'lifetime') return b.lifetimePoints - a.lifetimePoints;
        if (sortBy === 'activities') return b.activitiesCount - a.activitiesCount;
        return b.availablePoints - a.availablePoints;
      });
  }, [data.employees, searchQuery, selectedDept, sortBy]);

  const recentLogs = useMemo(() => data.logs.slice(0, 8), [data.logs]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">พนักงานทั้งหมด</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.totalEmployees.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">คะแนนสะสมที่มอบให้แล้ว</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-teal-700 tabular-nums">
              {metrics.totalLifetimePoints.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">คะแนน</span>
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">กิจกรรมที่เปิดรับอยู่</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.activeActivities.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">รายการ</span>
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">การเข้าร่วมกิจกรรมทั้งหมด</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.earnLogsCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">ครั้ง</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">อันดับคะแนนสะสมพนักงาน</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่รายชื่อพนักงานเพื่อดูประวัติการร่วมกิจกรรมและคะแนนทั้งหมด
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportLeaderboardCsv(data)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส, แผนก..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                aria-label="กรองตามแผนก"
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
              >
                <option value="ALL">ทุกแผนก</option>
                {departments
                  .filter((d) => d !== 'ALL')
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === 'available'
                      ? 'lifetime'
                      : prev === 'lifetime'
                      ? 'activities'
                      : 'available'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  เรียงตาม:{' '}
                  {sortBy === 'available'
                    ? 'คะแนนคงเหลือ'
                    : sortBy === 'lifetime'
                    ? 'คะแนนสะสมรวม'
                    : 'จำนวนกิจกรรม'}
                </span>
              </button>
            </div>
          </div>

          {rankedEmployees.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm font-medium text-slate-900">ไม่พบข้อมูลพนักงานที่ค้นหา</div>
              <p className="text-xs text-slate-500 mt-1">
                ลองเปลี่ยนคำค้นหา หรือเพิ่มพนักงานใหม่ในหน้าทะเบียนพนักงาน
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 w-16">อันดับ</th>
                    <th className="px-5 py-3">พนักงาน</th>
                    <th className="px-5 py-3">แผนก</th>
                    <th className="px-5 py-3 text-right">กิจกรรม</th>
                    <th className="px-5 py-3 text-right">สะสมรวม</th>
                    <th className="px-5 py-3 text-right">คงเหลือ</th>
                    <th className="px-5 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedEmployees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      onClick={() => onSelectEmployee(emp)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{emp.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {emp.employeeCode} · {emp.role}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {emp.activitiesCount}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {emp.lifetimePoints.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-teal-700 tabular-nums">
                        {emp.availablePoints.toLocaleString()}
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenLogPoints(emp.id)}
                          className="text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap"
                        >
                          + เพิ่มคะแนน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">ประวัติการเคลื่อนไหวล่าสุด</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกรายการรับคะแนนและแลกของรางวัลล่าสุด
            </p>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-medium text-slate-900">ยังไม่มีรายการบันทึกคะแนน</div>
              <button
                type="button"
                onClick={() => onOpenLogPoints()}
                className="mt-3 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                บันทึกคะแนนรายการแรก
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => {
                const isPositive = log.pointsDelta >= 0;
                return (
                  <div key={log.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {log.employeeName}
                      </div>
                      <div className="text-xs text-slate-600 truncate mt-0.5">
                        {log.activityTitle}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 tabular-nums">
                        {log.department} ·{' '}
                        {new Date(log.recordedAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div
                      className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                        isPositive ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {isPositive ? `+${log.pointsDelta}` : log.pointsDelta}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
