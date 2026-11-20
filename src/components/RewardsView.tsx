import React, { useMemo, useState } from 'react';
import { Plus, Gift, MinusCircle } from 'lucide-react';
import { Employee, PointLog, Reward } from '../types';

interface RewardsViewProps {
  rewards: Reward[];
  employees: Employee[];
  logs: PointLog[];
  onOpenAddReward: () => void;
  onOpenDeductPoints: (employeeId?: string, rewardId?: string) => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  rewards,
  employees,
  logs,
  onOpenAddReward,
  onOpenDeductPoints,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id ?? ''
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) || employees[0] || null,
    [employees, selectedEmployeeId]
  );

  const redemptionLogs = useMemo(
    () => logs.filter((l) => l.type === 'redeem').slice(0, 12),
    [logs]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            แลกของรางวัล &amp; ตัดคะแนนเมื่อรับรางวัล
          </h2>
          <p className="text-sm text-slate-500">
            เลือกพนักงานที่มารับของรางวัลเพื่อหักคะแนนคงเหลือและบันทึกลง Google Sheet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenDeductPoints(selectedEmployee?.id)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <MinusCircle className="w-4 h-4" />
            <span>ตัดคะแนนรับรางวัล</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddReward}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มของรางวัล</span>
          </button>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label
            htmlFor="redeem-employee-select"
            className="block text-xs font-medium text-slate-600 mb-1.5"
          >
            เลือกพนักงานผู้ขอรับของรางวัล
          </label>
          <select
            id="redeem-employee-select"
            value={selectedEmployee?.id ?? ''}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
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

        {selectedEmployee && (
          <div className="flex flex-wrap items-center gap-6 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-6">
            <div>
              <div className="text-xs text-slate-500">คะแนนคงเหลือที่ใช้แลกได้</div>
              <div className="font-mono text-2xl font-semibold text-teal-700 tabular-nums mt-0.5">
                {selectedEmployee.availablePoints.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">คะแนนสะสมทั้งหมด</div>
              <div className="font-mono text-base font-medium text-slate-700 tabular-nums mt-1">
                {selectedEmployee.lifetimePoints.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenDeductPoints(selectedEmployee.id)}
              className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 whitespace-nowrap"
            >
              ตัดคะแนนแบบระบุเอง
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rewards.map((reward) => {
          const canAfford =
            selectedEmployee !== null && selectedEmployee.availablePoints >= reward.pointsCost;
          const hasStock = reward.stock > 0;
          const canRedeem = canAfford && hasStock;

          return (
            <div
              key={reward.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{reward.category}</span>
                  <span className="tabular-nums">
                    คงเหลือ {reward.stock} สิทธิ์ · แลกแล้ว {reward.redeemedCount}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{reward.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{reward.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">ใช้คะแนน</div>
                  <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    {reward.pointsCost.toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canRedeem}
                  onClick={() =>
                    selectedEmployee && onOpenDeductPoints(selectedEmployee.id, reward.id)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>
                    {!hasStock
                      ? 'หมดสต็อก'
                      : !canAfford
                      ? 'คะแนนไม่พอ'
                      : 'รับรางวัล / ตัดคะแนน'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            ประวัติการรับของรางวัลและตัดคะแนนล่าสุด
          </h3>
        </div>
        {redemptionLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            ยังไม่มีประวัติการรับของรางวัล
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">วันที่</th>
                  <th className="px-5 py-3">พนักงาน</th>
                  <th className="px-5 py-3">รายการของรางวัล</th>
                  <th className="px-5 py-3">หมายเหตุ</th>
                  <th className="px-5 py-3 text-right">คะแนนที่ตัดออก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.recordedAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">{log.employeeName}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2">
                        {log.employeeCode}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{log.activityTitle}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{log.note || '-'}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-amber-700 tabular-nums">
                      {log.pointsDelta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
