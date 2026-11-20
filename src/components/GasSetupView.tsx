import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  Unlink,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { CODE_GS_TEMPLATE, INDEX_HTML_TEMPLATE } from '../data/gasTemplates';
import { GasConnectionConfig } from '../types';
import { SHARED_ADMIN_EMAIL, WorkspaceMeta } from '../services/firestoreSync';

interface GasSetupViewProps {
  gasConfig: GasConnectionConfig;
  isSyncing: boolean;
  currentUser: User | null;
  workspaceMeta: WorkspaceMeta | null;
  onSignIn: () => void;
  onUpdateSharedEmails: (nextEmails: string[]) => Promise<void>;
  onSaveAndTestUrl: (url: string) => Promise<void>;
  onSyncFromSheet: () => Promise<void>;
  onRequestPushSeedData: () => void;
  onDisconnect: () => void;
}

export const GasSetupView: React.FC<GasSetupViewProps> = ({
  gasConfig,
  isSyncing,
  currentUser,
  workspaceMeta,
  onSignIn,
  onUpdateSharedEmails,
  onSaveAndTestUrl,
  onSyncFromSheet,
  onRequestPushSeedData,
  onDisconnect,
}) => {
  const [urlInput, setUrlInput] = useState(gasConfig.webAppUrl);
  const [activeCodeTab, setActiveCodeTab] = useState<'code_gs' | 'index_html'>('code_gs');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [newTeammateEmail, setNewTeammateEmail] = useState('');
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  const currentCode =
    activeCodeTab === 'code_gs' ? CODE_GS_TEMPLATE : INDEX_HTML_TEMPLATE;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedTab(activeCodeTab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownload = () => {
    const filename = activeCodeTab === 'code_gs' ? 'Code.gs' : 'Index.html';
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndTestUrl(urlInput);
  };

  const handleAddTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceMeta) return;
    const cleaned = newTeammateEmail.trim().toLowerCase();
    if (!cleaned) return;
    setIsUpdatingTeam(true);
    try {
      await onUpdateSharedEmails([...workspaceMeta.sharedEmails, cleaned]);
      setNewTeammateEmail('');
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleRemoveTeammate = async (emailToRemove: string) => {
    if (!workspaceMeta) return;
    setIsUpdatingTeam(true);
    try {
      await onUpdateSharedEmails(
        workspaceMeta.sharedEmails.filter((e) => e !== emailToRemove)
      );
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          การซิงค์ออนไลน์หลายเครื่อง &amp; Google Sheets
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          ใช้งานพร้อมกันหลายเครื่องแบบ Real-time ผ่านระบบ Cloud และเชื่อมต่อ Google Apps Script เพื่อสำรองข้อมูลลง Google Sheets
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              ซิงค์ข้อมูลออนไลน์พร้อมกันหลายเครื่อง (Cloud Firestore)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เมื่อเข้าสู่ระบบ Google บนเครื่องต่างๆ ข้อมูลพนักงาน คะแนนกิจกรรม และประวัติรับรางวัลจะอัปเดตตรงกันทุกเครื่องแบบ Real-time
            </p>
          </div>
          {!currentUser && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {currentUser && workspaceMeta && (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  กำลังใช้งานฐานข้อมูลออนไลน์ร่วมกัน ({workspaceMeta.id}) · บัญชี {currentUser.email}
                </span>
              </div>
              <span className="text-emerald-800">
                ซิงค์ Real-time ข้ามเครื่องอัตโนมัติ
              </span>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 mb-2">
                เพิ่มอีเมลทีมงาน (Google Account) เพื่อให้เปิดใช้งานฐานข้อมูลเดียวกันจากเครื่องอื่นได้
              </div>
              <form onSubmit={handleAddTeammate} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newTeammateEmail}
                  onChange={(e) => setNewTeammateEmail(e.target.value)}
                  placeholder="กรอก Gmail / Google Workspace ของทีมงาน..."
                  required
                  className="flex-1 max-w-md px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                />
                <button
                  type="submit"
                  disabled={isUpdatingTeam}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isUpdatingTeam ? 'กำลังบันทึก...' : 'เพิ่มสิทธิ์อีเมล'}</span>
                </button>
              </form>

              <div className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {workspaceMeta.sharedEmails.map((email) => {
                  const isPrimaryAdmin =
                    email.toLowerCase() === SHARED_ADMIN_EMAIL ||
                    email.toLowerCase() === (currentUser.email || '').toLowerCase();
                  return (
                    <div
                      key={email}
                      className="px-4 py-2.5 flex items-center justify-between text-xs bg-white"
                    >
                      <span className="font-mono text-slate-800">{email}</span>
                      {isPrimaryAdmin ? (
                        <span className="text-slate-400">ผู้ดูแลหลัก</span>
                      ) : (
                        <button
                          type="button"
                          disabled={isUpdatingTeam}
                          onClick={() => handleRemoveTeammate(email)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>นำออก</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              เชื่อมต่อ Web App URL (Google Apps Script &amp; Google Sheet)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              หากต้องการให้ทุกการบันทึกส่งไปเก็บในไฟล์ Google Sheet ของคุณโดยตรง ให้วางลิงก์ Web App URL ด้านล่าง
            </p>
          </div>
          {gasConfig.spreadsheetUrl && (
            <a
              href={gasConfig.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
            >
              <span>เปิด Google Sheet ที่เชื่อมต่อ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <form onSubmit={handleConnectSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            required
            className="flex-1 px-3.5 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={isSyncing}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isSyncing ? 'กำลังทดสอบ...' : 'บันทึกและทดสอบการเชื่อมต่อ'}
          </button>
        </form>

        {gasConfig.syncStatus === 'connected' && gasConfig.webAppUrl && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <div className="font-semibold">เชื่อมต่อกับ Google Apps Script สำเร็จ</div>
                <div className="text-emerald-800">
                  ซิงค์ข้อมูลล่าสุด:{' '}
                  {gasConfig.lastSyncedAt
                    ? new Date(gasConfig.lastSyncedAt).toLocaleString('th-TH')
                    : 'พร้อมใช้งาน'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSyncFromSheet}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>ดึงข้อมูลจาก Sheet</span>
              </button>
              <button
                type="button"
                onClick={onRequestPushSeedData}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>ส่งข้อมูลปัจจุบันขึ้น Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlInput('');
                  onDisconnect();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-red-700 hover:border-red-200 whitespace-nowrap"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>ตัดการเชื่อมต่อ</span>
              </button>
            </div>
          </div>
        )}

        {gasConfig.syncStatus === 'error' && gasConfig.lastError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold">การเชื่อมต่อมีข้อผิดพลาด</div>
              <div>{gasConfig.lastError}</div>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setActiveCodeTab('code_gs')}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCodeTab === 'code_gs'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Code.gs (Backend API)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('index_html')}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCodeTab === 'index_html'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Index.html (รันใน GAS โดยตรง)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
              >
                {copiedTab === activeCodeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกโค้ด</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#0F172A] text-slate-100 overflow-x-auto max-h-[520px] overflow-y-auto">
            <pre className="text-xs font-mono leading-relaxed whitespace-pre">
              <code>{currentCode}</code>
            </pre>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            ขั้นตอนติดตั้ง Google Apps Script
          </h3>
          <ol className="space-y-4 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-teal-700 pt-0.5 tabular-nums">
                01.
              </span>
              <div>
                <div className="font-medium text-slate-900">สร้าง Google Sheet ใหม่</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  สร้างไฟล์ Google Sheets เปล่า 1 ไฟล์ (ระบบจะสร้างแท็บ Employees, Activities, PointLogs และ Rewards ให้อัตโนมัติ)
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-teal-700 pt-0.5 tabular-nums">
                02.
              </span>
              <div>
                <div className="font-medium text-slate-900">เปิด Apps Script Editor</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ไปที่เมนู Extensions &gt; Apps Script แล้วคัดลอกโค้ดจากแท็บ Code.gs ไปวางแทนที่โค้ดเดิมทั้งหมด จากนั้นกด Save
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-teal-700 pt-0.5 tabular-nums">
                03.
              </span>
              <div>
                <div className="font-medium text-slate-900">สร้างหัวตารางอัตโนมัติ</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกฟังก์ชัน <code className="font-mono text-slate-800">setupSheets</code> ด้านบนแล้วกดปุ่ม Run พร้อมกดอนุญาตสิทธิ์การเข้าถึง Sheet
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-teal-700 pt-0.5 tabular-nums">
                04.
              </span>
              <div>
                <div className="font-medium text-slate-900">Deploy เป็น Web App</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  กด Deploy &gt; New deployment เลือกประเภท Web app ตั้งค่า Execute as: Me และ Who has access: Anyone
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-teal-700 pt-0.5 tabular-nums">
                05.
              </span>
              <div>
                <div className="font-medium text-slate-900">นำ URL มาวางด้านบน</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  คัดลอกลิงก์ Web app URL (ลงท้ายด้วย /exec) มาวางในช่องเชื่อมต่อ แล้วกดปุ่ม "ส่งข้อมูลปัจจุบันขึ้น Sheet" เพื่อเริ่มใช้งาน
                </p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
};
