import React, { useState } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { Instructor, Class, WeeklyLog, SystemConfig, Course, Lesson, Resource, ExamAttempt } from '../types';

interface InstructorPortalProps {
  config: SystemConfig;
  instructors: Instructor[];
  classes: Class[];
  logs: WeeklyLog[];
  courses: Course[];
  examAttempts: ExamAttempt[];
  onAddExamAttempt: (attempt: ExamAttempt) => void;
  currentInstructor: Instructor | null;
  onLogin: (email: string) => boolean;
  onLogout: () => void;
  onRegister: (instructor: Omit<Instructor, 'id' | 'createdAt'>) => void;
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
  const [loginError, setLoginError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Registration states
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regGender, setRegGender] = useState('Prefer not to say');
  const [regCenter, setRegCenter] = useState('');
  const [regSelectedCourses, setRegSelectedCourses] = useState<string[]>([]);

  // Workspace sub-tabs: 'classes' | 'curriculum' | 'competency'
  const [portalTab, setPortalTab] = useState<'classes' | 'curriculum' | 'competency'>('classes');

  // Class Setup states
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

  // Weekly Log states
  const [selectedClassForLog, setSelectedClassForLog] = useState<Class | null>(null);
  const [logHours, setLogHours] = useState<number>(4);
  const [logModulesCovered, setLogModulesCovered] = useState<string[]>([]);
  const [logChallenges, setLogChallenges] = useState('');
  const [logError, setLogError] = useState('');
  const [logSuccessMessage, setLogSuccessMessage] = useState('');

  // Active filter for classes list
  const [classFilter, setClassFilter] = useState<'Active' | 'Completed' | 'All'>('Active');

  // ---- SECURE MEDIA READER STATES ----
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [activeResourceLesson, setActiveResourceLesson] = useState<string>('');
  
  // Slides Player state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Simulated Video Player state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoPlaybackProgress, setVideoPlaybackProgress] = useState(0);

  // ---- COMPETENCY EXAMS STATES ----
  const [takingExamCourse, setTakingExamCourse] = useState<Course | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({}); // qId -> selectedIndex
  const [examTimer, setExamTimer] = useState<number>(1200); // 20 minutes in seconds
  const [examTimerInterval, setExamTimerInterval] = useState<any>(null);
  
  const [isExamLoading, setIsExamLoading] = useState(false);
  const [examLoadError, setExamLoadError] = useState('');
  
  // Grading Modal state
  const [isExamGrading, setIsExamGrading] = useState(false);
  const [gradedResult, setGradedResult] = useState<any | null>(null);
  const [showGradedDetails, setShowGradedDetails] = useState(false);

