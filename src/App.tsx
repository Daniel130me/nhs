import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { Instructor, Class, WeeklyLog, StudentSurvey as IStudentSurvey, SystemConfig, Course, ExamAttempt } from './types';
import { DEFAULT_CONFIG, SEED_INSTRUCTORS, SEED_CLASSES, SEED_LOGS, SEED_SURVEYS } from './data/seedData';
import StudentSurvey from './components/StudentSurvey';
import InstructorPortal from './components/InstructorPortal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // ---- BROWSER PERSISTENT STATES (HYDRATED FROM NEON POSTGRES) ----
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [instructors, setInstructors] = useState<Instructor[]>(SEED_INSTRUCTORS);
  const [classes, setClasses] = useState<Class[]>(SEED_CLASSES);
  const [logs, setLogs] = useState<WeeklyLog[]>(SEED_LOGS);
  const [surveys, setSurveys] = useState<IStudentSurvey[]>(SEED_SURVEYS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Session state (Instructor Portal authentication)
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(() => {
    const saved = sessionStorage.getItem('nh_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Main UI Tab Router: 'Student' or 'Portal'
  const [mainTab, setMainTab] = useState<'Student' | 'Portal'>('Student');

  // ---- NEON DB INITIAL RE-HYDRATION ----
  useEffect(() => {
    async function loadNeonState() {
      try {
        console.log("[App] Hydrating operational states from Neon Postgres server API...");
        const [configRes, instRes, classesRes, logsRes, surveysRes, coursesRes, examAttemptsRes] = await Promise.all([
          fetch("/api/config").then((r) => (r.ok ? r.json() : DEFAULT_CONFIG)),
          fetch("/api/instructors").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/classes").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/logs").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/surveys").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/courses").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/exam-attempts").then((r) => (r.ok ? r.json() : []))
        ]);

        if (configRes && configRes.centers) setConfig(configRes);
        if (instRes && instRes.length > 0) setInstructors(instRes);
        if (classesRes && classesRes.length > 0) setClasses(classesRes);
        if (logsRes && logsRes.length > 0) setLogs(logsRes);
        if (surveysRes && surveysRes.length > 0) setSurveys(surveysRes);
        if (coursesRes && coursesRes.length > 0) setCourses(coursesRes);
        if (examAttemptsRes && examAttemptsRes.length > 0) setExamAttempts(examAttemptsRes);
      } catch (err) {
        console.error("Neon Postgres synchronization failed. Standard memory cache used.", err);
      } finally {
        setIsDbLoading(false);
      }
    }
    loadNeonState();
  }, []);

  // ---- PORTAL AUTHENTICATION ACTIONS ----
  const handleLogin = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        const found = await response.json();
        setCurrentInstructor(found);
        sessionStorage.setItem('nh_session', JSON.stringify(found));
        setInstructors((prev) => {
          if (!prev.some((inst) => inst.id === found.id)) {
            return [...prev, found];
          }
          return prev.map((inst) => (inst.id === found.id ? found : inst));
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login failure:", err);
      return false;
    }
  };

  const handleLogout = () => {
    setCurrentInstructor(null);
    sessionStorage.removeItem('nh_session');
  };

  const handleRegister = async (newInst: Omit<Instructor, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInst)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register profile");
      }
      const registered = await response.json();
      setInstructors((prev) => [...prev, registered]);
      setCurrentInstructor(registered);
      sessionStorage.setItem('nh_session', JSON.stringify(registered));
    } catch (err) {
      console.error("Failed to persist instructor in Neon database:", err);
      throw err;
    }
  };

  // ---- INSTRUCTOR & ADMIN CLASS OPERATIONS ----
  const handleCreateClass = async (
    newClass: Omit<Class, 'id' | 'instructorId' | 'instructorName' | 'createdAt'>
  ) => {
    if (!currentInstructor) return;
    const id = `class-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const created: Class = {
      ...newClass,
      id,
      instructorId: currentInstructor.id,
      instructorName: `${currentInstructor.firstName} ${currentInstructor.lastName}`,
      createdAt
    };

    setClasses((prev) => [...prev, created]);

    try {
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch (err) {
      console.error("Failed to persist class in Neon DB:", err);
    }
  };

  const handleCreateClassForAdmin = async (
    newClass: Omit<Class, 'id' | 'createdAt'>
  ) => {
    const id = `class-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const created: Class = {
      ...newClass,
      id,
      createdAt
    };

    setClasses((prev) => [...prev, created]);

    try {
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch (err) {
      console.error("Failed to persist class as Admin in Neon DB:", err);
    }
  };

  const handleEditClass = async (updatedClass: Class) => {
    setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)));

    try {
      await fetch(`/api/classes/${updatedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClass)
      });
    } catch (err) {
      console.error("Failed to save class modifications in Neon DB:", err);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));

    try {
      await fetch(`/api/classes/${classId}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Failed to delete class from Neon DB:", err);
    }
  };

  const handleSubmitLog = (
    newLog: Omit<WeeklyLog, 'id' | 'submittedAt' | 'instructorId'>
  ): { ok: boolean; error?: string } => {
    if (!currentInstructor) return { ok: false, error: 'Unauthorized session' };

    // 1. Idempotency Check
    const exists = logs.some(
      (l) => l.classId === newLog.classId && l.weekNumber === newLog.weekNumber
    );
    if (exists) {
      return {
        ok: false,
        error: `Duplicate Submission: Week ${newLog.weekNumber} has already been logged for this class.`
      };
    }

    // 2. Cumulative Hours Validation
    const matchedClass = classes.find((c) => c.id === newLog.classId);
    if (matchedClass) {
      const prevClassLogs = logs.filter((l) => l.classId === newLog.classId);
      const cumulativeHours = prevClassLogs.reduce((sum, l) => sum + l.hoursLogged, 0);
      const prospectiveHours = cumulativeHours + newLog.hoursLogged;

      if (prospectiveHours > matchedClass.totalDurationHours) {
        console.warn('Hours exceed totalDurationHours, allowing with administrative warning.');
      }
    }

    // 3. Create log row
    const id = `log-${Date.now()}`;
    const log: WeeklyLog = {
      ...newLog,
      id,
      instructorId: currentInstructor.id,
      submittedAt: new Date().toISOString()
    };

    // 4. Update parent class checklist & progress
    let updatedClassObj: Class | null = null;
    setClasses((prevClasses) =>
      prevClasses.map((cls) => {
        if (cls.id === newLog.classId) {
          const updatedModules = cls.modules.map((mod) => {
            if (newLog.modulesCoveredThisWeek.includes(mod.id)) {
              return { ...mod, done: true };
            }
            return mod;
          });

          const allDone = updatedModules.every((m) => m.done);
          updatedClassObj = {
            ...cls,
            modules: updatedModules,
            status: allDone ? 'Completed' : cls.status
          };
          return updatedClassObj;
        }
        return cls;
      })
    );

    setLogs((prev) => [...prev, log]);

    // Async save to Neon Postgres
    async function persistLog() {
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(log)
        });

        if (updatedClassObj) {
          await fetch(`/api/classes/${newLog.classId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedClassObj)
          });
        }
      } catch (err) {
        console.error("Failed to persist weekly log in Neon DB:", err);
      }
    }
    persistLog();

    return { ok: true };
  };

  // ---- STUDENT SURVEY ACTION ----
  const handleSurveySubmit = async (surveyData: Omit<IStudentSurvey, 'id' | 'submittedAt'>) => {
    const id = `survey-${Date.now()}`;
    const submittedAt = new Date().toISOString();
    const newSurvey: IStudentSurvey = {
      ...surveyData,
      id,
      submittedAt
    };
    setSurveys((prev) => [...prev, newSurvey]);

    try {
      await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSurvey)
      });
    } catch (err) {
      console.error("Failed to submit student pulse survey to Neon DB:", err);
    }
  };

  // ---- ADMINISTRATION CONFIG & COURSE ACTIONS ----
  const handleAddCenter = async (center: string) => {
    const updatedConfig = {
      ...config,
      centers: [...config.centers, center]
    };
    setConfig(updatedConfig);

    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
    } catch (err) {
      console.error("Failed to update centers configuration in Neon DB:", err);
    }
  };

  const handleAddCourse = async (category: string, courseName: string) => {
    let updatedConfig = { ...config };
    const exists = config.courses.find((c) => c.category === category);
    if (exists) {
      updatedConfig = {
        ...config,
        courses: config.courses.map((c) => {
          if (c.category === category) {
            return { ...c, items: c.items.includes(courseName) ? c.items : [...c.items, courseName] };
          }
          return c;
        })
      };
    } else {
      updatedConfig = {
        ...config,
        courses: [...config.courses, { category, items: [courseName] }]
      };
    }
    setConfig(updatedConfig);

    // Mirror to rich courses
    const richId = `course-${courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newRichObj: Course = {
      id: richId,
      name: courseName,
      category,
      description: `Standard curriculum details for ${courseName}.`,
      lessons: [],
      createdAt: new Date().toISOString()
    };

    setCourses((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === courseName.toLowerCase());
      if (exists) return prev;
      return [...prev, newRichObj];
    });

    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });

      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRichObj)
      });
    } catch (err) {
      console.error("Failed to persist custom course item configuration:", err);
    }
  };

  const handleCreateCourseRich = async (newCourse: Course) => {
    setCourses((prev) => [...prev, newCourse]);

    let updatedConfig = { ...config };
    const categoryExists = config.courses.find((c) => c.category === newCourse.category);
    if (categoryExists) {
      updatedConfig = {
        ...config,
        courses: config.courses.map((c) => {
          if (c.category === newCourse.category) {
            const items = c.items.includes(newCourse.name) ? c.items : [...c.items, newCourse.name];
            return { ...c, items };
          }
          return c;
        })
      };
    } else {
      updatedConfig = {
        ...config,
        courses: [...config.courses, { category: newCourse.category, items: [newCourse.name] }]
      };
    }
    setConfig(updatedConfig);

    try {
      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse)
      });

      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
    } catch (err) {
      console.error("Failed to save authored course curriculum in Neon DB:", err);
    }
  };

  const handleEditCourseRich = async (updatedCourse: Course) => {
    const previousCourse = courses.find((c) => c.id === updatedCourse.id);
    setCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));

    let updatedConfig = { ...config };
    if (previousCourse) {
      updatedConfig = {
        ...config,
        courses: config.courses.map((c) => {
          const filteredItems = c.items.filter((item) => item !== previousCourse.name);
          if (c.category === updatedCourse.category) {
            return { ...c, items: [...filteredItems, updatedCourse.name] };
          }
          return { ...c, items: filteredItems };
        }).filter((c) => c.items.length > 0 || c.category === updatedCourse.category)
      };
      setConfig(updatedConfig);
    }

    try {
      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCourse)
      });

      if (previousCourse) {
        await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig)
        });
      }
    } catch (err) {
      console.error("Failed to update authored curriculum in Neon DB:", err);
    }
  };

  const handleDeleteCourseRich = async (courseId: string) => {
    const toDelete = courses.find((c) => c.id === courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));

    let updatedConfig = { ...config };
    if (toDelete) {
      updatedConfig = {
        ...config,
        courses: config.courses.map((c) => {
          if (c.category === toDelete.category) {
            return { ...c, items: c.items.filter((item) => item !== toDelete.name) };
          }
          return c;
        }).filter((c) => c.items.length > 0)
      };
      setConfig(updatedConfig);
    }

    try {
      await fetch(`/api/courses/${courseId}`, {
        method: "DELETE"
      });

      if (toDelete) {
        await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig)
        });
      }
    } catch (err) {
      console.error("Failed to delete curriculum in Neon DB:", err);
    }
  };

  const handleAddExamAttempt = async (attempt: ExamAttempt) => {
    setExamAttempts((prev) => [...prev, attempt]);

    try {
      await fetch("/api/exam-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt)
      });
    } catch (err) {
      console.error("Failed to record competency exam attempt in Neon DB:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* GLOBAL BANNER HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 py-3 px-6 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-extrabold text-sm tracking-wider shadow-md">
              NH
            </div>
            <div>
              <h1 className="font-display font-extrabold text-white text-sm tracking-wider uppercase leading-none">
                New Horizons
              </h1>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 leading-none">
                Computer Learning Centers • Operations Portal
              </span>
            </div>
          </div>

          {/* APP SWITCH ROUTERS */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 shadow-inner">
            <button
              onClick={() => setMainTab('Student')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                mainTab === 'Student'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Student Feedback Form
            </button>
            <button
              onClick={() => setMainTab('Portal')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                mainTab === 'Portal'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Staff Portal
            </button>
          </div>
        </div>
      </header>

      {/* COMPACT HELP NOTICE */}
      <div className="bg-slate-100 border-b border-slate-200 py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Explore the system with seed logins. Use **instructor@newhorizons.com** for Instructor tools, and **admin@newhorizons.com** for Director Analytics.
            </span>
          </div>
          <div className="hidden md:flex gap-4">
            <span>Centers: {config.centers.length}</span>
            <span>Total Surveys: {surveys.length}</span>
          </div>
        </div>
      </div>

      {/* CORE VIEW BODY CONTAINER */}
      <main className="flex-grow flex flex-col justify-center">
        {isDbLoading ? (
          /* PRE-HYDRATION SKELETON / SPINNER */
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <div className="text-center">
              <h3 className="font-extrabold text-sm text-slate-700 tracking-wide">Syncing with Neon Postgres...</h3>
              <p className="text-xs text-slate-400 mt-1">Hydrating student pulse surveys, active classes, and authored syllabi</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {mainTab === 'Student' ? (
              /* PUBLIC STUDENT SURVEY ROUTE */
              <motion.div
                key="student-survey"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <StudentSurvey config={config} onSurveySubmit={handleSurveySubmit} />
              </motion.div>
            ) : (
              /* STAFF PORTAL ROUTE (INSTRUCTOR OR ADMIN) */
              <motion.div
                key="staff-portal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto py-10 px-6 space-y-8 w-full"
              >
                {currentInstructor && currentInstructor.role === 'Admin' ? (
                  /* ADMIN VIEW */
                  <div className="space-y-10">
                    {/* ADMIN DIRECTED ACTION HEADER */}
                    <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div>
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Authorized System Role</span>
                        <h3 className="font-bold text-slate-900 text-sm mt-0.5">Admin Session: {currentInstructor.firstName}</h3>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        Logout Session
                      </button>
                    </div>

                    <AdminDashboard
                      config={config}
                      instructors={instructors}
                      classes={classes}
                      logs={logs}
                      surveys={surveys}
                      courses={courses}
                      examAttempts={examAttempts}
                      onAddCenter={handleAddCenter}
                      onAddCourse={handleAddCourse}
                      onCreateClass={handleCreateClassForAdmin}
                      onEditClass={handleEditClass}
                      onDeleteClass={handleDeleteClass}
                      onCreateCourseRich={handleCreateCourseRich}
                      onEditCourseRich={handleEditCourseRich}
                      onDeleteCourseRich={handleDeleteCourseRich}
                    />
                  </div>
                ) : (
                  /* INSTRUCTOR VIEW (OR LOGIN) */
                  <InstructorPortal
                    config={config}
                    instructors={instructors}
                    classes={classes}
                    logs={logs}
                    courses={courses}
                    examAttempts={examAttempts}
                    onAddExamAttempt={handleAddExamAttempt}
                    currentInstructor={currentInstructor}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onRegister={handleRegister}
                    onCreateClass={handleCreateClass}
                    onEditClass={handleEditClass}
                    onDeleteClass={handleDeleteClass}
                    onSubmitLog={handleSubmitLog}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* OPERATIONS FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 shrink-0 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <p>© 2026 New Horizons Computer Learning Centers. All rights reserved.</p>
          <div className="flex gap-4 font-semibold text-slate-500">
            <button onClick={() => setMainTab('Student')} className="hover:text-slate-800 cursor-pointer">
              Student Pulse Survey
            </button>
            <span>•</span>
            <button onClick={() => setMainTab('Portal')} className="hover:text-slate-800 cursor-pointer">
              Operations Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
