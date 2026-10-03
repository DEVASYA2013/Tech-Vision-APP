import React, { useState } from 'react';
import {
  HelpCircle,
  Database,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Layers,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../components/ui/Toast';

export const HelpBackup: React.FC = () => {
  const { students, courses, batches, seats, payments, attendanceSheets, settings } = useInstitute();
  const { showToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);

  // Full Database JSON Snapshot Download
  const handleExportFullJSON = () => {
    setIsExporting(true);
    try {
      const fullSnapshot = {
        metadata: {
          app: 'Tech Vision Computer Class Management System',
          location: 'Ahmedabad, Gujarat, India',
          exportedAt: new Date().toISOString(),
          version: '2.0.0',
        },
        settings,
        students,
        courses,
        batches,
        seats,
        payments,
        attendanceSheets,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullSnapshot, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `TechVision_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Full JSON backup snapshot exported successfully!', 'success');
    } catch {
      showToast('Error exporting backup file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-cyan-600" />
            Backup, Recovery & System Documentation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Operational guide, cloud backup procedures, and offline snapshot tools.
          </p>
        </div>

        <button
          onClick={handleExportFullJSON}
          disabled={isExporting}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Generating Snapshot...' : 'Export Full Database JSON Backup'}
        </button>
      </div>

      {/* Snapshot Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Students Backed Up</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{students.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Receipts & Payments</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{payments.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Attendance Records</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{attendanceSheets.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <div className="text-xs text-slate-500 font-medium">Workstation Seats</div>
          <div className="text-2xl font-black text-cyan-700 mt-1">{seats.length}</div>
        </div>
      </div>

      {/* Backup Strategies Comparison: Free vs Paid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Tier Options */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Free-Tier Backup Options (No Cost)</h3>
              <p className="text-xs text-slate-400">Available out-of-the-box on Spark Plan</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">One-Click JSON Full Snapshot:</strong> Download a
                complete, timestamped JSON copy of all students, courses, batches, seat allocations,
                and receipts anytime with one click above.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">CSV Reports Archiving:</strong> Every report
                (financial collections, student roster, daily attendance roll) can be downloaded as
                CSV and opened in MS Excel or Google Sheets.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Cloud Firestore High-Availability:</strong> Your
                database is hosted multi-region in Google Cloud with 99.99% availability and daily
                free tier quotas (50,000 document reads, 20,000 writes/day).
              </div>
            </div>
          </div>
        </div>

        {/* Paid / Enterprise Automated Options */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Enterprise Automated Options (GCP Billing)</h3>
              <p className="text-xs text-slate-400">Available if Blaze pay-as-you-go plan is enabled</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                1
              </div>
              <div>
                <strong className="text-slate-900">Automated Daily Cloud Backups:</strong> Uses Google
                Cloud Firestore Scheduled Backups to dump data to Google Cloud Storage (requires GCP
                billing account).
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                2
              </div>
              <div>
                <strong className="text-slate-900">Point-In-Time Recovery (PITR):</strong> Allows
                restoring database state to any exact minute in the past 7 days.
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
              Note: For standard institute operations at Tech Vision, regular weekly JSON snapshots
              and CSV exports under the free tier are completely sufficient.
            </div>
          </div>
        </div>
      </div>

      {/* Disaster Recovery Procedure */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          Institute Disaster Recovery & Data Protection Protocol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">1. Weekly Offline Snapshot</div>
            <p>
              Download the JSON backup file every Saturday after business hours and save it to an
              offline encrypted USB or Google Drive folder.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">2. Financial Audit Trail</div>
            <p>
              All fee receipts are immutable; reversal transactions maintain an audit trail with
              staff name and reason, preventing silent deletion.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">3. Safe Student Archiving</div>
            <p>
              Deleting a student moves them to 'inactive' status without erasing historical attendance
              sheets or payment receipts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
