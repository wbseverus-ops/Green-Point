import React from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import { GasConnectionConfig, WorkspaceTab } from '../types';

interface TopBarProps {
  activeTab: WorkspaceTab;
  gasConfig: GasConnectionConfig;
  isSyncing: boolean;
  onOpenMobileMenu: () => void;
  onOpenLogPoints: () => void;
  onSyncNow: () => void;
}

const TAB_LABELS: Record<WorkspaceTab, string> = {
  overview: 'ภาพรวมและอันดับคะแนน',
  activities: 'กิจกรรมสะสมคะแนน',
  employees: 'ทะเบียนพนักงาน',
  rewards: 'แลกของรางวัล',
  'gas-setup': 'เชื่อมต่อ Google Apps Script & Sheet',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  gasConfig,
  isSyncing,
  onOpenMobileMenu,
  onOpenLogPoints,
  onSyncNow,
}) => {
  const hasUrl = Boolean(gasConfig.webAppUrl);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-2 focus-visible:outline-teal-600"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 whitespace-nowrap hidden sm:inline">ระบบสะสมคะแนน</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {TAB_LABELS[activeTab]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {hasUrl && (
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Google Sheet'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenLogPoints}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกคะแนนกิจกรรม</span>
        </button>
      </div>
    </header>
  );
};
