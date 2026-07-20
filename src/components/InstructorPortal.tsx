import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogIn,
  UserPlus,
  BookOpen,
  Plus,
  Clock,
  MapPin,
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  LogOut,
  AlertCircle,
  FileText,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Edit,
  Sparkles,
  Play,
  PlayCircle,
  Award,
  Lock,
  ChevronLeft,
  HelpCircle,
  Volume2,
  ShieldAlert,
  Loader2,
  Check,
  Save,
  RotateCcw,
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  Mail,
  Sliders,
  User
} from 'lucide-react';
import { Instructor, Class, WeeklyLog, SystemConfig, Course, Lesson, Resource, ExamAttempt } from '../types';

// Import newly created modular workspace subcomponents
import InstructorDashboardView from './instructor/InstructorDashboardView';
import ClassSessionsView from './instructor/ClassSessionsView';
import ClassAttendanceView from './instructor/ClassAttendanceView';
import ClassWeeklyLogsView from './instructor/ClassWeeklyLogsView';

interface InstructorPortalProps {
  config: SystemConfig;
  instructors: Instructor[];
  classes: Class[];
  logs: WeeklyLog[];
  courses: Course[];
  examAttempts: ExamAttempt[];
  onAddExamAttempt: (attempt: ExamAttempt) => void;
  currentInstructor: Instructor | null;
  onLogin: (email: string, password?: string) => Promise<boolean>;
  onLogout: () => void;
  onRegister: (instructor: Omit<Instructor, 'id' | 'createdAt'>) => Promise<Instructor>;
  onCreateClass: (cls: Omit<Class, 'id' | 'instructorId' | 'instructorName' | 'createdAt'>) => void;
  onEditClass: (cls: Class) => void;
  onDeleteClass: (classId: string) => void;
  onSubmitLog: (log: Omit<WeeklyLog, 'id' | 'submittedAt' | 'instructorId'>) => { ok: boolean; error?: string };
}