  // ---- AUTH HANDLERS ----
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setLoginError('Email is required');
      return;
    }
    const success = onLogin(emailInput.trim().toLowerCase());
    if (!success) {
      setLoginError('Instructor email not found. Please register an account below.');
    } else {
      setLoginError('');
      setEmailInput('');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regCenter) {
      setLoginError('Please fill in all registration fields.');
      return;
    }
    if (regSelectedCourses.length === 0) {
      setLoginError('Please select at least one course you are approved to teach.');
      return;
    }

    onRegister({
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim().toLowerCase(),
      gender: regGender,
      center: regCenter,
      courses: regSelectedCourses,
      role: 'Instructor'
    });

    setRegFirstName('');
    setRegLastName('');
    setRegEmail('');
    setRegGender('Prefer not to say');
    setRegCenter('');
    setRegSelectedCourses([]);
    setIsRegistering(false);
    setLoginError('');
  };

  const toggleCourseApproval = (course: string) => {
    setRegSelectedCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  // ---- CLASS CRUD HANDLERS ----
  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !newClassroom || !newTimeSlot || !newModulesText.trim()) {
      setClassSetupError('All fields including the modules syllabus are required.');
      return;
    }
    if (newDays.length === 0) {
      setClassSetupError('Please select at least one schedule day.');
      return;
    }

    const parsedModules = newModulesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, index) => ({
        id: `mod-${Date.now()}-${index}`,
        name: line,
        done: false
      }));

    if (parsedModules.length === 0) {
      setClassSetupError('Syllabus must have at least one module line.');
      return;
    }

    if (classFormMode === 'create') {
      onCreateClass({
        courseName: newCourseName,
        totalDurationHours: Number(newTotalDuration),
        classroom: newClassroom,
        scheduleType: newScheduleType,
        days: newDays,
        timeSlot: newTimeSlot,
        startDate: newStartDate,
        endDate: newEndDate,
        modules: parsedModules,
        status: 'Active'
      });
      setClassSuccessMessage('Class created successfully!');
    } else if (classFormMode === 'edit' && editingClassId) {
      const prevClass = classes.find(c => c.id === editingClassId);
      onEditClass({
        id: editingClassId,
        courseName: newCourseName,
        instructorId: currentInstructor?.id || '',
        instructorName: `${currentInstructor?.firstName} ${currentInstructor?.lastName}`,
        totalDurationHours: Number(newTotalDuration),
        classroom: newClassroom,
        scheduleType: newScheduleType,
        days: newDays,
        timeSlot: newTimeSlot,
        startDate: newStartDate,
        endDate: newEndDate,
        modules: prevClass ? prevClass.modules : parsedModules,
        status: prevClass ? prevClass.status : 'Active',
        createdAt: prevClass ? prevClass.createdAt : new Date().toISOString()
      });
      setClassSuccessMessage('Class configuration updated successfully!');
    }

    setNewCourseName('');
    setNewTotalDuration(40);
    setNewClassroom('');
    setNewScheduleType('Weekday');
    setNewDays([]);
    setNewTimeSlot('Morning');
    setNewStartDate('2026-07-15');
    setNewEndDate('2026-08-15');
    setNewModulesText('');
    setClassSetupError('');
    setEditingClassId(null);
    setShowAddClass(false);
    setTimeout(() => setClassSuccessMessage(''), 3000);
  };

  const handleEditClassClick = (cls: Class) => {
    setClassFormMode('edit');
    setEditingClassId(cls.id);
    setNewCourseName(cls.courseName);
    setNewTotalDuration(cls.totalDurationHours);
    setNewClassroom(cls.classroom);
    setNewScheduleType(cls.scheduleType);
    setNewDays(cls.days);
    setNewTimeSlot(cls.timeSlot);
    setNewStartDate(cls.startDate || '2026-07-15');
    setNewEndDate(cls.endDate || '2026-08-15');
    setNewModulesText(cls.modules.map(m => m.name).join('\n'));
    setShowAddClass(true);
  };

  const toggleClassDay = (day: string) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // ---- WEEKLY LOG COMPLIANCE SUBMISSIONS ----
  const openWeeklyLogForm = (cls: Class) => {
    setSelectedClassForLog(cls);
    setLogHours(4);
    setLogModulesCovered([]);
    setLogChallenges('');
    setLogError('');
    setLogSuccessMessage('');
  };

  const toggleLogModule = (moduleId: string) => {
    setLogModulesCovered((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleWeeklyLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForLog) return;

    const previousLogs = logs.filter((l) => l.classId === selectedClassForLog.id);
    const nextWeekNumber = previousLogs.length + 1;

    const result = onSubmitLog({
      classId: selectedClassForLog.id,
      weekNumber: nextWeekNumber,
      hoursLogged: Number(logHours),
      modulesCoveredThisWeek: logModulesCovered,
      challenges: logChallenges
    });

    if (!result.ok) {
      setLogError(result.error || 'Failed to submit log.');
    } else {
      setLogSuccessMessage(`Week ${nextWeekNumber} report submitted successfully!`);
      setTimeout(() => {
        setSelectedClassForLog(null);
        setLogSuccessMessage('');
      }, 1500);
    }
  };

  // ---- SECURE VIEW-ONLY RESOURCE PLAYERS ----
  const handleOpenResource = (res: Resource, lessonTitle: string) => {
    setActiveResource(res);
    setActiveResourceLesson(lessonTitle);
    setCurrentSlideIndex(0);
    setIsVideoPlaying(false);
    setVideoPlaybackProgress(0);
  };

  // Video playback simulator ticker
  React.useEffect(() => {
    let interval: any;
    if (activeResource?.type === 'video' && isVideoPlaying) {
      interval = setInterval(() => {
        setVideoPlaybackProgress(prev => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            return 100;
          }
          return prev + 1.5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeResource, isVideoPlaying]);

  // ---- EXAM PORTAL ACTIONS ----
  const handleStartExam = async (course: Course) => {
    setTakingExamCourse(course);
    setIsExamLoading(true);
    setExamLoadError('');
    setExamAnswers({});
    setExamTimer(1200); // 20 mins

    try {
      const response = await fetch('/api/gemini/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.name,
          lessons: course.lessons
        })
      });

      if (!response.ok) {
        throw new Error('Exam compilation failed on server');
      }

      const examData = await response.json();
      const loadedQuestions = examData.fallback ? examData.fallback.questions : examData.questions;

      if (!loadedQuestions || loadedQuestions.length === 0) {
        throw new Error('No evaluation questions compiled.');
      }

      setExamQuestions(loadedQuestions);
      setIsExamLoading(false);

      // Start Countdown Timer
      const interval = setInterval(() => {
        setExamTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto submit
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setExamTimerInterval(interval);

    } catch (err: any) {
      console.error(err);
      setExamLoadError(err.message || 'Server pipeline error generating competency questions.');
      setIsExamLoading(false);
    }
  };

  const handleAutoSubmitExam = () => {
    clearInterval(examTimerInterval);
    triggerGrading();
  };

  const handleManualSubmitExam = () => {
    if (confirm('Are you sure you want to conclude and submit your evaluation exam?')) {
      clearInterval(examTimerInterval);
      triggerGrading();
    }
  };

  const triggerGrading = async () => {
    if (!takingExamCourse || !currentInstructor) return;
    setIsExamGrading(true);
    setGradedResult(null);

    // Identify current trial number
    const prevAttempts = examAttempts.filter(
      a => a.instructorId === currentInstructor.id && a.courseName === takingExamCourse.name
    );
    const trialNumber = prevAttempts.length + 1;

    try {
      const response = await fetch('/api/gemini/grade-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: examQuestions,
          answers: examAnswers,
          courseName: takingExamCourse.name
        })
      });

      if (!response.ok) {
        throw new Error('AI Assessor pipeline failed to grade submission');
      }

      const gradingResult = await response.json();
      
      // Save attempt
      const savedAttempt: ExamAttempt = {
        id: `eval-${Date.now()}`,
        instructorId: currentInstructor.id,
        courseName: takingExamCourse.name,
        trialNumber,
        score: gradingResult.score,
        passed: gradingResult.passed,
        feedback: gradingResult.feedback,
        takenAt: new Date().toISOString()
      };

      onAddExamAttempt(savedAttempt);
      setGradedResult(gradingResult);
      setIsExamGrading(false);
    } catch (err: any) {
      console.error(err);
      alert('AI Assessor Grading Error: ' + err.message + '. Standard fallback grading is processing.');
      
      // Fallback Algorithmic grading on failure
      let correct = 0;
      examQuestions.forEach(q => {
        if (examAnswers[q.id] === q.correctOptionIndex) {
          correct++;
        }
      });
      const scorePct = Math.round((correct / examQuestions.length) * 100);
      const passed = scorePct >= 70;
      const feedbackText = passed 
        ? `Congratulations! You successfully answered ${correct} out of ${examQuestions.length} questions correctly, scoring ${scorePct}%. You are certified.`
        : `You scored ${scorePct}%, which is below the 70% threshold. Please review slides and retake the evaluation.`;

      const savedAttempt: ExamAttempt = {
        id: `eval-fb-${Date.now()}`,
        instructorId: currentInstructor.id,
        courseName: takingExamCourse.name,
        trialNumber,
        score: scorePct,
        passed,
        feedback: feedbackText,
        takenAt: new Date().toISOString()
      };

      onAddExamAttempt(savedAttempt);
      setGradedResult({
        score: scorePct,
        passed,
        feedback: feedbackText,
        results: examQuestions.map(q => ({
          questionId: q.id,
          questionText: q.questionText,
          correct: examAnswers[q.id] === q.correctOptionIndex,
          userAnswer: examAnswers[q.id] !== undefined ? q.options[examAnswers[q.id]] : 'None',
          correctAnswer: q.options[q.correctOptionIndex],
          explanation: q.explanation
        }))
      });
      setIsExamGrading(false);
    }
  };

  // Close exam portal
  const closeExamPortal = () => {
    if (examTimerInterval) clearInterval(examTimerInterval);
    setTakingExamCourse(null);
    setExamQuestions([]);
    setExamAnswers({});
    setGradedResult(null);
    setShowGradedDetails(false);
  };

  // Filtered Instructor Classes
  const instructorClasses = classes
    .filter((cls) => cls.instructorId === currentInstructor?.id)
    .filter((cls) => {
      if (classFilter === 'All') return true;
      return cls.status === classFilter;
    });

  // Render Formatted Slide
  const renderSlideContent = (content: string, index: number) => {
    const slides = content.split('\n');
    const slideText = slides[index] || slides[0] || 'End of slide deck.';
    return (
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-8 h-64 flex flex-col justify-center text-center shadow-lg select-none relative overflow-hidden">
        <div className="absolute top-3 left-4 text-[10px] text-red-400 uppercase tracking-widest font-extrabold">Slide {index + 1} of {slides.length}</div>
        <div className="absolute top-3 right-4 text-[10px] text-slate-500">View-Only presentation</div>
        <p className="text-sm font-bold leading-relaxed max-w-lg mx-auto">{slideText}</p>
        <div className="absolute bottom-3 left-0 right-0 text-[8px] text-slate-600 font-bold tracking-widest uppercase">
          New Horizons Training Centers • Secure Slide Deck
        </div>
      </div>
    );
  };

  // Authentication Required Screen
  if (!currentInstructor) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* LOGIN AND REGISTER FORMS */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-red-200">
              NH
            </div>
            <h3 className="text-lg font-bold font-display text-slate-900">Authorized Instructor Portal</h3>
            <p className="text-xs text-slate-400 mt-1">Please enter your registered center email to unlock operations</p>
          </div>

          {loginError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {!isRegistering ? (
            /* LOGIN SCREEN */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Center Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="instructor@newhorizons.com"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Authenticate Account
              </button>

              <div className="border-t border-slate-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setLoginError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Create Instructor Account
                </button>
              </div>
            </form>
          ) : (
            /* REGISTRATION SCREEN */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="Chidi"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="Eze"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Approved Center Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. eze@newhorizons.com"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Center Base</label>
                  <select
                    value={regCenter}
                    required
                    onChange={(e) => setRegCenter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">Select center...</option>
                    {config.centers.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course syllabus checkboxes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Approved Syllabus Credentials</label>
                <p className="text-[10px] text-slate-400 mb-2">Select courses you are certified or scheduled to lead.</p>
                <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1 bg-slate-50/50">
                  {config.courses.flatMap((cat) => cat.items).map((courseName) => {
                    const checked = regSelectedCourses.includes(courseName);
                    return (
                      <button
                        key={courseName}
                        type="button"
                        onClick={() => toggleCourseApproval(courseName)}
                        className="flex items-center gap-2 text-left text-xs w-full p-1 hover:bg-white rounded"
                      >
                        {checked ? <CheckSquare className="w-3.5 h-3.5 text-red-500" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                        <span className="text-slate-700">{courseName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow cursor-pointer transition-colors"
              >
                Register Instructor Profile
              </button>

              <div className="border-t border-slate-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setLoginError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---- RENDER LOGGED IN INSTRUCTOR PORTAL ----
  return (
    <div className="space-y-8">
      {/* HEADER PORTAL BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
              Staff Workspace
            </span>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              {currentInstructor.center} Center
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-2">
            Welcome, {currentInstructor.firstName} {currentInstructor.lastName}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Access secure syllabus teaching decks, record log compilations, and verify curriculum competency evaluation statuses
          </p>
        </div>

        {/* WORKSPACE TAB SWITCHERS */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto shadow-inner">
          <button
            onClick={() => setPortalTab('classes')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              portalTab === 'classes' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Classes
          </button>
          <button
            onClick={() => setPortalTab('curriculum')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              portalTab === 'curriculum' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Syllabus Study Hub
          </button>
          <button
            onClick={() => setPortalTab('competency')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              portalTab === 'competency' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            AI Evaluations
          </button>
        </div>

        <button
          onClick={onLogout}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {classSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>{classSuccessMessage}</span>
        </div>
      )}

      {/* CORE PORTAL TAB VIEWS */}
      <AnimatePresence mode="wait">
        {/* TAB 1: CLASSES WORKSPACE (CRUD & LOG COMPLIANCE) */}
        {portalTab === 'classes' && (
          <motion.div
            key="workspace-classes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Class Operations Control Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 border border-slate-200 rounded-xl gap-4 shadow-sm">
              <div className="flex gap-2">
                {['Active', 'Completed', 'All'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setClassFilter(filter as any)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
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
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Classroom Setup
                </button>
              )}
            </div>

            {/* CLASS CREATOR/EDITOR PANEL */}
            {showAddClass && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-md"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {classFormMode === 'create' ? 'Create New Training Classroom Setup' : 'Edit Classroom Setup'}
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
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
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
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
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
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Session Type</label>
                      <select
                        value={newScheduleType}
                        onChange={(e) => setNewScheduleType(e.target.value as any)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
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
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
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
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          required
                          value={newEndDate}
                          onChange={(e) => setNewEndDate(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
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
                            className={`px-3 py-1 rounded text-xs transition-all border ${
                              active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {classFormMode === 'create' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus Modules (One module per line)</label>
                      <p className="text-[10px] text-slate-400 mb-2">Create the checklist structure to map weekly log coverage metrics.</p>
                      <textarea
                        rows={3}
                        required
                        value={newModulesText}
                        onChange={(e) => setNewModulesText(e.target.value)}
                        placeholder="Module 1: Topic Introduction&#10;Module 2: Exercises & Setup&#10;Module 3: Project Assessments"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Classroom Setup
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddClass(false);
                        setEditingClassId(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* WEEKLY COMPLIANCE LOGGING MODAL */}
            {selectedClassForLog && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-2 border-red-500 rounded-2xl p-6 shadow-xl space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9px] text-red-500 font-bold uppercase block">New Horizons Operations</span>
                    <h4 className="font-bold text-slate-900 text-sm">Log Class compliance & Syllabus Coverage</h4>
                  </div>
                  <button
                    onClick={() => setSelectedClassForLog(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {logError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
                    {logError}
                  </div>
                )}
                {logSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
                    {logSuccessMessage}
                  </div>
                )}

                <form onSubmit={handleWeeklyLogSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Class Course</span>
                      <span className="text-xs font-bold text-slate-700">{selectedClassForLog.courseName}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Next Report Week</span>
                      <span className="text-xs font-black text-red-600">
                        Week {logs.filter((l) => l.classId === selectedClassForLog.id).length + 1}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Instruction Hours This Week</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={40}
                      value={logHours}
                      onChange={(e) => setLogHours(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus Covered items This Week</label>
                    <p className="text-[10px] text-slate-400 mb-2">Check modules covered during this week's classes:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                      {selectedClassForLog.modules.map((mod) => {
                        const checked = logModulesCovered.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            disabled={mod.done}
                            onClick={() => toggleLogModule(mod.id)}
                            className={`w-full text-left p-2 rounded text-xs flex items-center justify-between border ${
                              mod.done ? 'bg-slate-100 text-slate-400 border-slate-200' :
                              checked ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-semibold">{mod.name}</span>
                            {mod.done ? (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">Already Covered</span>
                            ) : checked ? (
                              <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-black">✓ Log Covering</span>
                            ) : (
                              <span className="text-[10px] border border-slate-300 text-slate-400 px-2 py-0.5 rounded bg-white">Not covered</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lab Issues, Blockers & Classroom Challenges</label>
                    <textarea
                      rows={2}
                      value={logChallenges}
                      onChange={(e) => setLogChallenges(e.target.value)}
                      placeholder="e.g., Lab machine VM 3 crashed on Wednesday. Pacing was slightly adjusted."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-colors"
                  >
                    Submit Classroom Compliance Report
                  </button>
                </form>
              </motion.div>
            )}

            {/* CLASSROOM SETUP LISTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructorClasses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 col-span-full">
                  No classroom operations defined under chosen filter. Add one or modify filters.
                </div>
              ) : (
                instructorClasses.map((cls) => {
                  const done = cls.modules.filter((m) => m.done).length;
                  const total = cls.modules.length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const previousFiledLogs = logs.filter((l) => l.classId === cls.id);

                  return (
                    <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {cls.scheduleType} • {cls.timeSlot}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{cls.id}</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 font-display text-sm leading-snug">{cls.courseName}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Location: <strong className="text-slate-600">{cls.classroom}</strong></span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Term: <strong className="text-slate-600">{cls.startDate || 'N/A'}</strong> to <strong className="text-slate-600">{cls.endDate || 'N/A'}</strong></span>
                        </div>

                        {/* Checklist progress bar */}
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Syllabus Compliance</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                            <span>{done} of {total} items checked</span>
                            <span>{cls.totalDurationHours} total syllabus hours</span>
                          </div>
                        </div>

                        {/* Logs tally */}
                        <div className="text-[10px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-500 flex justify-between items-center">
                          <span>Weeks Filed: <strong>{previousFiledLogs.length} reports</strong></span>
                          <span>Total Hours Logged: <strong>{previousFiledLogs.reduce((sum, l) => sum + l.hoursLogged, 0)} hrs</strong></span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        {cls.status === 'Active' && (
                          <button
                            onClick={() => openWeeklyLogForm(cls)}
                            className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] rounded-lg shadow cursor-pointer text-center flex items-center justify-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" /> File Weekly log
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClassClick(cls)}
                          className="px-2 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg"
                          title="Edit Class"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete class ${cls.id}? All compliance logs associated will be orphaned.`)) {
                              onDeleteClass(cls.id);
                              setClassSuccessMessage('Class deleted successfully!');
                              setTimeout(() => setClassSuccessMessage(''), 2500);
                            }
                          }}
                          className="px-2 py-1.5 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"
                          title="Delete Class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: SECURE CURRICULUM SYLLABUS STUDY HUB (READ/PLAY/VIEW ONLY) */}
        {portalTab === 'curriculum' && (
          <motion.div
            key="workspace-curriculum"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-red-500" />
                Approved Training Syllabus & Study Hub
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Access slides, PDF reference manuals, and video lectures per lesson. Per operations standards, these materials are secured for online learning and cannot be downloaded.
              </p>
            </div>

            {/* CURRICULUMS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {course.category}
                    </span>
                    <h4 className="font-bold font-display text-slate-900 text-sm mt-2">{course.name}</h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">{course.description}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Course Lessons ({course.lessons?.length || 0})</span>
                    
                    {(!course.lessons || course.lessons.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No syllabus lessons drafted yet for this curriculum.</p>
                    ) : (
                      <div className="space-y-2">
                        {course.lessons.map((lesson, idx) => (
                          <div key={lesson.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                            <span className="text-[10px] font-extrabold text-slate-800">Unit {idx + 1}: {lesson.title}</span>
                            <p className="text-[11px] text-slate-500 leading-normal">{lesson.description}</p>
                            
                            {/* Materials play / read buttons */}
                            {lesson.resources && lesson.resources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100/50">
                                {lesson.resources.map((res) => (
                                  <button
                                    key={res.id}
                                    onClick={() => handleOpenResource(res, lesson.title)}
                                    className="px-2.5 py-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {res.type === 'slides' && <><BookOpen className="w-3 h-3 text-amber-500" /> Read Slides</>}
                                    {res.type === 'pdf' && <><FileText className="w-3 h-3 text-red-500" /> Read Manual</>}
                                    {res.type === 'video' && <><Play className="w-3 h-3 text-emerald-500" /> Play Lecture</>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* SECURE LIGHTBOX VIEW-ONLY OVERLAY */}
            <AnimatePresence>
              {activeResource && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 select-none"
                    onContextMenu={(e) => e.preventDefault()} // Disable right click
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] text-red-500 font-black tracking-widest uppercase">New Horizons Secure Hub • View-Only</span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">{activeResource.name}</h4>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Lesson Unit: {activeResourceLesson}</span>
                      </div>
                      <button
                        onClick={() => setActiveResource(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 border border-slate-200 rounded"
                      >
                        Exit Secure Reader
                      </button>
                    </div>

                    {/* RESOURCE DISPLAY BASED ON TYPE */}
                    {activeResource.type === 'slides' && (
                      <div className="space-y-4">
                        {renderSlideContent(activeResource.content || '', currentSlideIndex)}
                        
                        <div className="flex justify-between items-center">
                          <button
                            disabled={currentSlideIndex === 0}
                            onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            ← Previous Slide
                          </button>
                          <span className="text-xs text-slate-500 font-medium">
                            Slide {currentSlideIndex + 1} of {activeResource.content?.split('\n').length || 1}
                          </span>
                          <button
                            disabled={currentSlideIndex === (activeResource.content?.split('\n').length || 1) - 1}
                            onClick={() => setCurrentSlideIndex(prev => Math.min((activeResource.content?.split('\n').length || 1) - 1, prev + 1))}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Next Slide →
                          </button>
                        </div>
                      </div>
                    )}

                    {activeResource.type === 'pdf' && (
                      <div className="relative bg-amber-50/20 border border-amber-100/50 rounded-xl p-6 h-64 overflow-y-auto font-serif text-slate-800 leading-relaxed text-xs shadow-inner relative select-none">
                        {/* secure watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                          <div className="text-black font-black text-4xl -rotate-45 leading-none">
                            NH CLC CONFIDENTIAL
                          </div>
                        </div>
                        <p className="mb-4 whitespace-pre-wrap">{activeResource.content || 'Secure study guide details.'}</p>
                      </div>
                    )}

                    {activeResource.type === 'video' && (
                      <div className="space-y-4">
                        {/* Simulated HTML5 secure video player */}
                        <div className="bg-slate-950 rounded-xl h-48 flex flex-col items-center justify-center text-white relative shadow-inner overflow-hidden select-none">
                          <div className="absolute top-2.5 left-3 text-[9px] text-emerald-400 font-bold uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                            Simulated Secure Stream
                          </div>
                          
                          {/* Central Play/Pause button */}
                          <button
                            type="button"
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                            className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg relative z-10"
                          >
                            {isVideoPlaying ? (
                              <div className="flex gap-1 justify-center items-center h-full">
                                <span className="w-1.5 h-4 bg-white rounded-sm"></span>
                                <span className="w-1.5 h-4 bg-white rounded-sm"></span>
                              </div>
                            ) : (
                              <Play className="w-5 h-5 ml-1 fill-white" />
                            )}
                          </button>

                          {/* Video progress controls bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2.5 flex items-center justify-between gap-3 text-[10px]">
                            <span className="font-semibold">{isVideoPlaying ? 'PLAYING' : 'PAUSED'}</span>
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${videoPlaybackProgress}%` }} />
                            </div>
                            <span className="font-mono">{Math.round(videoPlaybackProgress / 10)}:00 / 10:00</span>
                            <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>

                        {/* Transcript detail */}
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-xs text-slate-600">
                          <strong className="text-slate-800 block mb-1">Lecture Script & Study Outline:</strong>
                          <p className="italic">"{activeResource.content || 'Transcript data.'}"</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                      <span>Watermark: PROPRIETARY CONTENT</span>
                      <span className="font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">DOWNLOADS STRICTLY DISABLED</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* TAB 3: INSTRUCTOR COMPETENCY EVALUATION PORTAL (MCQ ASSESSMENTS) */}
        {portalTab === 'competency' && (
          <motion.div
            key="workspace-competency"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4 text-red-500" />
                Instructor Curriculum Competency Evaluations
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                To instruct any New Horizons course, you must undergo a Gemini AI-generated competency assessment. Pass mark is strictly **70%**. You have a maximum of **2 attempts / trials** per course.
              </p>
            </div>

            {/* COMPETENCY METRIC PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => {
                // Find previous attempts
                const courseAttempts = examAttempts.filter(
                  a => a.instructorId === currentInstructor.id && a.courseName === course.name
                );
                const hasPassed = courseAttempts.some(a => a.passed);
                const isLocked = courseAttempts.length >= 2 && !hasPassed;
                const attemptsRemaining = 2 - courseAttempts.length;

                return (
                  <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wide">{course.category}</span>
                        {hasPassed ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> COMPETENT CERTIFIED
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1 animate-pulse">
                            <Lock className="w-3 h-3" /> TRIALS EXHAUSTED (LOCKED)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                            EVALUATION REQUIRED
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 font-display text-sm">{course.name}</h4>
                      <p className="text-slate-500 text-xs line-clamp-2">{course.description}</p>
                      
                      {/* Attempts Log */}
                      {courseAttempts.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[10px] text-slate-500">
                          <span className="font-extrabold uppercase block tracking-wider text-slate-400">Your Attempt History:</span>
                          {courseAttempts.map((att, attIdx) => (
                            <div key={att.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                              <span>Trial {att.trialNumber} Score: <strong>{att.score}%</strong></span>
                              <span className={att.passed ? 'text-emerald-600 font-extrabold' : 'text-red-500 font-semibold'}>
                                {att.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-4">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Attempts remaining: <strong className="text-slate-700">{attemptsRemaining} of 2</strong>
                      </span>
                      
                      {hasPassed ? (
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Credentials Certified
                        </div>
                      ) : isLocked ? (
                        <div className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4" /> Locked from Syllabus
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartExam(course)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          {courseAttempts.length === 1 ? 'Take Retake Evaluation' : 'Begin Competency Exam'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTIVE EXAMINATION OVERLAY */}
            <AnimatePresence>
              {takingExamCourse && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto p-4 md:p-8 flex items-center justify-center text-white select-none"
                >
                  <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                    {/* Header status bar */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <div>
                        <span className="text-[10px] text-red-500 font-black tracking-widest uppercase block">New Horizons Exam Center</span>
                        <h4 className="font-extrabold text-white text-base font-display mt-1">Syllabus Competency Assessment</h4>
                        <span className="text-xs text-slate-400 mt-0.5 block">Course: {takingExamCourse.name}</span>
                      </div>
                      
                      {!isExamLoading && !gradedResult && !isExamGrading && (
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 font-bold block">EVALUATION COUNTDOWN</span>
                          <span className="font-mono text-lg font-black text-red-400">
                            {Math.floor(examTimer / 60)}:{(examTimer % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* LOADING SPIN STATE */}
                    {isExamLoading && (
                      <div className="py-16 text-center space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                        <div>
                          <p className="font-bold text-slate-200">AI Evaluator is formulating evaluation items...</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Gemini is analyzing the course lessons and drafting 10 objective MCQs to test subject and pedagogical competence.</p>
                        </div>
                      </div>
                    )}

                    {examLoadError && (
                      <div className="py-12 text-center space-y-4">
                        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
                        <div>
                          <p className="font-bold text-red-400">Failed to compile evaluation</p>
                          <p className="text-xs text-slate-500 mt-1">{examLoadError}</p>
                        </div>
                        <button onClick={closeExamPortal} className="px-4 py-2 bg-slate-800 rounded text-xs">Close Exam Portal</button>
                      </div>
                    )}

                    {/* GRADING LOG SPIN STATE */}
                    {isExamGrading && (
                      <div className="py-16 text-center space-y-4">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                        <div>
                          <p className="font-bold text-slate-200">AI Assessor is grading evaluation answers...</p>
                          <p className="text-xs text-slate-500 mt-1">Evaluating choices, tracking pass thresholds, and generating professional instructor tutoring logs...</p>
                        </div>
                      </div>
                    )}

                    {/* EXAM QUESTIONS PANEL */}
                    {!isExamLoading && !isExamGrading && !gradedResult && examQuestions.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Questions index navigator */}
                        <div className="md:col-span-3 space-y-4">
                          <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Evaluation Index</span>
                          <div className="grid grid-cols-5 gap-2">
                            {examQuestions.map((q, idx) => {
                              const answered = examAnswers[q.id] !== undefined;
                              return (
                                <div
                                  key={q.id}
                                  className={`w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${
                                    answered ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-2 leading-relaxed">
                            <p>✓ Strictly <strong>70%</strong> score required to pass.</p>
                            <p>✓ All questions are objective MCQs based on training slides and lab diagnostic structures.</p>
                          </div>
                        </div>

                        {/* Questions list display area */}
                        <div className="md:col-span-9 space-y-6 max-h-96 overflow-y-auto pr-2">
                          {examQuestions.map((q, idx) => (
                            <div key={q.id} className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                              <span className="text-[10px] text-red-400 font-extrabold uppercase">QUESTION {idx + 1} OF {examQuestions.length}</span>
                              <p className="text-xs font-bold leading-relaxed text-slate-200">{q.questionText}</p>
                              
                              {/* Option selection buttons */}
                              <div className="space-y-2">
                                {q.options.map((opt: string, optIdx: number) => {
                                  const selected = examAnswers[q.id] === optIdx;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setExamAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                      className={`w-full p-3.5 rounded-xl text-left text-xs transition-all border flex items-center gap-3 ${
                                        selected 
                                          ? 'bg-indigo-600/20 text-white border-indigo-500 font-bold shadow-md shadow-indigo-600/5' 
                                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        selected ? 'border-indigo-400 bg-indigo-500 text-[9px] text-white font-extrabold' : 'border-slate-600'
                                      }`}>
                                        {selected && '•'}
                                      </div>
                                      <span>{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={handleManualSubmitExam}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <BookmarkCheck className="w-4 h-4" /> Submit Answers for AI Assessment
                          </button>
                        </div>
                      </div>
                    )}

                    {/* EVALUATION COMPLETED GRADING REPORT VIEW */}
                    {gradedResult && (
                      <div className="space-y-6">
                        <div className="text-center py-6 space-y-3">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto border-2 ${
                            gradedResult.passed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'bg-red-500/20 text-red-400 border-red-500'
                          }`}>
                            {gradedResult.passed ? '✓' : '✗'}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-lg font-display">
                              {gradedResult.passed ? 'Evaluation Passed!' : 'Evaluation Not Passed'}
                            </h5>
                            <span className="text-slate-400 text-xs">Evaluator score: <strong className="text-white font-black text-sm">{gradedResult.score}%</strong> (Pass mark: 70%)</span>
                          </div>
                        </div>

                        {/* AI FEEDBACK LOG CARD */}
                        <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-5 space-y-2">
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">AI Evaluation Assessor feedback</span>
                          <p className="text-xs text-slate-300 italic leading-relaxed font-sans">"{gradedResult.feedback}"</p>
                        </div>

                        {/* Review question details button */}
                        <div className="text-center">
                          <button
                            onClick={() => setShowGradedDetails(!showGradedDetails)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto"
                          >
                            {showGradedDetails ? 'Hide Answer Keys' : 'Review Graded Answer Keys'}
                          </button>
                        </div>

                        {showGradedDetails && (
                          <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                            {gradedResult.results.map((res: any, idx: number) => (
                              <div key={res.questionId} className={`p-4 rounded-xl border ${
                                res.correct ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'
                              } space-y-2`}>
                                <div className="flex justify-between items-center text-[10px] font-extrabold">
                                  <span className="uppercase text-slate-400">QUESTION {idx + 1}</span>
                                  <span className={res.correct ? 'text-emerald-400' : 'text-red-400'}>
                                    {res.correct ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-200">{res.questionText}</p>
                                <div className="text-xs space-y-1">
                                  <p className="text-slate-400">Your choice: <strong className={res.correct ? 'text-emerald-400' : 'text-red-400'}>{res.userAnswer}</strong></p>
                                  {!res.correct && <p className="text-slate-400">Correct choice: <strong className="text-emerald-400">{res.correctAnswer}</strong></p>}
                                </div>
                                <div className="bg-black/20 p-2.5 rounded text-[11px] text-slate-400">
                                  <strong>Assessor Explanation:</strong> {res.explanation}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={closeExamPortal}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Conclude Evaluation
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
