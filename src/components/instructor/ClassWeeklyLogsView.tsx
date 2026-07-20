import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  CheckSquare, 
  Square,
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  X, 
  Save, 
  ArrowLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Class } from '../../types';

interface ClassWeeklyLogsViewProps {
  classId: string;
  classObj: Class;
  onNavigate: (path: string) => void;
}

export default function ClassWeeklyLogsView({
  classId,
  classObj,
  onNavigate
}: ClassWeeklyLogsViewProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [hoursLogged, setHoursLogged] = useState<number>(40);
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');

  // Fetch logs of this class
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs`);
      if (res.ok) {
        const data = await res.json();
        // Filter logs for this specific class
        const classLogs = (data.data || []).filter((l: any) => l.classId === classId);
        setLogs(classLogs);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Set default dates
    const today = new Date();
    const day = today.getDay();
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today.setDate(diffToMon));
    const fri = new Date(mon);
    fri.setDate(fri.getDate() + 4);
    
    setWeekStart(mon.toISOString().slice(0, 10));
    setWeekEnd(fri.toISOString().slice(0, 10));
  }, [classId]);

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    );
  };

  const handleCreateNew = () => {
    setEditingLogId(null);
    setHoursLogged(40);
    setAchievements('');
    setChallenges('');
    setSupportRequired('');
    setSelectedModuleIds([]);
    setFormStatus('DRAFT');
    setShowForm(true);
  };

  const handleEdit = (log: any) => {
    setEditingLogId(log.id);
    setWeekStart(log.weekStart);
    setWeekEnd(log.weekEnd);
    setHoursLogged(Number(log.hoursLogged));
    setAchievements(log.achievements || '');
    setChallenges(log.challenges || '');
    setSupportRequired(log.supportRequired || '');
    setSelectedModuleIds((log.modules || []).map((m: any) => m.moduleId));
    setFormStatus(log.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent, statusToSave: 'DRAFT' | 'SUBMITTED') => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Pre-validate dates & hours
    if (new Date(weekEnd) < new Date(weekStart)) {
      setError("Week end date cannot precede week start date.");
      setSubmitting(false);
      return;
    }

    if (hoursLogged < 0 || hoursLogged > 168) {
      setError("Please input a plausible number of teaching hours (between 0 and 168).");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingLogId ? `/api/logs/${editingLogId}` : `/api/logs`;
      const method = editingLogId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          weekStart,
          weekEnd,
          hoursLogged,
          achievements,
          challenges,
          supportRequired,
          status: statusToSave,
          moduleIds: selectedModuleIds
        })
      });

      if (res.ok) {
        setSuccess(statusToSave === 'SUBMITTED' ? 'Weekly log submitted lock successfully!' : 'Weekly log draft saved!');
        setShowForm(false);
        setEditingLogId(null);
        await fetchLogs();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to submit weekly log');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please verify your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate(`/instructor/classes/${classId}`)}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Weekly Progress Logs</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Submit curriculum coverage logs, teach-hour reports, and request administrator support</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Current Week
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* FORM OVERLAY / EXPANDABLE */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {editingLogId ? 'Modify Weekly Log Report' : 'Compile Weekly Progress Log'}
            </h4>
            <button 
              onClick={() => {
                setShowForm(false);
                setEditingLogId(null);
              }}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, formStatus)} className="space-y-4">
            
            {/* DATE RANGES & HOURS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Week Starting (Mon)</label>
                <input
                  type="date"
                  required
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Week Ending (Fri)</label>
                <input
                  type="date"
                  required
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Actual Hours Taught</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={168}
                  value={hoursLogged}
                  onChange={(e) => setHoursLogged(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            {/* CURRICULUM SYLLABUS MODULES CHECKS */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">Covered Modules (Check all taught this week)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {classObj.modules && classObj.modules.length > 0 ? (
                  classObj.modules.map((mod) => {
                    const checked = selectedModuleIds.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModuleSelection(mod.id)}
                        className={`flex items-start text-left gap-3 p-2 rounded-lg border text-xs transition-all ${
                          checked 
                            ? 'bg-red-50 border-red-300 text-red-950 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {checked ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </span>
                        <div>
                          <span className="font-bold block">{mod.name}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-400">No modules found linked to this class syllabus version.</p>
                )}
              </div>
            </div>

            {/* LOG DETAILS */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Achievements & Lab Complete Metrics</label>
                <textarea
                  required
                  placeholder="Detail any completed assessments, practical assignments, and lab goals reached."
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 h-20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Syllabus Obstacles & Student Blockers</label>
                <textarea
                  placeholder="Any difficult modules, technical lag, or student progress blockages."
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 h-20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Specific Administrative Support Required (LMS / Hardware)</label>
                <textarea
                  placeholder="Need lab resets, textbook code requests, or center coordinator intervention?"
                  value={supportRequired}
                  onChange={(e) => setSupportRequired(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 h-20"
                />
              </div>
            </div>

            {/* FORM FOOTER CONTROLS */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold">
                Status: {formStatus === 'DRAFT' ? 'Saving as editable Draft' : 'Will submit for Admin review'}
              </span>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingLogId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={() => setFormStatus('DRAFT')}
                  className="px-4 py-2 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold rounded-lg transition-colors"
                >
                  Save as Draft
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  onClick={() => setFormStatus('SUBMITTED')}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing...
                    </>
                  ) : (
                    'Submit Log'
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* COMPACT SUBMISSION LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-slate-100 px-5 py-4 font-bold text-xs uppercase tracking-wide flex justify-between items-center">
          <span>Weekly Log Submission Board</span>
          <FileText className="w-4 h-4 text-red-500" />
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading progress log databases...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <FileText className="w-12 h-12 text-slate-300" />
            <h4 className="font-bold text-slate-800 text-xs">No Log History Registered</h4>
            <p className="text-[10px] text-slate-400">Record syllabus achievements and student hours using the Log Current Week button.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const editable = log.status === 'DRAFT' || log.status === 'RETURNED';
              return (
                <div key={log.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                  
                  {/* LOG CARD TOP BAR */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 text-sm">
                        Week Report: {log.weekStart} to {log.weekEnd}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Instructor Hours Logged: {log.hoursLogged} hours • Sync date: {new Date(log.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    {/* STATUS BADGES */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-[9px] font-black border rounded-full tracking-wider uppercase ${
                        log.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.status === 'RETURNED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : log.status === 'SUBMITTED'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : log.status === 'UNDER_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {log.status}
                      </span>

                      {editable && (
                        <button
                          onClick={() => handleEdit(log)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Edit Log Report"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RETURN COMMENT WORKFLOW */}
                  {log.status === 'RETURNED' && log.reviewComment && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-900">Admin Review Feedback:</span>
                        <p className="mt-0.5 text-rose-800 italic">"{log.reviewComment}"</p>
                      </div>
                    </div>
                  )}

                  {/* COVERED MODULES CAPSULES */}
                  {log.modules && log.modules.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.modules.map((m: any) => (
                        <span key={m.moduleId} className="text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                          ✓ {m.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* DETAILED CONTENT COLLAPSIBLE */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] border-t border-slate-100 pt-3">
                    <div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider block text-[9px]">Syllabus Accomplishments</span>
                      <p className="text-slate-500 mt-1 line-clamp-3">{log.achievements}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider block text-[9px]">Encountered Obstacles</span>
                      <p className="text-slate-500 mt-1 line-clamp-3">{log.challenges || 'No blockers recorded.'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider block text-[9px]">Support Requests</span>
                      <p className="text-slate-500 mt-1 line-clamp-3">{log.supportRequired || 'No coordination requested.'}</p>
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
}