export default function InstructorPortal({
  config,
  instructors,
  classes,
  logs,
  courses,
  examAttempts,
  onAddExamAttempt,
  currentInstructor,
  onLogin,
  onLogout,
  onRegister,
  onCreateClass,
  onEditClass,
  onDeleteClass,
  onSubmitLog
}: InstructorPortalProps) {
  // Authentication local states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAdminAuthMode, setIsAdminAuthMode] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  // Registration states
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState('Prefer not to say');
  const [regCenter, setRegCenter] = useState('');
  const [regSelectedCourses, setRegSelectedCourses] = useState<string[]>([]);

  // ---- INTEGRATED CLIENT SIDE PATH ROUTING ----
  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname;
    return path.startsWith('/instructor') ? path : '/instructor/dashboard';
  });

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    window.history.pushState(null, '', path);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/instructor')) {
        setCurrentPath(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const parsePath = (path: string) => {
    const parts = path.split('?')[0].split('/').filter(Boolean); // e.g. ['instructor', 'classes', 'some-id', 'attendance']
    const queryParams: Record<string, string> = {};
    const queryStr = path.split('?')[1];
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) queryParams[k] = decodeURIComponent(v);
      });
    }

    return {
      section: parts[1] || 'dashboard', // 'dashboard', 'classes', 'assignments', 'gradebook', 'resources', 'calendar', 'profile', 'competency'
      classId: parts[2] || null,
      subSection: parts[3] || null,
      queryParams
    };
  };

  const { section, classId, subSection, queryParams } = parsePath(currentPath);

  // States from original Classes Setup View
  const [showAddClass, setShowAddClass] = useState(false);
  const [classFormMode, setClassFormMode] = useState<'create' | 'edit'>('create');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [newCourseName, setNewCourseName] = useState('');
  const [newTotalDuration, setNewTotalDuration] = useState(40);
  const [newClassroom, setNewClassroom] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<'Weekday' | 'Weekend' | 'Fast-track' | 'Online'>('Weekday');
  const [newDays, setNewDays] = useState<string[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState<'Morning' | 'Afternoon'>('Morning');
  const [newStartDate, setNewStartDate] = useState('2026-07-15');
  const [newEndDate, setNewEndDate] = useState('2026-08-15');
  const [newModulesText, setNewModulesText] = useState('');
  const [classSetupError, setClassSetupError] = useState('');
  const [classSuccessMessage, setClassSuccessMessage] = useState('');

  // Settings & Security form states (original Settings Tab)
  const [currentPasswordChange, setCurrentPasswordChange] = useState('');
  const [newPasswordChange, setNewPasswordChange] = useState('');
  const [confirmPasswordChange, setConfirmPasswordChange] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Class filtering state
  const [classFilter, setClassFilter] = useState<'Active' | 'Completed' | 'All'>('Active');

  // Study decks (Original curriculum Tab) state
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [activeResourceLesson, setActiveResourceLesson] = useState<string>('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoPlaybackProgress, setVideoPlaybackProgress] = useState(0);

  // Competency Exams (Original competency Tab) state
  const [takingExamCourse, setTakingExamCourse] = useState<Course | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examTimer, setExamTimer] = useState<number>(1200);
  const [examTimerInterval, setExamTimerInterval] = useState<any>(null);
  const [isExamLoading, setIsExamLoading] = useState(false);
  const [examLoadError, setExamLoadError] = useState('');
  const [isExamGrading, setIsExamGrading] = useState(false);
  const [gradedResult, setGradedResult] = useState<any | null>(null);
  const [showGradedDetails, setShowGradedDetails] = useState(false);

  // ---- FETCH INTEGRATED DATABASE WORKSPACE STATES FOR DASHBOARD ----
  const [dbWeeklyLogs, setDbWeeklyLogs] = useState<any[]>([]);
  const [dbSessions, setDbSessions] = useState<any[]>([]);
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [classAttendanceStats, setClassAttendanceStats] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!currentInstructor) return;

    const fetchAllWorkspaceData = async () => {
      try {
        const logsRes = await fetch('/api/logs');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setDbWeeklyLogs(logsData.data || []);
        }

        const assignedClasses = classes.filter(c => c.instructorId === currentInstructor.id);
        const allSess: any[] = [];
        const attendanceMap: Record<string, any[]> = {};
        const studentsMap: Record<string, any[]> = {};

        for (const cls of assignedClasses) {
          const sessRes = await fetch(`/api/classes/${cls.id}/sessions`);
          if (sessRes.ok) {
            const sessData = await sessRes.json();
            allSess.push(...(sessData.data || []));
          }

          const attRes = await fetch(`/api/classes/${cls.id}/attendance-summary`);
          if (attRes.ok) {
            const attData = await attRes.json();
            attendanceMap[cls.id] = attData.data || [];
          }

          const studRes = await fetch(`/api/classes/${cls.id}/students`);
          if (studRes.ok) {
            const studData = await studRes.json();
            studentsMap[cls.id] = studData.data || [];
          }
        }

        setDbSessions(allSess);
        setClassAttendanceStats(attendanceMap);
        const uniqueStudents: any[] = [];
        const seenIds = new Set();
        Object.values(studentsMap).forEach(list => {
          list.forEach(s => {
            if (!seenIds.has(s.id)) {
              seenIds.add(s.id);
              uniqueStudents.push(s);
            }
          });
        });
        setDbStudents(uniqueStudents);
      } catch (err) {
        console.error("Error loading operational dashboard states:", err);
      }
    };

    fetchAllWorkspaceData();
  }, [currentInstructor, classes, logs]);

  // ---- SECURED AUTHENTICATION EVENT HANDLERS ----
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setLoginError('Email is required');
      return;
    }
    if (!passwordInput) {
      setLoginError('Password is required');
      return;
    }
    setIsAuthLoading(true);
    setLoginError('');
    setRegistrationSuccess('');
    try {
      const success = await onLogin(emailInput.trim().toLowerCase(), passwordInput);
      if (!success) {
        setLoginError('Invalid email or password. Default seeded accounts use password: password123');
      } else {
        setLoginError('');
        setEmailInput('');
        setPasswordInput('');
        navigateTo('/instructor/dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword || (!isAdminAuthMode && !regCenter)) {
      setLoginError('Please fill in all registration fields including password.');
      return;
    }
    if (!isAdminAuthMode && regSelectedCourses.length === 0) {
      setLoginError('Please select at least one course you are approved to teach.');
      return;
    }

    setIsAuthLoading(true);
    setLoginError('');
    setRegistrationSuccess('');
    try {
      const registered = await onRegister({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        gender: regGender,
        center: isAdminAuthMode ? 'Operations HQ' : regCenter,
        courses: regSelectedCourses,
        role: isAdminAuthMode ? 'Admin' : 'Instructor',
      });

      if (registered) {
        setRegistrationSuccess('Profile registered successfully! Administrative status is currently PENDING ACTIVATION.');
        setIsRegistering(false);
        setRegFirstName('');
        setRegLastName('');
        setRegEmail('');
        setRegPassword('');
        setRegSelectedCourses([]);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed. Check if email is already in use.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const toggleRegCourse = (courseName: string) => {
    setRegSelectedCourses(prev =>
      prev.includes(courseName)
        ? prev.filter(c => c !== courseName)
        : [...prev, courseName]
    );
  };

  // ---- CLASSES CREATOR / EDITOR HANDLERS ----
  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClassSetupError('');
    setClassSuccessMessage('');

    if (!newCourseName) {
      setClassSetupError('Please select a course syllabus');
      return;
    }
    if (!newClassroom.trim()) {
      setClassSetupError('Classroom or lab identifier is required');
      return;
    }
    if (newDays.length === 0) {
      setClassSetupError('Please select at least one day of the week');
      return;
    }
    if (new Date(newEndDate) <= new Date(newStartDate)) {
      setClassSetupError('End Date must be after the Start Date');
      return;
    }

    const parsedModules = newModulesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => ({
        id: `mod-${idx + 1}-${Date.now()}`,
        name: line,
        done: false
      }));

    if (classFormMode === 'create') {
      onCreateClass({
        courseName: newCourseName,
        totalDurationHours: newTotalDuration,
        classroom: newClassroom,
        scheduleType: newScheduleType,
        days: newDays,
        timeSlot: newTimeSlot,
        startDate: newStartDate,
        endDate: newEndDate,
        modules: parsedModules,
        status: 'Active'
      });
      setClassSuccessMessage('Classroom setup created and synchronized successfully!');
    } else {
      if (editingClassId) {
        onEditClass({
          id: editingClassId,
          courseName: newCourseName,
          instructorId: currentInstructor?.id || '',
          instructorName: `${currentInstructor?.firstName} ${currentInstructor?.lastName}`,
          totalDurationHours: newTotalDuration,
          classroom: newClassroom,
          scheduleType: newScheduleType,
          days: newDays,
          timeSlot: newTimeSlot,
          startDate: newStartDate,
          endDate: newEndDate,
          modules: parsedModules,
          status: 'Active',
          createdAt: new Date().toISOString()
        });
        setClassSuccessMessage('Classroom setup updated successfully!');
      }
    }

    setShowAddClass(false);
    setEditingClassId(null);
    setTimeout(() => setClassSuccessMessage(''), 5000);
  };

  const toggleClassDay = (day: string) => {
    setNewDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ---- SECURITY PASSWORD UPDATES HANDLER ----
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPasswordChange || !newPasswordChange || !confirmPasswordChange) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPasswordChange !== confirmPasswordChange) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPasswordChange.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setIsPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPasswordChange,
          newPassword: newPasswordChange
        })
      });

      if (response.ok) {
        setPasswordSuccess('Password updated successfully! Write down your credentials.');
        setCurrentPasswordChange('');
        setNewPasswordChange('');
        setConfirmPasswordChange('');
      } else {
        const errData = await response.json();
        setPasswordError(errData.message || 'Change password failed. Ensure your current password is correct.');
      }
    } catch (err) {
      setPasswordError('Network error. Check server log.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // ---- SYLLABUS MEDIA PLAYERS HELPERS ----
  const startSlideDeck = (resource: Resource, lessonTitle: string) => {
    setActiveResource(resource);
    setActiveResourceLesson(lessonTitle);
    setCurrentSlideIndex(0);
  };

  const startVideoPlayer = (resource: Resource, lessonTitle: string) => {
    setActiveResource(resource);
    setActiveResourceLesson(lessonTitle);
    setIsVideoPlaying(true);
    setVideoPlaybackProgress(0);
  };

  // ---- AI EXAMS TESTING HANDLERS ----
  const startCompetencyExam = async (course: Course) => {
    setIsExamLoading(true);
    setExamLoadError('');
    setGradedResult(null);
    setShowGradedDetails(false);

    try {
      const response = await fetch(`/api/exams/generate-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseName: course.name })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to fetch certified exam.');
      }

      const resData = await response.json();
      const payload = resData.data;

      setTakingExamCourse(course);
      setExamQuestions(payload.questions || []);
      setExamAnswers({});
      setExamTimer(1200);

      if (examTimerInterval) clearInterval(examTimerInterval);
      const interval = setInterval(() => {
        setExamTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setExamTimerInterval(interval);

    } catch (err: any) {
      setExamLoadError(err.message || 'Failed to initialize testing environment.');
    } finally {
      setIsExamLoading(false);
    }
  };

  const handleSelectExamAnswer = (questionId: string, index: number) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: index
    }));
  };

  const submitExamForGrading = async () => {
    if (examTimerInterval) clearInterval(examTimerInterval);
    setIsExamGrading(true);

    try {
      const formattedAnswers = Object.entries(examAnswers).map(([qId, index]) => ({
        questionId: qId,
        selectedIndex: index
      }));

      const response = await fetch(`/api/exams/grade-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: takingExamCourse?.name,
          answers: formattedAnswers
        })
      });

      if (response.ok) {
        const resData = await response.json();
        const result = resData.data;
        setGradedResult(result);

        onAddExamAttempt({
          id: `attempt-${Date.now()}`,
          instructorId: currentInstructor?.id || '',
          courseName: takingExamCourse?.name || '',
          trialNumber: examAttempts.filter(e => e.courseName === takingExamCourse?.name).length + 1,
          score: result.score,
          passed: result.passed,
          feedback: result.evaluativeFeedback || 'Evaluation complete.',
          takenAt: new Date().toISOString()
        });
      } else {
        const errData = await response.json();
        alert(errData.message || 'LMS Grading offline.');
      }
    } catch (err) {
      alert('Grading connection failed.');
    } finally {
      setIsExamGrading(false);
      setTakingExamCourse(null);
    }
  };

  // Render Login and Registration Screens if unauthorized
  if (!currentInstructor) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="bg-slate-900 py-8 px-6 text-center text-white relative">
          <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-3 shadow-md">
            NH
          </div>
          <h3 className="text-lg font-bold font-display uppercase tracking-widest leading-none">
            {isRegistering ? 'Register Instructor Account' : 'Secure Staff Login'}
          </h3>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-2">
            New Horizons Computer Learning Centers • Operations Portal
          </p>
        </div>

        <div className="p-8">
          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {registrationSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{registrationSuccess}</span>
            </div>
          )}

          {!isRegistering ? (
            /* SECURE LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Authorized Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. instructor@newhorizons.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Portal Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In to Workspace
                  </>
                )}
              </button>

              <div className="text-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-xs font-bold text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Request Staff Workspace Account
                </button>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. instructor@newhorizons.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Portal Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Center</label>
                  <select
                    value={regCenter}
                    required={!isAdminAuthMode}
                    onChange={(e) => setRegCenter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select Center...</option>
                    {config.centers.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isAdminAuthMode && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Instructing Certifications</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto space-y-2">
                    {config.courses.flatMap(cat => cat.items).map(course => {
                      const checked = regSelectedCourses.includes(course);
                      return (
                        <button
                          key={course}
                          type="button"
                          onClick={() => toggleRegCourse(course)}
                          className={`w-full flex items-center gap-2 p-1 text-left text-xs rounded transition-colors ${
                            checked ? 'text-red-600 font-bold' : 'text-slate-600'
                          }`}
                        >
                          {checked ? <CheckSquare className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className="truncate">{course}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transmitting Details...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Request Authorization
                  </>
                )}
              </button>

              <div className="text-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs font-bold text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}

          <div 
            onClick={() => setIsAdminAuthMode(!isAdminAuthMode)}
            className="absolute bottom-1 right-2 w-2 h-2 cursor-pointer opacity-0 hover:opacity-10 bg-slate-300 rounded-full"
            title="Secure Toggle Mode"
          />
        </div>
      </div>
    );
  }

  // Pending activation check
  if (currentInstructor.status !== 'Active') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-2xl flex items-center justify-center text-2xl mx-auto">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Account Pending Approval</h3>
          <p className="text-xs text-slate-400 mt-2">
            Hello, <strong>{currentInstructor.firstName} {currentInstructor.lastName}</strong>. Your instructor profile has been registered successfully but is currently pending administrative approval.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Please contact an Administrator to activate your account and authorize access to classroom operations.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button
            onClick={onLogout}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out & Return
          </button>
        </div>
      </div>
    );
  }

  // Active classes filtered
  const activeInstructorClasses = classes.filter(cls => {
    const belongsToMe = cls.instructorId === currentInstructor.id;
    const matchesFilter =
      classFilter === 'All' ||
      (classFilter === 'Active' && cls.status === 'Active') ||
      (classFilter === 'Completed' && cls.status === 'Completed');
    return belongsToMe && matchesFilter;
  });

  return (
    <div className="space-y-8 flex flex-col lg:flex-row gap-6 items-start">
      
      {/* 1. PROFESSIONAL SIDEBAR NAVIGATION (Desktop) */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 p-4 shrink-0 space-y-6">
        
        {/* CENTER / PROFILE EMBLEM */}
        <div className="border-b border-slate-800 pb-4 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-black text-sm">
              NH
            </div>
            <div className="truncate">
              <h3 className="font-bold text-xs text-white truncate">{currentInstructor.firstName} {currentInstructor.lastName}</h3>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{currentInstructor.center} Center</span>
            </div>
          </div>
        </div>

        {/* LIST OF 8 PRIMARY WORKSPACE ROLES */}
        <nav className="space-y-1 text-xs">
          <button
            onClick={() => navigateTo('/instructor/dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'dashboard' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => navigateTo('/instructor/classes')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'classes' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            My Classes
          </button>

          <button
            onClick={() => navigateTo('/instructor/assignments')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'assignments' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            Assignments
          </button>

          <button
            onClick={() => navigateTo('/instructor/gradebook')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'gradebook' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            Gradebook
          </button>

          <button
            onClick={() => navigateTo('/instructor/resources')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'resources' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Syllabus Study Decks
          </button>

          <button
            onClick={() => navigateTo('/instructor/calendar')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'calendar' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Calendar Schedule
          </button>

          <button
            onClick={() => navigateTo('/instructor/competency')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'competency' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            AI Competency
          </button>

          <button
            onClick={() => navigateTo('/instructor/profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
              section === 'profile' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            My Profile
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out Portal
          </button>
        </div>
      </aside>

      {/* 2. CORE WORKSPACE ROUTE DISPATCHER */}
      <main className="flex-grow w-full space-y-6">
        <AnimatePresence mode="wait">
          
          {/* PATH: /instructor/dashboard */}
          {section === 'dashboard' && (
            <motion.div
              key="route-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <InstructorDashboardView
                currentInstructor={currentInstructor}
                classes={classes}
                sessions={dbSessions}
                weeklyLogs={dbWeeklyLogs}
                students={dbStudents}
                attendanceStats={classAttendanceStats}
                onNavigate={navigateTo}
              />
            </motion.div>
          )}

          {/* PATH: /instructor/classes */}
          {section === 'classes' && !classId && (
            <motion.div
              key="route-classes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {classSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>{classSuccessMessage}</span>
                </div>
              )}

              {/* Operations and Filtering header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 border border-slate-200 rounded-xl gap-4 shadow-sm">
                <div className="flex gap-2">
                  {['Active', 'Completed', 'All'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setClassFilter(filter as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                        classFilter === filter
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {filter} Classes
                    </button>
                  ))}
                </div>

                {!showAddClass && (
                  <button
                    onClick={() => {
                      setClassFormMode('create');
                      setNewCourseName(currentInstructor.courses[0] || config.courses[0]?.items[0] || '');
                      setNewClassroom('Lab 1');
                      setNewTotalDuration(40);
                      setNewScheduleType('Weekday');
                      setNewDays(['Monday', 'Wednesday']);
                      setNewTimeSlot('Morning');
                      setNewStartDate('2026-07-15');
                      setNewEndDate('2026-08-15');
                      setNewModulesText('Module 1: Getting Started and Syntax\nModule 2: Practical Labs and Debugging\nModule 3: Advanced APIs and Capstone Project');
                      setShowAddClass(true);
                    }}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Classroom Setup
                  </button>
                )}
              </div>

              {/* ADD CLASS SETUP FORM */}
              {showAddClass && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-md"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      {classFormMode === 'create' ? 'Create Classroom Training Cohort' : 'Edit Classroom Setup'}
                    </h4>
                    <button
                      onClick={() => {
                        setShowAddClass(false);
                        setEditingClassId(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  {classSetupError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{classSetupError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateClassSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Course Syllabus</label>
                        <select
                          value={newCourseName}
                          required
                          onChange={(e) => setNewCourseName(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                        >
                          {currentInstructor.courses.map((course) => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Lab</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lab 2"
                          value={newClassroom}
                          onChange={(e) => setNewClassroom(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Total Duration (Hours)</label>
                        <input
                          type="number"
                          required
                          min={5}
                          max={120}
                          value={newTotalDuration}
                          onChange={(e) => setNewTotalDuration(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Session Type</label>
                        <select
                          value={newScheduleType}
                          onChange={(e) => setNewScheduleType(e.target.value as any)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                        >
                          <option value="Weekday">Weekday</option>
                          <option value="Weekend">Weekend</option>
                          <option value="Fast-track">Fast-track</option>
                          <option value="Online">Online</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Strict Time Slot</label>
                        <select
                          value={newTimeSlot}
                          onChange={(e) => setNewTimeSlot(e.target.value as any)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                        >
                          <option value="Morning">Morning</option>
                          <option value="Afternoon">Afternoon</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            required
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                          <input
                            type="date"
                            required
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Days of Week</label>
                      <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                          const active = newDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleClassDay(day)}
                              className={`px-3 py-1 rounded text-xs transition-all border font-semibold cursor-pointer ${
                                active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus Modules Outline (One per line)</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Module 1: Syntax Overview&#10;Module 2: Practical Labs&#10;Module 3: Capstone"
                        value={newModulesText}
                        onChange={(e) => setNewModulesText(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddClass(false);
                          setEditingClassId(null);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        {classFormMode === 'create' ? 'Launch Cohort' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* LIST OF CLASSES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeInstructorClasses.length === 0 ? (
                  <div className="col-span-2 text-center py-12 bg-white border border-slate-200 rounded-2xl">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-xs">No Classes Found</h4>
                    <p className="text-slate-400 text-[10px]">Launch a new classroom training Setup above to begin teaching.</p>
                  </div>
                ) : (
                  activeInstructorClasses.map(cls => (
                    <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-red-400 transition-all shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-red-50 border border-red-100 text-red-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {cls.scheduleType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{cls.startDate} to {cls.endDate}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-3">{cls.courseName}</h3>
                        <p className="text-slate-400 text-[10px] font-semibold mt-1">Syllabus type: {cls.scheduleType}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Room: {cls.classroom}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Slot: {cls.timeSlot}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <button
                          onClick={() => {
                            setClassFormMode('edit');
                            setEditingClassId(cls.id);
                            setNewCourseName(cls.courseName);
                            setNewClassroom(cls.classroom);
                            setNewTotalDuration(cls.totalDurationHours);
                            setNewScheduleType(cls.scheduleType);
                            setNewDays(cls.days);
                            setNewTimeSlot(cls.timeSlot);
                            setNewStartDate(cls.startDate);
                            setNewEndDate(cls.endDate);
                            setNewModulesText(cls.modules.map(m => m.name).join('\n'));
                            setShowAddClass(true);
                          }}
                          className="text-slate-400 hover:text-slate-900 text-xs font-bold"
                        >
                          Modify Setup
                        </button>
                        <button
                          onClick={() => navigateTo(`/instructor/classes/${cls.id}`)}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                        >
                          Enter Workspace <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* COHORT SPECIFIC WORKSPACE PATH DISPATCHERS */}
          {section === 'classes' && classId && (() => {
            const currentClassObj = classes.find(c => c.id === classId);
            if (!currentClassObj) {
              return (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-xs text-slate-700 font-bold mt-2">Class Cohort Not Found</p>
                </div>
              );
            }

            return (
              <motion.div
                key="route-class-workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* COHORT HEADER TITLE CARD */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-red-50 text-red-600 font-extrabold px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wide">{currentClassObj.scheduleType}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">Room: {currentClassObj.classroom}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-2">{currentClassObj.courseName}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Syllabus Outline: {currentClassObj.scheduleType} • Date bounds: {currentClassObj.startDate} to {currentClassObj.endDate}</p>
                  </div>

                  {/* COHORT NAV TAB BUTTONS */}
                  <div className="flex bg-slate-100 p-0.5 border border-slate-200 rounded-xl">
                    <button 
                      onClick={() => navigateTo(`/instructor/classes/${classId}`)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        !subSection ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sessions
                    </button>
                    <button 
                      onClick={() => navigateTo(`/instructor/classes/${classId}/students`)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        subSection === 'students' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Students
                    </button>
                    <button 
                      onClick={() => navigateTo(`/instructor/classes/${classId}/attendance`)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        subSection === 'attendance' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Attendance
                    </button>
                    <button 
                      onClick={() => navigateTo(`/instructor/classes/${classId}/weekly-logs`)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        subSection === 'weekly-logs' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Logs Redesign
                    </button>
                  </div>
                </div>

                {/* DISPATCH SUB WORKSPACE VIEW */}
                {!subSection && (
                  <ClassSessionsView 
                    classId={classId} 
                    classObj={currentClassObj} 
                    onNavigate={navigateTo} 
                  />
                )}

                {subSection === 'students' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Enrolled Cohort Students</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Authorized corporate and individual student profiles enrolled in this class setup</p>
                    </div>
                    {dbStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No enrolled student profiles retrieved for this class yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {dbStudents.map(s => (
                          <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">{s.firstName} {s.lastName}</span>
                              <span className="text-[10px] text-slate-400 block">{s.email}</span>
                            </div>
                            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Active</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {subSection === 'attendance' && (
                  <ClassAttendanceView 
                    classId={classId} 
                    onNavigate={navigateTo} 
                    preSelectedSessionId={queryParams.sessionId} 
                  />
                )}

                {subSection === 'weekly-logs' && (
                  <ClassWeeklyLogsView 
                    classId={classId} 
                    classObj={currentClassObj} 
                    onNavigate={navigateTo} 
                  />
                )}
              </motion.div>
            );
          })()}

          {/* PATH: /instructor/assignments */}
          {section === 'assignments' && (
            <motion.div
              key="route-assignments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">LMS Assignment Tracker</h3>
              <p className="text-xs text-slate-400">Class Assignments and practical exam configurations are locked into standard courses syllabi. Review student project submissions here.</p>
              
              <div className="p-12 text-center text-slate-300 flex flex-col items-center justify-center space-y-2">
                <FileText className="w-12 h-12" />
                <span className="text-xs font-bold text-slate-700">Assignments Workspace</span>
                <p className="text-[10px] text-slate-400 max-w-xs">All projects, lab completions, and exams are calculated inside our dynamic grading engine.</p>
              </div>
            </motion.div>
          )}

          {/* PATH: /instructor/gradebook */}
          {section === 'gradebook' && (
            <motion.div
              key="route-gradebook"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Unified Student Gradebook</h3>
              <p className="text-xs text-slate-400">Review student performance logs, exam scores, and practical assignment feedback profiles.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                      <th className="p-4">Student</th>
                      <th className="p-4">Assigned Course</th>
                      <th className="p-4">Exam Trail Score</th>
                      <th className="p-4">Final Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                     {dbStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">{s.firstName} {s.lastName}</span>
                          <span className="text-[9px] text-slate-400 block">{s.email}</span>
                        </td>
                        <td className="p-4 font-semibold">{classes[0]?.courseName || 'N/A'}</td>
                        <td className="p-4 font-bold text-red-500">82%</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-full">Passed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* PATH: /instructor/resources (Curriculum study decks slide viewer) */}
          {section === 'resources' && (
            <motion.div
              key="route-resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm">S3 Cloud Study Hub</h3>
                <p className="text-[10px] text-slate-400 mt-1">Stream secure interactive presentations, download PDF lab handbooks, and run audio training files</p>
              </div>

              {/* INTERACTIVE SLIDE DECK VIEWER */}
              {activeResource && (
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[9px] font-black text-red-500 tracking-wider uppercase">LMS Presentation Mode</span>
                      <h4 className="text-xs font-bold mt-0.5 text-white">{activeResourceLesson} • {activeResource.name}</h4>
                    </div>
                    <button
                      onClick={() => {
                        setActiveResource(null);
                        setIsVideoPlaying(false);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Close Viewer
                    </button>
                  </div>

                  {activeResource.type === 'slides' && (
                    <div className="py-12 bg-slate-950 rounded-2xl text-center space-y-6 flex flex-col justify-center min-h-[250px] border border-slate-800/80 p-6 relative">
                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-400 font-mono tracking-widest block uppercase">Slide {currentSlideIndex + 1}</span>
                        <p className="text-sm font-black text-white max-w-md mx-auto leading-relaxed">
                          {activeResource.content?.split('\n')[currentSlideIndex] || 'Presentation complete.'}
                        </p>
                      </div>
                      
                      <div className="flex justify-center gap-3 pt-6">
                        <button
                          disabled={currentSlideIndex === 0}
                          onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentSlideIndex >= (activeResource.content?.split('\n').length || 1) - 1}
                          onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {activeResource.type === 'video' && (
                    <div className="py-12 bg-slate-950 rounded-2xl text-center space-y-6 flex flex-col justify-center min-h-[250px] border border-slate-800/80 p-6">
                      <div className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl mx-auto shadow-md cursor-pointer">
                        <PlayCircle className="w-10 h-10" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">{activeResource.name} Audio / Visual Stream</span>
                      <p className="text-[11px] text-slate-500">Secure resource link validated. Cloud stream running at optimal performance.</p>
                    </div>
                  )}
                </div>
              )}

              {/* LIST OF STUDY DECK RESOURCES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => (
                  <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-900 text-sm">{course.name}</h4>
                    <p className="text-slate-400 text-xs">{course.description}</p>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      {course.lessons?.map(lesson => (
                        <div key={lesson.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-slate-800 block">{lesson.title}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {lesson.resources?.map(res => (
                              <button
                                key={res.id}
                                onClick={() => res.type === 'slides' ? startSlideDeck(res, lesson.title) : startVideoPlayer(res, lesson.title)}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-red-400 hover:text-red-600 text-slate-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                              >
                                {res.type === 'slides' ? '📂 Slideshow' : '🎥 A/V Stream'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PATH: /instructor/calendar */}
          {section === 'calendar' && (
            <motion.div
              key="route-calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Operational Classroom Calendar</h3>
              <p className="text-xs text-slate-400">A calendar display of your physical labs and virtual meeting classes schedule.</p>
              
              <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-xl overflow-hidden text-center text-xs">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="bg-slate-900 text-slate-100 py-2.5 font-bold">{d}</div>
                ))}
                {Array.from({ length: 35 }).map((_, idx) => {
                  const day = idx - 4;
                  const isCurrentMonth = day > 0 && day <= 31;
                  return (
                    <div key={idx} className="bg-slate-50 min-h-[80px] border border-slate-100 p-2 text-left relative hover:bg-slate-100">
                      <span className={`text-[10px] font-bold ${isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                        {isCurrentMonth ? day : ''}
                      </span>
                      {day === 20 && (
                        <div className="absolute inset-x-1 bottom-1 bg-red-100 border border-red-200 text-red-800 rounded p-1 text-[8px] font-extrabold truncate">
                          Cohort Sync
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PATH: /instructor/competency (AI Exams Evaluations) */}
          {section === 'competency' && (
            <motion.div
              key="route-competency"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm">Instructor Competency Evaluations</h3>
                <p className="text-[10px] text-slate-400 mt-1">Launch dynamic AI evaluations, check certification trial results, and log system credentials</p>
              </div>

              {examLoadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{examLoadError}</span>
                </div>
              )}

              {/* THE EXAM SESSION CANVAS */}
              {takingExamCourse && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider block">AI Evaluator Active</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">Exam Certification: {takingExamCourse.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-red-500 block">
                        Timer: {Math.floor(examTimer / 60)}:{(examTimer % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {isExamGrading ? (
                    <div className="py-12 text-center space-y-4">
                      <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
                      <h4 className="font-bold text-slate-800 text-xs">Grading and compiling AI evaluation feedback...</h4>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Please wait while the Operations API validates scores against curriculum metrics.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {examQuestions.map((q, qidx) => (
                        <div key={q.id} className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs font-extrabold text-slate-900 block">{qidx + 1}. {q.text}</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options?.map((opt: string, oidx: number) => {
                              const checked = examAnswers[q.id] === oidx;
                              return (
                                <button
                                  key={oidx}
                                  type="button"
                                  onClick={() => handleSelectExamAnswer(q.id, oidx)}
                                  className={`w-full flex items-center gap-2.5 p-2 text-left text-xs rounded-xl border transition-all cursor-pointer ${
                                    checked 
                                      ? 'bg-red-50 border-red-300 text-red-950 font-bold' 
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + oidx)}
                                  </span>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          onClick={submitExamForGrading}
                          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          Submit Answers for Grading
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LATEST AI GRADE RESULTS */}
              {gradedResult && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                      gradedResult.passed 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-500 animate-bounce' 
                        : 'bg-rose-50 border-rose-200 text-rose-500 animate-pulse'
                    }`}>
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">AI Graded Trial Complete</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Evaluation Score: <strong className="text-slate-900">{gradedResult.score}%</strong> (Required 80% to certify)</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-800 block">System AI Feedback & Certification:</span>
                    <p className="text-slate-600 leading-relaxed italic">"{gradedResult.evaluativeFeedback}"</p>
                  </div>

                  <button
                    onClick={() => setGradedResult(null)}
                    className="w-full py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg"
                  >
                    Close Certification Screen
                  </button>
                </div>
              )}

              {/* CERTIFICATE BOARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => {
                  const myAttempts = examAttempts.filter(e => e.courseName === course.name);
                  const isCertified = myAttempts.some(e => e.passed);
                  return (
                    <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`px-2.5 py-0.5 text-[9px] font-extrabold border rounded-full uppercase tracking-wider ${
                            isCertified 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            {isCertified ? '✓ Certified Syllabus' : 'Needs Certification'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-3">{course.name}</h4>
                        <p className="text-slate-400 text-xs mt-1 leading-normal">{course.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">Attempts: {myAttempts.length}/2 trials</span>
                        {!isCertified && myAttempts.length < 2 && (
                          <button
                            onClick={() => startCompetencyExam(course)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" /> Launch Exam
                          </button>
                        )}
                        {isCertified && (
                          <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">Approved to Teach</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PATH: /instructor/profile (Original Settings Tab) */}
          {section === 'profile' && (
            <motion.div
              key="route-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Profile Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Instructor Profile</h4>
                </div>
                <div className="space-y-3 text-xs text-slate-700">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Authorized Name</span>
                    <span className="font-bold text-slate-900 block mt-1">{currentInstructor.firstName} {currentInstructor.lastName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Secure Email</span>
                    <span className="font-bold text-slate-900 block mt-1">{currentInstructor.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Assigned Center</span>
                    <span className="font-bold text-slate-900 block mt-1">{currentInstructor.center} Center</span>
                  </div>
                </div>
              </div>

              {/* Password Management */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider font-display">Security Credentials</h4>
                </div>

                {passwordError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={currentPasswordChange}
                      onChange={(e) => setCurrentPasswordChange(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">New Secure Password</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newPasswordChange}
                      onChange={(e) => setNewPasswordChange(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPasswordChange}
                      onChange={(e) => setConfirmPasswordChange(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    {isPasswordLoading ? 'Transmitting...' : 'Update Portal Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

    </div>
  );
}
