import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Download } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useInstitute();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action)));

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Action', 'Performed By', 'Role', 'Target Entity', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.logId,
      l.timestamp,
      l.action,
      l.performedByName,
      l.performedByRole,
      l.targetEntity,
      l.details,
    ]);
    exportToCSV('TechVision_Audit_Trail', headers, rows);
    showToast('Audit trail exported to CSV.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-600" />
            Security & Operational Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable log of admissions, payment receipts, attendance rolls, and configuration changes.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Audit Trail
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit details, staff names, or reference IDs..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">All Audit Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Authorized User</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records match the search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.performedByName}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{log.performedByRole}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.targetEntity}: {log.targetId}
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
