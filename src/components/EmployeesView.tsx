import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit3, Trash2, Eye } from 'lucide-react';
import { Employee } from '../types';

interface EmployeesViewProps {
  employees: Employee[];
  onOpenAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onInspectEmployee: (employee: Employee) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  onOpenAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onInspectEmployee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const departments = useMemo(() => {
    return ['ALL', ...Array.from(new Set(employees.map((e) => e.department))).sort()];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((e) => {
      const matchDept = deptFilter === 'ALL' || e.department === deptFilter;
      const matchQ =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q);
      return matchDept && matchQ;
    });
  }, [employees, deptFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ทะเบียนพนักงาน</h2>
          <p className="text-sm text-slate-500">
            จัดการรายชื่อพนักงาน รหัสพนักงาน แผนก และยอดคะแนนสะสม
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddEmployee}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มพนักงาน</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="กรองตามแผนก"
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">ทุกแผนก ({employees.length})</option>
              {departments
                .filter((d) => d !== 'ALL')
                .map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900">ไม่พบรายชื่อพนักงาน</div>
            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              เพิ่มพนักงานใหม่
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">รหัส</th>
                  <th className="px-5 py-3">ชื่อ-สกุล / ตำแหน่ง</th>
                  <th className="px-5 py-3">แผนก</th>
                  <th className="px-5 py-3 text-right">กิจกรรม</th>
                  <th className="px-5 py-3 text-right">คะแนนคงเหลือ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {emp.employeeCode}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{emp.fullName}</div>
                      <div className="text-xs text-slate-500">{emp.role}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {emp.activitiesCount}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-teal-700 tabular-nums">
                      {emp.availablePoints.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onInspectEmployee(emp)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 rounded-md hover:bg-slate-100 transition-colors"
                          title="ดูประวัติคะแนน"
                          aria-label={`ดูประวัติ ${emp.fullName}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditEmployee(emp)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                          title="แก้ไขข้อมูล"
                          aria-label={`แก้ไข ${emp.fullName}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="ลบพนักงาน"
                          aria-label={`ลบ ${emp.fullName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
