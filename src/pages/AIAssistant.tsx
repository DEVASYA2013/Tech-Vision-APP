import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Users,
  CreditCard,
  Monitor,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { formatINR, formatDate, getTodayDateString, getCurrentMonthName } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIAssistant: React.FC = () => {
  const { students, courses, batches, seats, payments, attendanceSheets, settings } = useInstitute();
  const { showToast } = useToast();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your Tech Vision Institute AI Assistant. I have live access to your institute's database. You can ask me questions about active student counts, fee balances, today's attendance roll, workstation lab availability, or ask me to draft a polite fee reminder for any student.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pre-computed factual figures from actual database
  const today = getTodayDateString();
  const activeStudents = students.filter((s) => s.status === 'active');
  const inactiveStudents = students.filter((s) => s.status !== 'active');
  const overdueStudents = activeStudents.filter((s) => (s.outstandingBalance || 0) > 0);
  const totalOutstanding = activeStudents.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);

  const currentYearMonth = today.slice(0, 7);
  const monthCollected = payments
    .filter((p) => !p.isReversal && p.paymentDate.startsWith(currentYearMonth))
    .reduce((acc, p) => acc + p.amount, 0);

  const availableSeats = seats.filter((s) => s.status === 'available');
  const occupiedSeats = seats.filter((s) => s.status === 'occupied');

  const todaySheets = attendanceSheets.filter((a) => a.date === today);
  let presentToday = 0;
  let absentToday = 0;
  todaySheets.forEach((s) => {
    s.records.forEach((r) => {
      if (r.status === 'present') presentToday++;
      if (r.status === 'absent') absentToday++;
    });
  });

  const promptSuggestions = [
    'How many active students do we have?',
    'Which students have outstanding fees?',
    'How many seats are available in the computer lab?',
    "Show today's attendance summary.",
    'How much money was collected this month?',
    'Which batches are nearly full?',
    'Create a fee reminder draft for overdue students.',
    "Summarize this month's admissions and collections.",
  ];

  const processQueryLocally = (query: string): string => {
    const q = query.toLowerCase();

    // 1. Active students
    if (q.includes('how many active students') || (q.includes('active student') && q.includes('how many'))) {
      return `According to the database, Tech Vision Computer Class currently has **${activeStudents.length} active students** enrolled across ${courses.length} courses. (Total all-time records including alumni: ${students.length}).`;
    }

    // 2. Outstanding fees
    if (q.includes('outstanding') || q.includes('overdue') || q.includes('pending fee')) {
      if (overdueStudents.length === 0) {
        return `Great news! There are currently **no students with outstanding fees**. All ${activeStudents.length} active students have completely paid their agreed course fees.`;
      }
      const list = overdueStudents
        .slice(0, 5)
        .map((s) => `• **${s.fullName}** (${s.studentId}, ${s.courseName}): Outstanding **${formatINR(s.outstandingBalance)}** (Paid ${formatINR(s.paidAmount)} / ${formatINR(s.netPayable)})`)
        .join('\n');
      return `There are currently **${overdueStudents.length} students** with pending fee dues, totaling **${formatINR(totalOutstanding)}** in outstanding balance:\n\n${list}${overdueStudents.length > 5 ? `\n\n...and ${overdueStudents.length - 5} more.` : ''}\n\nYou can draft WhatsApp fee reminders directly from the Fee Management tab.`;
    }

    // 3. Seats available
    if (q.includes('seat') || q.includes('workstation') || q.includes('pc available')) {
      return `The computer lab has **${seats.length} configured workstations**:\n• **${availableSeats.length} Available**\n• **${occupiedSeats.length} Occupied**\n• **${seats.length - (availableSeats.length + occupiedSeats.length)} Under Maintenance / Inactive**\n\nOccupancy rate is currently ${seats.length > 0 ? Math.round((occupiedSeats.length / seats.length) * 100) : 0}%.`;
    }

    // 4. Attendance
    if (q.includes('attendance') || q.includes('present') || q.includes('today')) {
      return `**Today's Attendance Summary (${formatDate(today)}):**\n• Present: **${presentToday} students**\n• Absent: **${absentToday} students**\n• Sessions Recorded: **${todaySheets.length} batch roll(s)**\n\nTotal active students in institute: ${activeStudents.length}.`;
    }

    // 5. Money collected
    if (q.includes('collected') || q.includes('revenue') || q.includes('collection this month')) {
      const allTimeTotal = payments.filter((p) => !p.isReversal).reduce((acc, p) => acc + p.amount, 0);
      return `**Fee Collection Analytics:**\n• Fees collected in ${getCurrentMonthName()}: **${formatINR(monthCollected)}**\n• Total all-time fee collections: **${formatINR(allTimeTotal)}** across ${payments.length} verified transactions.\n• Total outstanding pending collection: **${formatINR(totalOutstanding)}**.`;
    }

    // 6. Batches full
    if (q.includes('batch') || q.includes('batches') || q.includes('full')) {
      const batchStats = batches.map((b) => {
        const count = students.filter((s) => s.batchId === b.batchId && s.status === 'active').length;
        const pct = Math.round((count / b.maxCapacity) * 100);
        return `• **${b.batchName}** (${b.startTime} - ${b.endTime}): **${count}/${b.maxCapacity} students** (${pct}% capacity)${count >= b.maxCapacity ? ' [FULL]' : ''}`;
      });
      return `**Class Batch Enrollment & Capacity Report:**\n\n${batchStats.join('\n') || 'No active batches found.'}`;
    }

    // 7. Fee Reminder Draft
    if (q.includes('reminder') || q.includes('draft') || q.includes('whatsapp')) {
      const studentToDraft = overdueStudents[0] || students[0];
      if (!studentToDraft) {
        return `No students found in the database to draft a reminder for.`;
      }
      return `Here is a formal, polite WhatsApp/SMS fee reminder draft for **${studentToDraft.fullName}**:\n\n---\n*Dear ${studentToDraft.fullName},*\n\nGreetings from *${settings.instituteName}*, Ahmedabad.\n\nThis is a friendly reminder that you have an outstanding fee balance of *${formatINR(studentToDraft.outstandingBalance)}* for your *${studentToDraft.courseName}* course.\n\n• Total Fee: ${formatINR(studentToDraft.netPayable)}\n• Amount Paid: ${formatINR(studentToDraft.paidAmount)}\n• Pending Balance: ${formatINR(studentToDraft.outstandingBalance)}\n\nPlease clear the balance at the institute office or via UPI at your earliest convenience.\n\n*Contact:* ${settings.phone}\n*Tech Vision Computer Class, Ahmedabad*\n---`;
    }

    // 8. General monthly summary
    return `**Tech Vision Computer Class Executive Summary (${getCurrentMonthName()}):**\n\n• **Active Students:** ${activeStudents.length}\n• **Total Lab Seats:** ${seats.length} (${availableSeats.length} free, ${occupiedSeats.length} occupied)\n• **Fees Collected This Month:** ${formatINR(monthCollected)}\n• **Overdue Fees Pending:** ${formatINR(totalOutstanding)} across ${overdueStudents.length} student(s)\n• **Active Courses:** ${courses.length} courses offered\n• **Class Batches:** ${batches.length} batches running\n\nAll figures are computed directly from live Firestore database records.`;
  };

  const handleSend = async (queryToSend = inputQuery) => {
    if (!queryToSend.trim()) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: queryToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    setTimeout(() => {
      const replyText = processQueryLocally(queryToSend);
      const assistantMsg: Message = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
    }, 600);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-600" />
            AI Institute Assistant
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Query your institute database, calculate stats, and generate student communications.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          Live Firestore Grounded
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  m.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-sm'
                }`}
              >
                {m.sender === 'user' ? 'YOU' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>
                <div
                  className={`mt-2 text-[10px] flex items-center justify-between gap-4 ${
                    m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.sender === 'assistant' && (
                    <button
                      onClick={() => copyMessage(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-cyan-600 cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 animate-pulse">
                Analyzing institute database...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Ask:</span>
          {promptSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-slate-700 text-[11px] font-medium transition shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Query Input Box */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about students, batches, fees, or attendance..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isProcessing}
              className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-900/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
