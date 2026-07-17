import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, ShieldCheck, Info } from 'lucide-react';
import { Instructor, Class, WeeklyLog, StudentSurvey as IStudentSurvey, SystemConfig, Course, ExamAttempt } from './types';
import { DEFAULT_CONFIG, SEED_INSTRUCTORS, SEED_CLASSES, SEED_LOGS, SEED_SURVEYS } from './data/seedData';
import StudentSurvey from './components/StudentSurvey';
import InstructorPortal from './components/InstructorPortal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // ---- BROWSER PERSISTENT STATES ----
  const [config, setConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('nh_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [instructors, setInstructors] = useState<Instructor[]>(() => {
    const saved = localStorage.getItem('nh_instructors');
    return saved ? JSON.parse(saved) : SEED_INSTRUCTORS;
  });

  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('nh_classes');
    return saved ? JSON.parse(saved) : SEED_CLASSES;
  });

  const [logs, setLogs] = useState<WeeklyLog[]>(() => {
    const saved = localStorage.getItem('nh_logs');
    return saved ? JSON.parse(saved) : SEED_LOGS;
  });

  const [surveys, setSurveys] = useState<IStudentSurvey[]>(() => {
    const saved = localStorage.getItem('nh_surveys');
    return saved ? JSON.parse(saved) : SEED_SURVEYS;
  });

  // --- Rich course states with Lessons and teaching resources ---
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('nh_courses_rich');
    if (saved) return JSON.parse(saved);
    
    // Seed initial rich courses matching flat config
    const initialRich: Course[] = [];
    DEFAULT_CONFIG.courses.forEach((cat) => {
      cat.items.forEach((itemName) => {
        initialRich.push({
          id: `course-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: itemName,
          category: cat.category,
          description: `Comprehensive operations and technical syllabus for New Horizons ${itemName} training curriculum.`,
          lessons: [
            {
              id: `lesson-1-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title: 'Lesson 1: Introduction and Core Fundamentals',
              description: 'Setting up the environment, exploring basic syntax, terminology, and foundational design parameters.',
              resources: [
                {
                  id: `res-1-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `Slides: ${itemName} Core Concepts`,
                  type: 'slides',
                  url: '#',
                  content: `Slide 1: Welcome to ${itemName} Training\nSlide 2: Core Learning Paths and Objectives\nSlide 3: Technical Architecture & Sandbox Setups\nSlide 4: Common Configuration Commands`
                },
                {
                  id: `res-2-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `PDF: Reference Study Manual`,
                  type: 'pdf',
                  url: '#',
                  content: `Official study reference manual for ${itemName} curriculum. Designed for training staff and system instructors. Understand structural patterns, compile dependencies, and environment pathways before executing sandbox laboratory exercises.`
                }
              ]
            },
            {
              id: `lesson-2-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title: 'Lesson 2: Practical Implementation and Troubleshooting Labs',
              description: 'Executing complex scenarios, diagnosing script/compilation errors, and verifying environment integrity.',
              resources: [
                {
                  id: `res-3-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `Video: Lab Workspace Setup Tutorial`,
                  type: 'video',
                  url: '#',
                  content: `Walkthrough of the student laboratory manual for ${itemName}. Check core path allocations, adjust host server memory configurations, and preview typical log errors encountered by student cohorts.`
                }
              ]
            }
          ],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      });
    });
    return initialRich;
  });

  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>(() => {
    const saved = localStorage.getItem('nh_exam_attempts');
    return saved ? JSON.parse(saved) : [];
  });

  // Session state (Instructor Portal authentication)
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(() => {
    const saved = sessionStorage.getItem('nh_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Main UI Tab Router: 'Student' or 'Portal'
  const [mainTab, setMainTab] = useState<'Student' | 'Portal'>('Student');

  // Sync to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('nh_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('nh_instructors', JSON.stringify(instructors));
  }, [instructors]);

  useEffect(() => {
    localStorage.setItem('nh_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('nh_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('nh_surveys', JSON.stringify(surveys));
  }, [surveys]);

  useEffect(() => {
    localStorage.setItem('nh_courses_rich', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('nh_exam_attempts', JSON.stringify(examAttempts));
  }, [examAttempts]);

  // ---- PORTAL AUTHENTICATION ACTIONS ----
  const handleLogin = (email: string): boolean => {
    const found = instructors.find((inst) => inst.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentInstructor(found);
      sessionStorage.setItem('nh_session', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentInstructor(null);
    sessionStorage.removeItem('nh_session');
  };

  const handleRegister = (newInst: Omit<Instructor, 'id' | 'createdAt'>) => {
    const instructor: Instructor = {
      ...newInst,
      id: `inst-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...instructors, instructor];
    setInstructors(updated);
    setCurrentInstructor(instructor);
    sessionStorage.setItem('nh_session', JSON.stringify(instructor));
  };

  // ---- INSTRUCTOR & ADMIN CLASS OPERATIONS ----
  const handleCreateClass = (
    newClass: Omit<Class, 'id' | 'instructorId' | 'instructorName' | 'createdAt'>
  ) => {
    if (!currentInstructor) return;
    const created: Class = {
      ...newClass,
      id: `class-${Date.now()}`,
      instructorId: currentInstructor.id,
      instructorName: `${currentInstructor.firstName} ${currentInstructor.lastName}`,
      createdAt: new Date().toISOString()
    };
    setClasses((prev) => [...prev, created]);
  };

  const handleCreateClassForAdmin = (
    newClass: Omit<Class, 'id' | 'createdAt'>
  ) => {
    const created: Class = {
      ...newClass,
      id: `class-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setClasses((prev) => [...prev, created]);
  };

  const handleEditClass = (updatedClass: Class) => {
    setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
  };

  const handleDeleteClass = (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  const handleSubmitLog = (
    newLog: Omit<WeeklyLog, 'id' | 'submittedAt' | 'instructorId'>
  ): { ok: boolean; error?: string } => {
    if (!currentInstructor) return { ok: false, error: 'Unauthorized session' };

    // 1. Idempotency Check: Prevent duplicate logging for the same Class ID + Week Number
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
    const log: WeeklyLog = {
      ...newLog,
      id: `log-${Date.now()}`,
      instructorId: currentInstructor.id,
      submittedAt: new Date().toISOString()
    };

    // 4. Update the parent class checklist & progress
    setClasses((prevClasses) =>
      prevClasses.map((cls) => {
        if (cls.id === newLog.classId) {
          // Check off the covered modules
          const updatedModules = cls.modules.map((mod) => {
            if (newLog.modulesCoveredThisWeek.includes(mod.id)) {
              return { ...mod, done: true };
            }
            return mod;
          });

          // Check if syllabus is fully complete
          const allDone = updatedModules.every((m) => m.done);

          return {
            ...cls,
            modules: updatedModules,
            status: allDone ? 'Completed' : cls.status
          };
        }
        return cls;
      })
    );

    setLogs((prev) => [...prev, log]);
    return { ok: true };
  };

  // ---- STUDENT SURVEY ACTION ----
  const handleSurveySubmit = (surveyData: Omit<IStudentSurvey, 'id' | 'submittedAt'>) => {
    const newSurvey: IStudentSurvey = {
      ...surveyData,
      id: `survey-${Date.now()}`,
      submittedAt: new Date().toISOString()
    };
    setSurveys((prev) => [...prev, newSurvey]);
  };

  // ---- ADMINISTRATION CONFIG & COURSE ACTIONS ----
  const handleAddCenter = (center: string) => {
    setConfig((prev) => ({
      ...prev,
      centers: [...prev.centers, center]
    }));
  };

  const handleAddCourse = (category: string, courseName: string) => {
    // Legacy course handler
    setConfig((prev) => {
      const exists = prev.courses.find((c) => c.category === category);
      if (exists) {
        return {
          ...prev,
          courses: prev.courses.map((c) => {
            if (c.category === category) {
              return { ...c, items: c.items.includes(courseName) ? c.items : [...c.items, courseName] };
            }
            return c;
          })
        };
      } else {
        return {
          ...prev,
          courses: [...prev.courses, { category, items: [courseName] }]
        };
      }
    });

    // Mirror to rich courses if it doesn't exist
    setCourses((prev) => {
      const exists = prev.some(c => c.name.toLowerCase() === courseName.toLowerCase());
      if (exists) return prev;
      return [
        ...prev,
        {
          id: `course-${courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: courseName,
          category,
          description: `Standard curriculum details for ${courseName}.`,
          lessons: [],
          createdAt: new Date().toISOString()
        }
      ];
    });
  };

  const handleCreateCourseRich = (newCourse: Course) => {
    setCourses((prev) => [...prev, newCourse]);

    // Also sync to flat config courses for matching select lists
    setConfig((prev) => {
      const categoryExists = prev.courses.find((c) => c.category === newCourse.category);
      if (categoryExists) {
        return {
          ...prev,
          courses: prev.courses.map((c) => {
            if (c.category === newCourse.category) {
              const items = c.items.includes(newCourse.name) ? c.items : [...c.items, newCourse.name];
              return { ...c, items };
            }
            return c;
          })
        };
      } else {
        return {
          ...prev,
          courses: [...prev.courses, { category: newCourse.category, items: [newCourse.name] }]
        };
      }
    });
  };

  const handleEditCourseRich = (updatedCourse: Course) => {
    const previousCourse = courses.find(c => c.id === updatedCourse.id);
    setCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));

    if (previousCourse) {
      setConfig((prev) => {
        return {
          ...prev,
          courses: prev.courses.map((c) => {
            const filteredItems = c.items.filter(item => item !== previousCourse.name);
            if (c.category === updatedCourse.category) {
              return { ...c, items: [...filteredItems, updatedCourse.name] };
            }
            return { ...c, items: filteredItems };
          }).filter(c => c.items.length > 0 || c.category === updatedCourse.category)
        };
      });
    }
  };

  const handleDeleteCourseRich = (courseId: string) => {
    const toDelete = courses.find(c => c.id === courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));

    if (toDelete) {
      setConfig((prev) => ({
        ...prev,
        courses: prev.courses.map((c) => {
          if (c.category === toDelete.category) {
            return { ...c, items: c.items.filter(item => item !== toDelete.name) };
          }
          return c;
        }).filter(c => c.items.length > 0)
      }));
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
      <main className="flex-grow">
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
              className="max-w-7xl mx-auto py-10 px-6 space-y-8"
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
                  onAddExamAttempt={(attempt) => setExamAttempts(prev => [...prev, attempt])}
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
