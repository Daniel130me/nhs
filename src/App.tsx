import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { Instructor, Class, WeeklyLog, StudentSurvey as IStudentSurvey, SystemConfig, Course } from './types';
import { DEFAULT_CONFIG, SEED_INSTRUCTORS, SEED_CLASSES, SEED_LOGS, SEED_SURVEYS } from './data/seedData';
import StudentSurvey from './components/StudentSurvey';
import InstructorPortal from './components/InstructorPortal';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';

const normalizeStatus = (s: string | undefined): string => {
  if (!s) return 'PENDING';
  const u = s.toUpperCase();
  if (u === 'ACTIVE' || u === 'APPROVED') return 'ACTIVE';
  if (u === 'PENDING' || u === 'UNVERIFIED' || u === 'PENDING_ACTIVATION' || u === 'PENDING_APPROVAL' || u === 'PENDING APPROVAL') return 'PENDING';
  if (u === 'SUSPENDED' || u === 'DEACTIVATED') return 'SUSPENDED';
  if (u === 'REJECTED') return 'REJECTED';
  return u;
};

export default function App() {
  // ---- BROWSER PERSISTENT STATES (HYDRATED FROM NEON POSTGRES) ----
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [instructors, setInstructors] = useState<Instructor[]>(SEED_INSTRUCTORS);
  const [classes, setClasses] = useState<Class[]>(SEED_CLASSES);
  const [logs, setLogs] = useState<WeeklyLog[]>(SEED_LOGS);
  const [surveys, setSurveys] = useState<IStudentSurvey[]>(SEED_SURVEYS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Session state (Instructor Portal authentication)
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(null);

  // Main UI Tab Router: 'Student' or 'Portal'
  const [mainTab, setMainTab] = useState<'Student' | 'Portal'>('Student');

  // ---- PUBLIC CERTIFICATE VERIFICATION STATES ----
  const [urlVerificationCode, setUrlVerificationCode] = useState<string | null>(null);
  const [publicVerifyResult, setPublicVerifyResult] = useState<any | null>(null);
  const [publicVerifyLoading, setPublicVerifyLoading] = useState(false);
  const [publicVerifyError, setPublicVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get('verify');
    if (code) {
      setUrlVerificationCode(code);
      const verifyCode = async () => {
        setPublicVerifyLoading(true);
        setPublicVerifyError(null);
        setPublicVerifyResult(null);
        try {
          const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code)}`);
          const result = await res.json();
          if (result.success) {
            setPublicVerifyResult(result.data);
          } else {
            throw new Error(result.error || 'Verification code not found.');
          }
        } catch (err: any) {
          setPublicVerifyError(err.message || 'Verification check failed.');
        } finally {
          setUrlVerificationCode(code);
          setPublicVerifyLoading(false);
        }
      };
      verifyCode();
    }
  }, []);

  // ---- PORTAL AUTHENTICATION RE-HYDRATION ----
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/v1/auth/me");
        if (response.ok) {
          const resData = await response.json();
          const user = resData.data || resData;
          const mapped: Instructor = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            gender: user.gender || "Prefer not to say",
            center: user.center || "Headquarters",
            courses: Array.isArray(user.courses) ? user.courses : (typeof user.courses === 'string' ? (() => { try { const p = JSON.parse(user.courses); return Array.isArray(p) ? p : [user.courses]; } catch { return user.courses ? [user.courses] : []; } })() : []),
            role: (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Admin" : (user.role === "STUDENT" ? "Student" : "Instructor"),
            status: normalizeStatus(user.status),
            createdAt: user.createdAt || new Date().toISOString()
          };
          setCurrentInstructor(mapped);
        } else {
          setCurrentInstructor(null);
        }
      } catch (err) {
        console.error("Failed to rehydrate auth session:", err);
        setCurrentInstructor(null);
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkSession();
  }, []);

  // ---- SESSION EXPIRED HANDLER ----
  useEffect(() => {
    const handleExpired = () => {
      localStorage.removeItem("nhs_token");
      setCurrentInstructor(null);
      alert("Your session has expired. Please log in again.");
    };
    window.addEventListener("nhs-session-expired", handleExpired);
    return () => window.removeEventListener("nhs-session-expired", handleExpired);
  }, []);

  // ---- NEON DB INITIAL RE-HYDRATION ----
  useEffect(() => {
    async function loadNeonState() {
      try {
        console.log("[App] Hydrating operational states from Neon Postgres server API...");
        const [configRes, instRes, classesRes, logsRes, surveysRes, coursesRes] = await Promise.all([
          fetch("/api/config").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/instructors").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/classes").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/logs").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/surveys").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/courses").then((r) => (r.ok ? r.json() : null))
        ]);

        const configData = configRes?.data || configRes;
        const instData = instRes?.data || instRes;
        const classesData = classesRes?.data || classesRes;
        const logsData = logsRes?.data || logsRes;
        const surveysData = surveysRes?.data || surveysRes;
        const coursesData = coursesRes?.data || coursesRes;

        if (configData && configData.centers) setConfig(configData);
        if (Array.isArray(instData) && instData.length > 0) setInstructors(instData);
        if (Array.isArray(classesData) && classesData.length > 0) setClasses(classesData);
        if (Array.isArray(logsData) && logsData.length > 0) setLogs(logsData);
        if (Array.isArray(surveysData) && surveysData.length > 0) setSurveys(surveysData);
        if (Array.isArray(coursesData) && coursesData.length > 0) setCourses(coursesData);
      } catch (err) {
        console.error("Neon Postgres synchronization failed. Standard memory cache used.", err);
      } finally {
        setIsDbLoading(false);
      }
    }
    loadNeonState();
  }, []);

  // ---- PORTAL AUTHENTICATION ACTIONS ----
  const handleLogin = async (email: string, password?: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Invalid email or password.");
      }
      const resData = await response.json();
      const user = resData.data || resData;
      
      // Save Bearer Token if returned in response
      if (resData.token) {
        localStorage.setItem("nhs_token", resData.token);
      } else if (user.token) {
        localStorage.setItem("nhs_token", user.token);
      }

      const mapped: Instructor = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender || "Prefer not to say",
        center: user.center || "Headquarters",
        courses: Array.isArray(user.courses) ? user.courses : (typeof user.courses === 'string' ? (() => { try { const p = JSON.parse(user.courses); return Array.isArray(p) ? p : [user.courses]; } catch { return user.courses ? [user.courses] : []; } })() : []),
        role: (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Admin" : (user.role === "STUDENT" ? "Student" : "Instructor"),
        status: normalizeStatus(user.status),
        createdAt: user.createdAt || new Date().toISOString()
      };
      setCurrentInstructor(mapped);
      
      // Re-hydrate the instructor lists in state so they are in sync
      setInstructors((prev) => {
        if (!prev.some((inst) => inst.id === mapped.id)) {
          return [...prev, mapped];
        }
        return prev.map((inst) => (inst.id === mapped.id ? mapped : inst));
      });
      return true;
    } catch (err) {
      console.error("Login failure:", err);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST"
      });
    } catch (err) {
      console.error("Logout endpoint failure:", err);
    } finally {
      localStorage.removeItem("nhs_token");
      setCurrentInstructor(null);
    }
  };

  const handleRegister = async (newInst: Omit<Instructor, 'id' | 'createdAt'>) => {
    try {
      const isInstructor = newInst.role === 'Instructor';
      const registerUrl = isInstructor ? "/api/v1/auth/register/instructor" : "/api/v1/auth/register";

      const pwd = (newInst as any).password || "DefaultP@ss123";
      const payload = isInstructor ? {
        firstName: newInst.firstName,
        lastName: newInst.lastName,
        email: newInst.email,
        password: pwd,
        passwordConfirmation: (newInst as any).passwordConfirmation || pwd,
        center: newInst.center || "Headquarters",
        courses: newInst.courses && newInst.courses.length > 0 ? newInst.courses : ["General Healthcare"],
        gender: newInst.gender || "Prefer not to say"
      } : newInst;

      const response = await fetch(registerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let errMsg = "Failed to register profile";
        if (typeof errData.error === "string") {
          errMsg = errData.error;
        } else if (errData.error && typeof errData.error.message === "string") {
          errMsg = errData.error.message;
        } else if (typeof errData.message === "string") {
          errMsg = errData.message;
        }
        throw new Error(errMsg);
      }
      const resData = await response.json();
      const user = resData.data || resData;
      const mapped: Instructor = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender || "Prefer not to say",
        center: user.center || "Headquarters",
        courses: user.courses || [],
        role: (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Admin" : (user.role === "STUDENT" ? "Student" : "Instructor"),
        status: normalizeStatus(user.status),
        createdAt: user.createdAt || new Date().toISOString()
      };

      setInstructors((prev) => [...prev, mapped]);
      if (mapped.status === 'ACTIVE' || mapped.status === 'Active') {
        setCurrentInstructor(mapped);
      }
      return mapped;
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

  const handleUpdateInstructorStatus = async (id: string, newStatus: 'Active' | 'Deactivated') => {
    setInstructors((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );

    try {
      const response = await fetch(`/api/instructors/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        throw new Error("Failed to update status on server");
      }
    } catch (err) {
      console.error("Failed to update instructor status in database:", err);
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
              Login
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
        {isDbLoading || isAuthChecking ? (
          /* PRE-HYDRATION SKELETON / SPINNER */
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <div className="text-center">
              <h3 className="font-extrabold text-sm text-slate-700 tracking-wide">Syncing with Operations Portal...</h3>
              <p className="text-xs text-slate-400 mt-1">Hydrating operational states and verifying secure session credentials</p>
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
                      onAddCenter={handleAddCenter}
                      onAddCourse={handleAddCourse}
                      onCreateClass={handleCreateClassForAdmin}
                      onEditClass={handleEditClass}
                      onDeleteClass={handleDeleteClass}
                      onCreateCourseRich={handleCreateCourseRich}
                      onEditCourseRich={handleEditCourseRich}
                      onDeleteCourseRich={handleDeleteCourseRich}
                      onUpdateInstructorStatus={handleUpdateInstructorStatus}
                    />
                  </div>
                ) : currentInstructor && currentInstructor.role === 'Student' ? (
                  /* STUDENT PORTAL VIEW */
                  <StudentPortal currentStudent={currentInstructor} onLogout={handleLogout} />
                ) : (
                  /* INSTRUCTOR VIEW (OR LOGIN) */
                  <InstructorPortal
                    config={config}
                    instructors={instructors}
                    classes={classes}
                    logs={logs}
                    courses={courses}
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

      {/* PUBLIC VERIFICATION DIALOG */}
      <AnimatePresence>
        {urlVerificationCode && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
              onClick={() => {
                setUrlVerificationCode(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-slate-100 z-10 text-center space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-emerald-500 to-blue-500" />
              
              <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-slate-900 text-lg">
                  NHS Secure Credential Ledger
                </h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Verification Code: {urlVerificationCode}
                </p>
              </div>

              {publicVerifyLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  <p className="text-xs text-slate-500 font-bold">Querying secure verification database...</p>
                </div>
              ) : publicVerifyError ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs text-left space-y-1">
                  <p className="font-extrabold">Verification Unsuccessful</p>
                  <p className="font-medium text-rose-600 leading-relaxed">
                    {publicVerifyError}. Please check the verification link or code correctness.
                  </p>
                </div>
              ) : publicVerifyResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border text-left ${publicVerifyResult.revoked ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50/70 border-emerald-100 text-emerald-900'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide">
                        {publicVerifyResult.revoked ? '❌ Revoked Credential' : '✅ Verified Credential'}
                      </span>
                      <span className="text-[10px] font-mono font-bold">
                        {publicVerifyResult.certificateNumber}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs font-medium">
                      <p>
                        Student: <strong className="font-extrabold text-slate-900">{publicVerifyResult.studentName}</strong>
                      </p>
                      <p>
                        Course/Class: <strong className="font-extrabold text-slate-900">{publicVerifyResult.className}</strong>
                      </p>
                      <p>
                        Issued On: <strong className="font-extrabold text-slate-900">{new Date(publicVerifyResult.issuedAt).toLocaleDateString()}</strong>
                      </p>
                      {publicVerifyResult.revoked && (
                        <div className="mt-2 pt-2 border-t border-red-200 text-[10px] text-red-700 italic">
                          Revocation Reason: "{publicVerifyResult.revocationReason}"
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!publicVerifyResult.revoked && (
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                      This digital credential is certified genuine and registered permanently within the New Horizons learning management matrix.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUrlVerificationCode(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Dismiss Verification View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
