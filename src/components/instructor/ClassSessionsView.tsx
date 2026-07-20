import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Loader2, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { Class } from '../../types';

interface ClassSessionsViewProps {
  classId: string;
  classObj: Class;
  onNavigate: (path: string) => void;
}

export default function ClassSessionsView({
  classId,
  classObj,
  onNavigate
}: ClassSessionsViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('Lab 1');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [status, setStatus] = useState<'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'>('SCHEDULED');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [classId]);

  // Handle Edit preparation
  const handleEdit = (session: any) => {
    setEditingSession(session);
    setTitle(session.title);
    // Convert to datetime-local string format
    const startStr = new Date(session.startsAt).toISOString().slice(0, 16);
    const endStr = new Date(session.endsAt).toISOString().slice(0, 16);
    setStartsAt(startStr);
    setEndsAt(endStr);
    setLocation(session.location || '');
    setMeetingUrl(session.meetingUrl || '');
    setStatus(session.status);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingSession(null);
    setTitle(`Class Session - ${classObj.courseName}`);
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const twoHoursLater = new Date(nextHour);
    twoHoursLater.setHours(twoHoursLater.getHours() + 3);
    setStartsAt(nextHour.toISOString().slice(0, 16));
    setEndsAt(twoHoursLater.toISOString().slice(0, 16));
    setLocation(classObj.classroom || 'Lab 1');
    setMeetingUrl('');
    setStatus('SCHEDULED');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Pre-validate endsAt > startsAt
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError("Session end time must be strictly after start time.");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingSession 
        ? `/api/classes/${classId}/sessions/${editingSession.id}`
        : `/api/classes/${classId}/sessions`;
      
      const method = editingSession ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          location: location || null,
          meetingUrl: meetingUrl || null,
          status
        })
      });

      if (res.ok) {
        setShowForm(false);
        setEditingSession(null);
        await fetchSessions();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save class session');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session? This will also remove any attendance history linked to it.")) return;
    try {
      const res = await fetch(`/api/classes/${classId}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchSessions();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROL BAR */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Classroom Training Sessions</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Plan and manage syllabus schedules, physical classrooms and virtual meeting credentials</p>
        </div>
        {!showForm && (
          <button
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Schedule Session
          </button>
        )}
      </div>

      {/* FORM MODAL / PANEL */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {editingSession ? 'Modify Scheduled Session' : 'Schedule New Class Session'}
            </h4>
            <button 
              onClick={() => setShowForm(false)}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Session Topic / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 1 Practice & Debugging Session"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Location / Lab</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 2, Remote, Hybrid"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Virtual Meeting URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Session Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSession(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Session'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SESSIONS LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Hydrating schedule database...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <Calendar className="w-12 h-12 text-slate-300" />
            <h4 className="font-bold text-slate-800 text-xs">No Sessions Scheduled</h4>
            <p className="text-[10px] text-slate-400">Map out training days and labs using the Schedule Session button.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-100 font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-4">Topic / Schedule</th>
                  <th className="px-6 py-4">Classroom Location</th>
                  <th className="px-6 py-4">Virtual Links</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sessions.map((session) => {
                  const starts = new Date(session.startsAt);
                  const ends = new Date(session.endsAt);
                  return (
                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 space-y-1">
                        <span className="font-bold text-slate-950 block text-xs">{session.title}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {starts.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {starts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {ends.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.location || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {session.meetingUrl ? (
                          <a 
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-600 inline-flex items-center gap-1 font-bold hover:underline"
                          >
                            <LinkIcon className="w-3.5 h-3.5 shrink-0" /> Join Meeting
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No link configured</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-full border tracking-wide uppercase ${
                          session.status === 'COMPLETED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : session.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : session.status === 'RESCHEDULED'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onNavigate(`/instructor/classes/${classId}/attendance?sessionId=${session.id}`)}
                          className="px-2.5 py-1 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-md transition-all border border-red-100"
                        >
                          Take Attendance
                        </button>
                        <button
                          onClick={() => handleEdit(session)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-md transition-colors"
                          title="Edit Scheduled Session"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
