import React from 'react';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Gift,
  FileSpreadsheet,
  LogOut,
  X,
} from 'lucide-react';
import { GasConnectionConfig, WorkspaceTab } from '../types';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  gasConfig: GasConnectionConfig;
  currentUser: User | null;
  authReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'ภาพรวมและอันดับคะแนน', icon: LayoutDashboard },
  { id: 'activities', label: 'กิจกรรมสะสมคะแนน', icon: CalendarCheck },
  { id: 'employees', label: 'ทะเบียนพนักงาน', icon: Users },
  { id: 'rewards', label: 'แลกของรางวัล', icon: Gift },
  { id: 'gas-setup', label: 'ออนไลน์ & Google Sheet', icon: FileSpreadsheet },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  gasConfig,
  currentUser,
  authReady,
  onSignIn,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isSheetConnected = Boolean(gasConfig.webAppUrl) && gasConfig.syncStatus !== 'error';

  const content = (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-slate-200 select-none">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          PulsePoint HR
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md focus-visible:outline-2 focus-visible:outline-teal-600"
          aria-label="ปิดเมนู"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="เมนูหลัก">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-600 ${
                isActive
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
        <div>
          <div className="text-xs font-medium text-slate-500">การซิงค์ข้อมูลออนไลน์</div>
          {currentUser ? (
            <div className="mt-1">
              <div className="text-sm font-semibold text-teal-800 truncate">
                ออนไลน์ Real-time (Cloud)
              </div>
              <div className="text-xs text-slate-600 truncate mt-0.5">
                {currentUser.email}
              </div>
              {isSheetConnected && (
                <div className="text-xs text-slate-500 mt-0.5">
                  + เชื่อมต่อ Google Sheet แล้ว
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              <div className="text-sm font-semibold text-slate-900">
                {isSheetConnected ? 'Google Sheet (Apps Script)' : 'โหมดเครื่องเดียว (Local)'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                เข้าสู่ระบบ Google เพื่อซิงค์ข้ามเครื่องอัตโนมัติ
              </div>
            </div>
          )}
        </div>

        {authReady && (
          currentUser ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">{content}</div>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
