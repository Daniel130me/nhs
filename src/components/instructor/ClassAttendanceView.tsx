import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckSquare, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Save, 
  ArrowLeft,
  Search,
  MessageSquare,
  History
} from 'lucide-react';

interface ClassAttendanceViewProps {
  classId: string;
  onNavigate: (path: string) => void;
  preSelectedSessionId?: string | null;
}

export default function ClassAttendanceView({
  classId,
  onNavigate,
  preSelectedSessionId
}: ClassAttendanceViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    arrivalTime: string;
    note: string;
  }>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // 1. Fetch sessions & students of the class
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch class sessions
        const sessRes = await fetch(`/api/classes/${classId}/sessions`);
        let fetchedSessions: any[] = [];
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          fetchedSessions = sessData.data || [];
          setSessions(fetchedSessions);
        }

        // Fetch students
        const studRes = await fetch(`/api/classes/${classId}/students`);
        if (studRes.ok) {
          const studData = await studRes.json();
          setStudents(studData.data || []);
        }

        // Set initial selected session
        if (preSelectedSessionId) {
          setSelectedSessionId(preSelectedSessionId);
        } else if (fetchedSessions.length > 0) {
          // Default to first completed or scheduled session
          setSelectedSessionId(fetchedSessions[0].id);
        }
      } catch (err) {
        console.error("Error loading attendance initial data:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [classId, preSelectedSessionId]);

  // 2. Fetch existing saved attendance records whenever selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchAttendanceAndAudit = async () => {
      try {
        const res = await fetch(`/api/classes/${classId}/sessions/${selectedSessionId}/attendance`);
        if (res.ok) {
          const data = await res.json();
          const records = data.data || [];
          
          const recordMap: Record<string, any> = {};
          records.forEach((r: any) => {
            recordMap[r.studentId] = {
              status: r.status,
              arrivalTime: r.arrivalTime ? new Date(r.arrivalTime).toISOString().slice(11, 16) : '',
              note: r.note || ''
            };
          });

          // Initialize missing students to PRESENT as default draft
          const newMap = { ...recordMap };
          students.forEach(student => {
            if (!newMap[student.id]) {
              newMap[student.id] = {
                status: 'PRESENT',
                arrivalTime: '',
                note: ''
              };
            }
          });
          setAttendanceRecords(newMap);
        }
      } catch (err) {
        console.error("Error fetching session attendance:", err);
      }
    };

    fetchAttendanceAndAudit();
  }, [selectedSessionId, students]);

  // Shortcut: Mark all students present
  const handleMarkAllPresent = () => {
    const updated = { ...attendanceRecords };
    students.forEach(s => {
      updated[s.id] = {
        ...updated[s.id],
        status: 'PRESENT',
        arrivalTime: ''
      };
    });
    setAttendanceRecords(updated);
    setSuccess('Marked all students present! Click Save to write records.');
    setTimeout(() => setSuccess(''), 4000);
  };

  // Change individual student attendance values
  const updateRecord = (studentId: string, field: string, value: any) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Save/submit attendance payload
  const handleSaveAttendance = async () => {
    if (!selectedSessionId) {
      setError('Please select a valid scheduled class session first.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const recordsPayload = Object.entries(attendanceRecords).map(([studentId, data]) => {
        // Construct full arrivalTime ISO string if status is LATE and time is specified
        let fullArrivalTime: string | null = null;
        if (data.status === 'LATE' && data.arrivalTime) {
          const todayStr = new Date().toISOString().slice(0, 10);
          fullArrivalTime = new Date(`${todayStr}T${data.arrivalTime}:00`).toISOString();
        }

        return {
          studentId,
          status: data.status,
          arrivalTime: fullArrivalTime,
          note: data.note || null
        };
      });

      const res = await fetch(`/api/classes/${classId}/sessions/${selectedSessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsPayload })
      });

      if (res.ok) {
        setSuccess('Class attendance recorded and locked successfully. Audit log logged.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to record attendance');
      }
    } catch (err) {
      setError('Unexpected error. Please check your credentials and try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 border border-slate-200 rounded-xl gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate(`/instructor/classes/${classId}`)}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition-all"
            title="Back to Class Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Session Attendance Register</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Maintain professional classroom rolls, note late arrival stamps, and audit student touchpoints</p>
          </div>
        </div>

        {/* SELECT WORKSPACE SESSION */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">Class Session:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:border-red-500"
          >
            {sessions.map(s => {
              const starts = new Date(s.startsAt);
              return (
                <option key={s.id} value={s.id}>
                  {starts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {s.title} ({s.status})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* CORE ATTENDANCE WORKSPACE */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading student roster and records...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-xs">No Enrolled Students</h4>
          <p className="text-[10px] text-slate-400">Add or enrol students in this cohort to take roll call.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* SEARCH & ACCELERATOR BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 border border-slate-200 rounded-xl gap-3 shadow-sm">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search student names or emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleMarkAllPresent}
                className="w-full sm:w-auto px-4 py-1.5 border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Mark All Present
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ATTENDANCE ROSTER BOARD */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Status Selector</th>
                    <th className="px-6 py-4">Arrival Stamp (Late)</th>
                    <th className="px-6 py-4">Instructor Log Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredStudents.map((student) => {
                    const record = attendanceRecords[student.id] || { status: 'PRESENT', arrivalTime: '', note: '' };
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-950 block text-xs">{student.firstName} {student.lastName}</span>
                          <span className="text-[10px] text-slate-400 block">{student.email}</span>
                        </td>
                        
                        {/* INDIVIDUAL STATUS BUTTONS */}
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((st) => {
                              const active = record.status === st;
                              let style = '';
                              if (st === 'PRESENT') style = active ? 'bg-emerald-500 border-emerald-500 text-white' : 'hover:bg-emerald-50 text-emerald-600 border-emerald-100';
                              if (st === 'ABSENT') style = active ? 'bg-rose-500 border-rose-500 text-white' : 'hover:bg-rose-50 text-rose-600 border-rose-100';
                              if (st === 'LATE') style = active ? 'bg-amber-500 border-amber-500 text-white' : 'hover:bg-amber-50 text-amber-600 border-amber-100';
                              if (st === 'EXCUSED') style = active ? 'bg-slate-500 border-slate-500 text-white' : 'hover:bg-slate-50 text-slate-600 border-slate-100';

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateRecord(student.id, 'status', st)}
                                  className={`px-3 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer uppercase ${style}`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* ARRIVAL PICKER FOR LATE STATUS */}
                        <td className="px-6 py-4">
                          {record.status === 'LATE' ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <input
                                type="time"
                                required
                                value={record.arrivalTime || ''}
                                onChange={(e) => updateRecord(student.id, 'arrivalTime', e.target.value)}
                                className="p-1 border border-amber-300 rounded text-xs text-slate-800 bg-amber-50/30 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>

                        {/* NOTES INPUT FIELD */}
                        <td className="px-6 py-4">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                            <input
                              type="text"
                              placeholder="Add feedback / notes..."
                              value={record.note || ''}
                              onChange={(e) => updateRecord(student.id, 'note', e.target.value)}
                              className="w-full pl-8 pr-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-500 flex items-start gap-2">
            <History className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Server-Side Attendance Security Auditing</span>
              <p className="mt-0.5">Recording and changing attendance records automatically triggers database trigger audits capturing your instructor account profile, IP address, and old vs new state values for absolute integrity.</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
