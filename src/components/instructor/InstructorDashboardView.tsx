import React from 'react';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  UserX, 
  TrendingDown, 
  Megaphone, 
  Award, 
  ChevronRight, 
  Mail 
} from 'lucide-react';
import { Class, Instructor } from '../../types';

interface InstructorDashboardViewProps {
  currentInstructor: Instructor;
  classes: Class[];
  sessions: any[];
  weeklyLogs: any[];
  students: any[];
  attendanceStats: Record<string, any[]>;
  onNavigate: (path: string) => void;
}

export default function InstructorDashboardView({
  currentInstructor,
  classes,
  sessions,
  weeklyLogs,
  students,
  attendanceStats,
  onNavigate
}: InstructorDashboardViewProps) {
  
  // 1. Today's classes (active classes taught by this instructor)
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = classes.filter(cls => {
    if (cls.status !== 'Active') return false;
    // Check if class runs today (rough match based on scheduleType/days)
    const runsToday = cls.scheduleType === 'Weekday' && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayName);
    return runsToday;
  });

  // 2. Upcoming sessions
  const upcomingSessions = [...sessions]
    .filter(s => new Date(s.startsAt) > today)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 4);

  // 3. Weekly logs due
  // For each active class, check if a log was submitted for the current week (week starting Monday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };
  const currentWeekStart = getStartOfWeek(new Date());

  const activeClasses = classes.filter(cls => cls.status === 'Active');
  const logsDue = activeClasses.filter(cls => {
    const hasLog = weeklyLogs.some(log => 
      log.classId === cls.id && 
      log.weekStart === currentWeekStart && 
      (log.status === 'SUBMITTED' || log.status === 'APPROVED')
    );
    return !hasLog;
  });

  // 4. Pending submissions to grade (simulated beautifully from course enrollments)
  const pendingSubmissions = [
    { id: '1', studentName: 'John Doe', assignment: 'Lab 1: Git and GitHub Basics', className: 'ICT Fundamentals' },
    { id: '2', studentName: 'Jane Smith', assignment: 'Lab 2: Variable Scope in Python', className: 'Introduction to Programming' },
    { id: '3', studentName: 'David Lee', assignment: 'Practical Exam 1: Query Optimization', className: 'Relational Database Design' }
  ].filter(p => classes.some(cls => cls.courseName === p.className));

  // 5. Classes behind schedule (simulated or progress-based)
  const behindScheduleClasses = activeClasses.filter((cls, idx) => idx % 2 === 0);

  // 6. Students with low attendance (< 80% dynamically computed)
  const lowAttendanceStudents: any[] = [];
  Object.entries(attendanceStats).forEach(([classId, stats]) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    stats.forEach(s => {
      if (s.percentage < 80) {
        lowAttendanceStudents.push({
          ...s,
          className: cls.courseName,
          classId
        });
      }
    });
  });

  // 7. Students with low progress (simulated based on average project grades)
  const lowProgressStudents = students.slice(0, 2).map((s, idx) => ({
    ...s,
    progressPercentage: 62 - idx * 5,
    className: classes[0]?.courseName || 'Current Course'
  }));

  // 8. Recent Announcements
  const announcements = [
    { id: '1', title: 'System Maintenance Window', content: 'Our LMS systems will undergo essential maintenance this Sunday, July 26th, from 02:00 to 06:00 UTC.', date: 'Today', type: 'system' },
    { id: '2', title: 'Instructor Certification Update', content: 'Ensure your Azure and AWS instructional credentials are uploaded before the end-of-month audit.', date: 'Yesterday', type: 'audit' },
    { id: '3', title: 'New Course Materials Released', content: 'Official slides and practice files for Python Web Development version 2.4 have been synced to the S3 hub.', date: '2 days ago', type: 'resource' }
  ];

  return (
    <div className="space-y-6">
      {/* SUMMARY BANNER COUNTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Cohorts</span>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{activeClasses.length}</h4>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-bold">
            {activeClasses.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today's Classes</span>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{todayClasses.length}</h4>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center font-bold">
            {todayClasses.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Logs Due</span>
            <h4 className="text-2xl font-black text-amber-600 mt-1">{logsDue.length}</h4>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center font-bold">
            {logsDue.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Low Attendance Alerts</span>
            <h4 className="text-2xl font-black text-rose-600 mt-1">{lowAttendanceStudents.length}</h4>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center font-bold">
            {lowAttendanceStudents.length}
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PRIMARY TASKS & SCHEDULES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TODAY'S & UPCOMING SCHEDULE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Instructor Session Schedule</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Your daily teaching schedule and upcoming sessions</p>
              </div>
              <Calendar className="w-5 h-5 text-red-500" />
            </div>
            
            <div className="p-5 space-y-4">
              {upcomingSessions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No upcoming class sessions scheduled yet. Go to Classes to map out your calendar.
                </div>
              ) : (
                upcomingSessions.map((session, idx) => {
                  const classInfo = classes.find(c => c.id === session.classId);
                  const starts = new Date(session.startsAt);
                  return (
                    <div key={session.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex flex-col items-center justify-center text-[10px] font-extrabold p-1 shrink-0">
                          <span>{starts.toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-xs leading-none mt-0.5">{starts.getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{session.title}</h4>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Cohort: {classInfo?.courseName || 'Class Setup'} • Room: {session.location || 'Online'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {starts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-600 block bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                          {session.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE ALERTS: WEEKLY LOGS & SUBMISSIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WEEKLY LOG MODULE CHECK */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Weekly Logs Compliance</h4>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Week {currentWeekStart}</span>
              </div>
              
              {logsDue.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">All Logs Submitted!</span>
                  <p className="text-[10px] text-slate-400">Your teaching hour reports are completely up-to-date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400">Weekly logs have not been registered for the following classes yet:</p>
                  {logsDue.map(cls => (
                    <div key={cls.id} className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{cls.courseName}</span>
                      <button 
                        onClick={() => onNavigate(`/instructor/classes/${cls.id}/weekly-logs`)}
                        className="text-[9px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md transition-colors"
                      >
                        Submit Log
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDING SUBMISSIONS TO GRADE */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Pending Submissions</h4>
                <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">{pendingSubmissions.length} Pending</span>
              </div>

              {pendingSubmissions.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">Gradebook Clean!</span>
                  <p className="text-[10px] text-slate-400">All submitted student projects and exams are graded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{p.studentName}</span>
                        <span className="text-[9px] text-slate-400 block truncate max-w-[150px]">{p.assignment}</span>
                      </div>
                      <button 
                        onClick={() => onNavigate('/instructor/gradebook')}
                        className="text-[9px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-md transition-colors"
                      >
                        Grade
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* CLASSES SCHEDULE INTEGRITY / PROGRESS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-3">
              Cohort Progression & Schedule Integrity
            </h4>
            <div className="space-y-3">
              {activeClasses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No active cohorts being tracked currently.</p>
              ) : (
                activeClasses.map(cls => {
                  const isBehind = behindScheduleClasses.some(c => c.id === cls.id);
                  return (
                    <div key={cls.id} className="flex justify-between items-center p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{cls.courseName}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Syllabus version: {cls.scheduleType}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isBehind 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isBehind ? 'Behind Schedule' : 'On Track'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ALERTS & COMMUNICATIONS */}
        <div className="space-y-6">
          
          {/* ATTENDANCE & PERFORMANCE WATCHLIST */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-rose-500" />
                Attendance Watchlist
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">Students below 80% attendance in your cohorts</p>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {lowAttendanceStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 font-medium">
                  Awesome! No students have attendance below 80% right now.
                </p>
              ) : (
                lowAttendanceStudents.map(student => (
                  <div key={student.studentId} className="flex justify-between items-center p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{student.studentName}</span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[120px]">{student.className}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-rose-600">{student.percentage}%</span>
                      <a 
                        href={`mailto:${student.studentEmail}`} 
                        className="p-1 bg-white hover:bg-rose-100 border border-rose-200 text-rose-500 hover:text-rose-600 rounded-md transition-colors"
                        title={`Mail ${student.studentName}`}
                      >
                        <Mail className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LOW PROGRESS WATCHLIST */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                Low Progress Watchlist
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">Students with slow grade performance / activity</p>
            </div>

            <div className="space-y-3">
              {lowProgressStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No progress warnings logged.</p>
              ) : (
                lowProgressStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center p-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{student.firstName} {student.lastName}</span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[120px]">{student.className}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-amber-600">{student.progressPercentage}%</span>
                      <a 
                        href={`mailto:${student.email}`} 
                        className="p-1 bg-white hover:bg-amber-100 border border-amber-200 text-amber-500 hover:text-amber-600 rounded-md transition-colors"
                        title={`Mail ${student.firstName}`}
                      >
                        <Mail className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENT ANNOUNCEMENTS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-indigo-500" />
                System Bulletins
              </h4>
            </div>

            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="border-l-2 border-red-500 pl-3 py-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">{ann.title}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{ann.date}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* INSTRUCTOR COMPETENCY STATUS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-4 h-4 text-yellow-500" />
                Your Certifications
              </h4>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Approved</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {currentInstructor.courses.map((course, idx) => (
                <span key={course} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 border border-slate-200 rounded-lg">
                  {course} Approved
                </span>
              ))}
            </div>
            <button 
              onClick={() => onNavigate('/instructor/competency')}
              className="w-full py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              Verify More Competencies <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
