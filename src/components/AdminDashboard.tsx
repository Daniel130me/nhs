import React, { useState, useEffect } from 'react';
import ProfileForm from "./ProfileForm";
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Layers,
  Search,
  Sliders,
  PlusCircle,
  FolderPlus,
  BookOpen,
  Calendar,
  Clock,
  User,
  UserPlus,
  Activity,
  Smile,
  Frown,
  Meh,
  ChevronRight,
  Filter,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Plus,
  Sparkles,
  FileText,
  Play,
  PlayCircle,
  Save,
  Trash,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { Instructor, Class, WeeklyLog, StudentSurvey, SystemConfig, Course, Lesson, Resource, ExamAttempt } from '../types';
import FileUploader from './FileUploader';
import AdminReportsTab from './AdminReportsTab';

interface AdminDashboardProps {
  config: SystemConfig;
  instructors: Instructor[];
  classes: Class[];
  logs: WeeklyLog[];
  surveys: StudentSurvey[];
  courses: Course[];
  examAttempts: ExamAttempt[];
  onAddCenter: (center: string) => void;
  onAddCourse: (category: string, course: string) => void;
  onCreateClass: (newClass: Omit<Class, 'id' | 'createdAt'>) => void;
  onEditClass: (updatedClass: Class) => void;
  onDeleteClass: (classId: string) => void;
  onCreateCourseRich: (newCourse: Course) => void;
  onEditCourseRich: (updatedCourse: Course) => void;
  onDeleteCourseRich: (courseId: string) => void;
  onUpdateInstructorStatus?: (id: string, status: 'Active' | 'Deactivated') => void;
}

export default function AdminDashboard({
  config,
  instructors,
  classes,
  logs,
  surveys,
  courses,
  examAttempts,
  onAddCenter,
  onAddCourse,
  onCreateClass,
  onEditClass,
  onDeleteClass,
  onCreateCourseRich,
  onEditCourseRich,
  onDeleteCourseRich,
  onUpdateInstructorStatus
}: AdminDashboardProps) {
  // Config manager inputs
  const [newCenter, setNewCenter] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  // Search & Filters for Surveys
  const [searchTerm, setSearchTerm] = useState('');
  const [centerFilter, setCenterFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Sub-tabs for the Admin portal
  const [adminTab, setAdminTab] = useState<'Analytics' | 'Instructors' | 'Students' | 'Surveys' | 'InstructorLogs' | 'Config' | 'Reports' | 'Profile'>('Analytics');

  // Students administration states
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('All');
  const [studentCenterFilter, setStudentCenterFilter] = useState('All');
  const [studentLoading, setStudentLoading] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [newStudentFirstName, setNewStudentFirstName] = useState('');
  const [newStudentLastName, setNewStudentLastName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentStudentNumber, setNewStudentStudentNumber] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentCenterId, setNewStudentCenterId] = useState('');
  const [newStudentGender, setNewStudentGender] = useState('Male');
  const [studentFormError, setStudentFormError] = useState('');
  const [createdStudentResult, setCreatedStudentResult] = useState<any | null>(null);

  const fetchAdminStudents = async () => {
    setStudentLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: studentSearch,
        status: studentStatusFilter,
        center: studentCenterFilter,
      });
      const token = localStorage.getItem('nhs_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/v1/admin/students?${queryParams.toString()}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        const body = resData.data || resData;
        setDbStudents(body.students || []);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setStudentLoading(false);
    }
  };

  useEffect(() => {
    if (adminTab === 'Students') {
      fetchAdminStudents();
    }
  }, [adminTab, studentSearch, studentStatusFilter, studentCenterFilter]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormError('');
    try {
      const token = localStorage.getItem('nhs_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/v1/admin/students', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName: newStudentFirstName,
          lastName: newStudentLastName,
          email: newStudentEmail,
          studentNumber: newStudentStudentNumber || undefined,
          phone: newStudentPhone || undefined,
          centerId: newStudentCenterId || undefined,
          gender: newStudentGender || undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to create student');
      }

      const created = data.data || data;
      setCreatedStudentResult(created);
      setIsStudentModalOpen(false);
      setNewStudentFirstName('');
      setNewStudentLastName('');
      setNewStudentEmail('');
      setNewStudentStudentNumber('');
      setNewStudentPhone('');
      setNewStudentCenterId('');
      fetchAdminStudents();
    } catch (err: any) {
      setStudentFormError(err.message || 'Failed to create student');
    }
  };

  const handleReinviteStudent = async (id: string) => {
    try {
      const token = localStorage.getItem('nhs_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/v1/admin/students/${id}/invite`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate invitation');
      }
      const resObj = data.data || data;
      if (resObj && resObj.activationToken) {
        setCreatedStudentResult({
          firstName: resObj.firstName || 'Student',
          lastName: resObj.lastName || '',
          email: resObj.email || '',
          studentNumber: resObj.studentNumber || '',
          activationToken: resObj.activationToken,
          isReinvite: true
        });
      } else {
        alert("New student invitation generated successfully!");
      }
      fetchAdminStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to re-invite student');
    }
  };

  const handleDeleteStudent = async (id: string, firstName: string, lastName: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Delete Student Account",
      message: `Are you sure you want to permanently delete ${firstName} ${lastName}? This action cannot be undone and will remove their access.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('nhs_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`/api/v1/admin/students/${id}`, {
            method: 'DELETE',
            headers
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to delete student');
          }

          alert("Student deleted successfully!");
          fetchAdminStudents();
        } catch (err: any) {
          alert(err.message || 'Failed to delete student');
        } finally {
          setConfirmationModal(null);
        }
      }
    });
  };

  const handleToggleStudentStatus = async (id: string, currentStatus: string) => {
    try {
      const isActivating = String(currentStatus).toUpperCase() !== 'ACTIVE';
      const targetStatus = isActivating ? 'ACTIVE' : 'SUSPENDED';
      const token = localStorage.getItem('nhs_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let res;
      if (isActivating) {
        res = await fetch(`/api/v1/admin/students/${id}/approve`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: 'Admin activation' })
        });
      } else {
        res = await fetch(`/api/v1/admin/students/${id}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: targetStatus, reason: 'Admin status update' })
        });
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update student status');
      }
      setDbStudents(prev => prev.map(s => s.id === id ? { ...s, status: isActivating ? 'ACTIVE' : targetStatus } : s));
      alert(`Student account status updated to ${isActivating ? 'ACTIVE' : targetStatus} successfully.`);
      fetchAdminStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to update student status');
    }
  };

  // Real-time instructors fetching states
  const [dbInstructors, setDbInstructors] = useState<any[]>([]);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instStatusFilter, setInstStatusFilter] = useState('All');
  const [instCenterFilter, setInstCenterFilter] = useState('All');
  const [instCourseFilter, setInstCourseFilter] = useState('All');
  const [instPage, setInstPage] = useState(1);
  const [instTotalPages, setInstTotalPages] = useState(1);
  const [instLoading, setInstLoading] = useState(false);
  const [instError, setInstError] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  
  // Profile editing inside drawer
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editCenter, setEditCenter] = useState('');
  const [editCourses, setEditCourses] = useState<string[]>([]);
  
  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const filterLocalInstructors = (list: any[]) => {
    return list.filter(i => {
      const fullName = `${i.firstName || ''} ${i.lastName || ''} ${i.email || ''}`.toLowerCase();
      const matchSearch = !instructorSearch || fullName.includes(instructorSearch.toLowerCase());
      
      const st = String(i.status || 'PENDING').toUpperCase();
      const filtSt = instStatusFilter.toUpperCase();
      const matchStatus = instStatusFilter === 'All' || 
        st === filtSt || 
        (filtSt === 'SUSPENDED' && (st === 'DEACTIVATED' || st === 'SUSPENDED')) ||
        (filtSt === 'ACTIVE' && (st === 'ACTIVE' || st === 'APPROVED')) ||
        (filtSt === 'PENDING' && (st === 'PENDING' || st === 'UNVERIFIED' || st === 'PENDING_ACTIVATION'));

      const matchCenter = instCenterFilter === 'All' || i.center === instCenterFilter;

      let matchCourse = true;
      if (instCourseFilter !== 'All') {
        if (Array.isArray(i.courses)) {
          matchCourse = i.courses.includes(instCourseFilter);
        } else if (typeof i.courses === 'string') {
          matchCourse = i.courses.toLowerCase().includes(instCourseFilter.toLowerCase());
        } else {
          matchCourse = false;
        }
      }

      return matchSearch && matchStatus && matchCenter && matchCourse;
    }).map(i => ({
      ...i,
      status: (i.status || 'PENDING').toUpperCase()
    }));
  };

  const fetchAdminInstructors = async () => {
    setInstLoading(true);
    setInstError('');
    try {
      const queryParams = new URLSearchParams({
        search: instructorSearch,
        status: instStatusFilter,
        center: instCenterFilter,
        course: instCourseFilter,
        page: String(instPage),
        limit: '6'
      });
      const token = localStorage.getItem('nhs_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/v1/admin/instructors?${queryParams.toString()}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load instructors from API');
      }
      const resData = await response.json();
      const body = resData.data || resData;
      if (body && Array.isArray(body.instructors)) {
        setDbInstructors(body.instructors);
        setInstTotalPages(body.meta?.pages || 1);
      } else {
        setDbInstructors(filterLocalInstructors(instructors));
        setInstTotalPages(1);
      }
    } catch (err: any) {
      setDbInstructors(filterLocalInstructors(instructors));
      setInstTotalPages(1);
    } finally {
      setInstLoading(false);
    }
  };

  useEffect(() => {
    if (adminTab === 'Instructors') {
      fetchAdminInstructors();
    }
  }, [adminTab, instructorSearch, instStatusFilter, instCenterFilter, instCourseFilter, instPage]);

  const handleApproveInstructor = (id: string, name: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Approve Instructor Account",
      message: `Are you sure you want to approve the instructor profile for ${name}? This will activate their credentials.`,
      onConfirm: async () => {
        setDbInstructors(prev => prev.map(inst => inst.id === id ? { ...inst, status: 'ACTIVE' } : inst));
        if (selectedInstructor && selectedInstructor.id === id) {
          setSelectedInstructor((prev: any) => prev ? { ...prev, status: 'ACTIVE' } : null);
        }
        if (onUpdateInstructorStatus) {
          onUpdateInstructorStatus(id, 'Active');
        }
        try {
          const res = await fetch(`/api/v1/admin/instructors/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) {
            await fetch(`/api/instructors/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'Active' })
            });
          }
        } catch (err: any) {
          console.warn("API approve warning:", err.message);
        } finally {
          setIsDetailDrawerOpen(false);
          setConfirmationModal(null);
        }
      }
    });
  };

  const handleRejectInstructor = (id: string, name: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Reject Instructor Profile",
      message: `Are you sure you want to reject and deactivate ${name}'s registration? This will terminate their session immediately.`,
      onConfirm: async () => {
        setDbInstructors(prev => prev.map(inst => inst.id === id ? { ...inst, status: 'REJECTED' } : inst));
        if (selectedInstructor && selectedInstructor.id === id) {
          setSelectedInstructor((prev: any) => prev ? { ...prev, status: 'REJECTED' } : null);
        }
        if (onUpdateInstructorStatus) {
          onUpdateInstructorStatus(id, 'Deactivated');
        }
        try {
          const res = await fetch(`/api/v1/admin/instructors/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) {
            await fetch(`/api/instructors/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'Deactivated' })
            });
          }
        } catch (err: any) {
          console.warn("API reject warning:", err.message);
        } finally {
          setIsDetailDrawerOpen(false);
          setConfirmationModal(null);
        }
      }
    });
  };

  const handleDeleteInstructor = (id: string, name: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Permanently Delete Instructor Account",
      message: `Are you sure you want to permanently delete the instructor account for ${name}? This action cannot be undone and all associated records will be permanently wiped from the database.`,
      onConfirm: async () => {
        setDbInstructors(prev => prev.filter(inst => inst.id !== id));
        if (selectedInstructor && selectedInstructor.id === id) {
          setSelectedInstructor(null);
          setIsDetailDrawerOpen(false);
        }
        try {
          const res = await fetch(`/api/v1/admin/instructors/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) {
            await fetch(`/api/instructors/${id}`, {
              method: 'DELETE'
            });
          }
        } catch (err: any) {
          console.warn("API delete warning:", err.message);
        } finally {
          setIsDetailDrawerOpen(false);
          setConfirmationModal(null);
          fetchAdminInstructors();
        }
      }
    });
  };

  const handleStatusChange = (id: string, name: string, nextStatus: string) => {
    const isActivating = nextStatus === 'ACTIVE' || nextStatus === 'Active';
    const targetStatus = isActivating ? 'ACTIVE' : 'SUSPENDED';
    const actionLabel = isActivating ? 'Activate' : 'Deactivate';

    setConfirmationModal({
      isOpen: true,
      title: `${actionLabel} Instructor Account`,
      message: `Are you sure you want to update ${name}'s status to ${actionLabel}?`,
      onConfirm: async () => {
        setDbInstructors(prev => prev.map(inst => inst.id === id ? { ...inst, status: targetStatus } : inst));
        if (selectedInstructor && selectedInstructor.id === id) {
          setSelectedInstructor((prev: any) => prev ? { ...prev, status: targetStatus } : null);
        }
        if (onUpdateInstructorStatus) {
          onUpdateInstructorStatus(id, isActivating ? 'Active' : 'Deactivated');
        }

        try {
          const res = await fetch(`/api/v1/admin/instructors/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus, reason: "Manual admin action" })
          });
          if (!res.ok) {
            await fetch(`/api/instructors/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: isActivating ? 'Active' : 'Deactivated' })
            });
          }
        } catch (err: any) {
          console.warn("Status change API update:", err.message);
        } finally {
          setConfirmationModal(null);
        }
      }
    });
  };

  const handleRoleChange = (id: string, name: string, nextRole: string) => {
    setConfirmationModal({
      isOpen: true,
      title: `Promote / Reassign Role`,
      message: `Are you sure you want to change ${name}'s role to ${nextRole}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/admin/instructors/${id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: nextRole })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = typeof errData.error === 'string' ? errData.error : (errData.error?.message || errData.message || 'Failed to update role');
            throw new Error(msg);
          }
          fetchAdminInstructors();
          setSelectedInstructor(null);
          setIsDetailDrawerOpen(false);
          setConfirmationModal(null);
        } catch (err: any) {
          alert(err.message);
        }
      }
    });
  };

  const handleSaveProfileEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/instructors/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          gender: editGender,
          center: editCenter,
          courses: editCourses
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = typeof errData.error === 'string' ? errData.error : (errData.error?.message || errData.message || 'Failed to update profile');
        throw new Error(msg);
      }
      setIsEditingProfile(false);
      fetchAdminInstructors();
      const detailRes = await fetch(`/api/v1/admin/instructors/${id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const body = detail.data || detail;
        setSelectedInstructor(body);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Sub-tab under Operations configuration: 'classes' | 'courses' | 'centers' | 'exams'
  const [opsSection, setOpsSection] = useState<'classes' | 'courses' | 'centers' | 'exams'>('classes');

  // ---- CLASS CRUD FORM STATES ----
  const [showClassForm, setShowClassForm] = useState(false);
  const [classFormMode, setClassFormMode] = useState<'create' | 'edit'>('create');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [classCourse, setClassCourse] = useState('');
  const [classInstructor, setClassInstructor] = useState('');
  const [classDuration, setClassDuration] = useState(40);
  const [classRoom, setClassRoom] = useState('');
  const [classSchedule, setClassSchedule] = useState<'Weekday' | 'Weekend' | 'Fast-track' | 'Online'>('Weekday');
  const [classTimeSlot, setClassTimeSlot] = useState<'Morning' | 'Afternoon'>('Morning');
  const [classDays, setClassDays] = useState<string[]>(['Monday', 'Wednesday']);
  const [classStartDate, setClassStartDate] = useState('2026-07-15');
  const [classEndDate, setClassEndDate] = useState('2026-08-15');
  const [classStatus, setClassStatus] = useState<'Active' | 'Completed' | 'Paused'>('Active');
  const [classModulesText, setClassModulesText] = useState('');

  // ---- COURSE CRUD FORM STATES ----
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseFormMode, setCourseFormMode] = useState<'create' | 'edit'>('create');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [courseName, setCourseName] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);

  // AI Generation State
  const [aiPromptTopic, setAiPromptTopic] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // ---- EXPANDED SECTIONS ----
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // ---- CALCULATE METRICS ----
  const totalActiveClasses = classes.filter((c) => c.status === 'Active').length;
  const totalHoursLogged = logs.reduce((sum, l) => sum + l.hoursLogged, 0);

  // Average Course Progress
  const classProgresses = classes.map((c) => {
    const done = c.modules.filter((m) => m.done).length;
    const total = c.modules.length;
    return total ? (done / total) * 100 : 0;
  });
  const avgCourseProgress = classProgresses.length
    ? Math.round(classProgresses.reduce((sum, p) => sum + p, 0) / classProgresses.length)
    : 0;

  // Survey Alerts (Students experiencing issues)
  const activeStudentIssues = surveys.filter((s) => s.hadIssue === 'Yes');
  const urgentStudentIssues = surveys.filter((s) => s.hadIssue === 'Yes' && (s.severity === 'Urgent' || s.severity === 'High'));

  // Instructor Hours Breakdown
  const instructorHoursBreakdown = instructors.map((inst) => {
    const instClasses = classes.filter((c) => c.instructorId === inst.id);
    const instLogs = logs.filter((l) => l.instructorId === inst.id);
    const totalHours = instLogs.reduce((sum, l) => sum + l.hoursLogged, 0);
    return {
      id: inst.id,
      name: `${inst.firstName} ${inst.lastName}`,
      email: inst.email,
      center: inst.center,
      classCount: instClasses.length,
      hours: totalHours,
      status: inst.status || 'Active'
    };
  });

  // ---- GENERAL HANDLERS ----
  const exportSurveysToCsv = () => {
    if (filteredSurveys.length === 0) return;
    
    const headers = [
      "ID", "Date", "Course", "Center", "Student Name", "Anonymous",
      "Pace (1-5)", "Clarity (1-5)", "Keep Up (1-5)", "Questions Answered",
      "Materials Clear (1-5)", "Materials On Time", "Exercises Matched",
      "Lab Sufficient", "Tools Worked", "Could Complete", "Had Issue",
      "Severity"
    ];

    const rows = filteredSurveys.map(s => [
      s.id,
      s.weekEnding,
      s.courseName,
      s.center,
      s.anonymous ? "Anonymous" : s.studentName,
      s.anonymous ? "Yes" : "No",
      s.pace,
      s.clarity,
      s.keepUp,
      (s.questionsAnswered || "").replace(/\n/g, " "),
      s.materialsClear,
      s.materialsOnTime || "",
      s.exercisesMatched || "",
      s.labSufficient || "",
      s.toolsWorked || "",
      s.couldComplete || "",
      s.hadIssue,
      s.severity || "None"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Surveys_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLogsToCsv = () => {
    if (logs.length === 0) return;

    const headers = [
      "Log Entry", "Classroom", "Course", "Instructor Name", "Week Number",
      "Hours Logged", "Modules Covered Count", "Modules Covered IDs", "Challenges Logged", "Submitted At"
    ];

    const rows = logs.map(log => {
      const matchedClass = classes.find((c) => c.id === log.classId);
      const instructorObj = instructors.find(i => i.id === log.instructorId);
      const instructorName = instructorObj ? `${instructorObj.firstName} ${instructorObj.lastName}` : "Instructor";
      return [
        log.id,
        log.classId,
        matchedClass ? matchedClass.courseName : "Unknown",
        instructorName,
        log.weekNumber,
        log.hoursLogged,
        log.modulesCoveredThisWeek.length,
        log.modulesCoveredThisWeek.join("; "),
        (log.challenges || "").replace(/\n/g, " "),
        log.submittedAt
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Instructor_Logs_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenter.trim()) return;

    if (config.centers.some((c) => c.toLowerCase() === newCenter.trim().toLowerCase())) {
      setConfigSuccess('Center already exists.');
      return;
    }

    onAddCenter(newCenter.trim());
    setConfigSuccess(`Center "${newCenter.trim()}" added successfully!`);
    setNewCenter('');
    setTimeout(() => setConfigSuccess(''), 2500);
  };

  // ---- AI GENERATE HANDLER ----
  const handleAiGenerateCourse = async () => {
    const topic = aiPromptTopic.trim() || courseName.trim();
    if (!topic) {
      setAiError('Please enter a course topic or title first.');
      return;
    }

    setIsAiGenerating(true);
    setAiError('');

    try {
      const res = await fetch('/api/gemini/author-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseName: topic, category: courseCategory || 'Technology' })
      });

      if (!res.ok) {
        throw new Error('Server returned error ' + res.status);
      }

      const data = await res.json();
      const payload = data.fallback ? data.fallback : data; // Fallback gracefully if key is unconfigured

      setCourseName(topic);
      setCourseDescription(payload.description || '');
      
      // Structure lessons with appropriate IDs
      const structuredLessons = (payload.lessons || []).map((l: any, idx: number) => ({
        id: `gen-lesson-${Date.now()}-${idx}`,
        title: l.title || `Lesson ${idx + 1}`,
        description: l.description || '',
        resources: (l.resources || []).map((r: any, rIdx: number) => ({
          id: `gen-res-${Date.now()}-${idx}-${rIdx}`,
          name: r.name || 'Resource',
          type: r.type || 'slides',
          url: '#',
          content: r.content || ''
        }))
      }));

      setCourseLessons(structuredLessons);
      setConfigSuccess('Gemini AI successfully authored course curriculum outline!');
      setTimeout(() => setConfigSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setAiError('Gemini Authoring failed: ' + err.message + '. Standard structure loaded as sandbox fallback.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // ---- SUBMIT COURSE CRUD ----
  const handleSubmitCourseForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCategory.trim()) return;

    const courseId = courseFormMode === 'edit' && editingCourseId 
      ? editingCourseId 
      : `course-${courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const prevCourse = courses.find(c => c.id === courseId);
    const newCourseObj: Course = {
      id: courseId,
      name: courseName.trim(),
      category: courseCategory.trim(),
      description: courseDescription.trim() || 'No description provided.',
      lessons: courseLessons,
      createdAt: prevCourse ? prevCourse.createdAt : new Date().toISOString()
    };

    if (courseFormMode === 'create') {
      onCreateCourseRich(newCourseObj);
      setConfigSuccess(`Course "${courseName}" has been authored successfully!`);
    } else {
      onEditCourseRich(newCourseObj);
      setConfigSuccess(`Course "${courseName}" updated successfully!`);
    }

    // Reset Form
    setShowCourseForm(false);
    setCourseName('');
    setCourseCategory('');
    setCourseDescription('');
    setCourseLessons([]);
    setEditingCourseId(null);
    setAiPromptTopic('');
    setTimeout(() => setConfigSuccess(''), 3000);
  };

  const handleEditCourseClick = (course: Course) => {
    setClassFormMode('edit'); // legacy safety
    setCourseFormMode('edit');
    setEditingCourseId(course.id);
    setCourseName(course.name);
    setCourseCategory(course.category);
    setCourseDescription(course.description);
    setCourseLessons(course.lessons || []);
    setShowCourseForm(true);
  };

  // ---- SUBMIT CLASS CRUD ----
  const handleSubmitClassForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCourse || !classInstructor || !classRoom) return;

    const matchedInstructor = instructors.find(i => i.id === classInstructor);
    const instructorName = matchedInstructor 
      ? `${matchedInstructor.firstName} ${matchedInstructor.lastName}` 
      : 'Unassigned';

    // Parse modules
    const rawModules = classModulesText.trim()
      ? classModulesText.split('\n').filter(line => line.trim()).map((line, idx) => ({
          id: `m-${Date.now()}-${idx}`,
          name: line.trim(),
          done: false
        }))
      : [
          { id: 'm1', name: 'Module 1: Getting Started and Fundamentals', done: false },
          { id: 'm2', name: 'Module 2: Practical Labs and Drills', done: false },
          { id: 'm3', name: 'Module 3: Advanced Review and Projects', done: false }
        ];

    if (classFormMode === 'create') {
      onCreateClass({
        courseName: classCourse,
        instructorId: classInstructor,
        instructorName,
        totalDurationHours: Number(classDuration),
        classroom: classRoom,
        scheduleType: classSchedule,
        days: classDays,
        timeSlot: classTimeSlot,
        startDate: classStartDate,
        endDate: classEndDate,
        modules: rawModules,
        status: classStatus
      });
      setConfigSuccess(`Class for "${classCourse}" created successfully!`);
    } else if (classFormMode === 'edit' && editingClassId) {
      const prevClass = classes.find(c => c.id === editingClassId);
      onEditClass({
        id: editingClassId,
        courseName: classCourse,
        instructorId: classInstructor,
        instructorName,
        totalDurationHours: Number(classDuration),
        classroom: classRoom,
        scheduleType: classSchedule,
        days: classDays,
        timeSlot: classTimeSlot,
        startDate: classStartDate,
        endDate: classEndDate,
        modules: prevClass ? prevClass.modules : rawModules,
        status: classStatus,
        createdAt: prevClass ? prevClass.createdAt : new Date().toISOString()
      });
      setConfigSuccess(`Class configuration updated successfully!`);
    }

    setShowClassForm(false);
    setEditingClassId(null);
    setClassCourse('');
    setClassInstructor('');
    setClassRoom('');
    setClassModulesText('');
    setTimeout(() => setConfigSuccess(''), 3000);
  };

  const handleEditClassClick = (c: Class) => {
    setClassFormMode('edit');
    setEditingClassId(c.id);
    setClassCourse(c.courseName);
    setClassInstructor(c.instructorId);
    setClassDuration(c.totalDurationHours);
    setClassRoom(c.classroom);
    setClassSchedule(c.scheduleType);
    setClassTimeSlot(c.timeSlot);
    setClassDays(c.days);
    setClassStartDate(c.startDate || '2026-07-15');
    setClassEndDate(c.endDate || '2026-08-15');
    setClassStatus(c.status);
    setClassModulesText(c.modules.map(m => m.name).join('\n'));
    setShowClassForm(true);
  };

  // ---- EXAMPLES RESOURCES HELPER ----
  const handleAddLessonToForm = () => {
    const newLess: Lesson = {
      id: `lesson-${Date.now()}-${courseLessons.length + 1}`,
      title: `Lesson ${courseLessons.length + 1}: Lesson Title`,
      description: 'Review concepts, labs and practical competencies.',
      resources: []
    };
    setCourseLessons([...courseLessons, newLess]);
  };

  const handleRemoveLessonFromForm = (id: string) => {
    setCourseLessons(courseLessons.filter(l => l.id !== id));
  };

  const handleUpdateLessonField = (id: string, field: 'title' | 'description', val: string) => {
    setCourseLessons(courseLessons.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const handleAddResourceToLesson = (lessonId: string, type: 'slides' | 'pdf' | 'video') => {
    setCourseLessons(courseLessons.map(l => {
      if (l.id !== lessonId) return l;
      const resName = type === 'slides' ? 'Slides: Lesson Deck' : type === 'pdf' ? 'PDF: Reading Manual' : 'Video: Hands-on Sandbox Tutorial';
      const newRes: Resource = {
        id: `res-${Date.now()}-${l.resources.length + 1}`,
        name: resName,
        type,
        url: '#',
        content: type === 'slides' 
          ? 'Slide 1: Overview\nSlide 2: Technical Specifications' 
          : 'Detailed course documentation and operational guidelines for instructors.'
      };
      return { ...l, resources: [...l.resources, newRes] };
    }));
  };

  const handleUpdateResourceField = (lessonId: string, resourceId: string, field: 'name' | 'content' | 'url', val: string) => {
    setCourseLessons(courseLessons.map(l => {
      if (l.id !== lessonId) return l;
      return {
        ...l,
        resources: l.resources.map(r => r.id === resourceId ? { ...r, [field]: val } : r)
      };
    }));
  };

  const handleRemoveResourceFromLesson = (lessonId: string, resourceId: string) => {
    setCourseLessons(courseLessons.map(l => {
      if (l.id !== lessonId) return l;
      return {
        ...l,
        resources: l.resources.filter(r => r.id !== resourceId)
      };
    }));
  };

  // ---- FILTERS FOR SURVEYS ----
  const filteredSurveys = surveys.filter((s) => {
    const matchesSearch =
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.additionalComments.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCenter = centerFilter === 'All' || s.center === centerFilter;
    const matchesCourse = courseFilter === 'All' || s.courseName === courseFilter;
    const matchesSeverity =
      severityFilter === 'All' ||
      (severityFilter === 'Alerts Only' && s.hadIssue === 'Yes') ||
      (s.hadIssue === 'Yes' && s.severity === severityFilter);

    return matchesSearch && matchesCenter && matchesCourse && matchesSeverity;
  });

  const getRatingIcon = (rating: number) => {
    if (rating >= 4) return <Smile className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (rating >= 3) return <Meh className="w-5 h-5 text-amber-500 shrink-0" />;
    return <Frown className="w-5 h-5 text-red-500 shrink-0" />;
  };

  return (
    <div className="space-y-8">
      {/* HEADER BAR */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-red-400">
            <span className="font-extrabold uppercase font-display tracking-wider">New Horizons Systems</span>
            <span>•</span>
            <span className="text-slate-400 font-semibold">Training Operations Management</span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-100 mt-1.5 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Performance & Pulse Dashboard
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Analyze syllabus completion pacing, review weekly student complaints, and manage operational configs & classes
          </p>
        </div>

        {/* ADMIN TAB SELECTORS */}
        <div className="flex flex-wrap bg-slate-800 p-1 rounded-lg border border-slate-700 w-full md:w-auto">
          {[
            { id: 'Analytics', label: 'Operational Overview' },
            { id: 'Instructors', label: 'Instructors' },
            { id: 'Students', label: 'Students' },
            { id: 'Surveys', label: `Student Pulse (${surveys.length})` },
            { id: 'InstructorLogs', label: 'Instructor Logs' },
            { id: 'Reports', label: 'Reports & Certificates' },
            { id: 'Config', label: 'Operations Hub' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                adminTab === tab.id
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI METRICS SHELF */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Classes</span>
            <span className="text-2xl font-extrabold font-display text-slate-900">{totalActiveClasses}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hours Instructed</span>
            <span className="text-2xl font-extrabold font-display text-slate-900">{totalHoursLogged} hrs</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Syllabus Pct</span>
            <span className="text-2xl font-extrabold font-display text-slate-900">{avgCourseProgress}%</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Active Student Alerts</span>
            <span className="text-2xl font-extrabold font-display text-red-600">
              {activeStudentIssues.length} <span className="text-xs text-red-400 font-normal">({urgentStudentIssues.length} Urgent)</span>
            </span>
          </div>
        </div>
      </div>

      {/* CORE ADMIN CONTENT BOX */}
      <AnimatePresence mode="wait">
        {adminTab === 'Analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Class syllabus list - Left column */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold font-display text-slate-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  Syllabus Progress Tracker (Class Level)
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Syllabus compliance categorized by completed checklist weights</p>
              </div>

              <div className="space-y-5">
                {classes.map((c) => {
                  const done = c.modules.filter((m) => m.done).length;
                  const total = c.modules.length;
                  const pct = total ? Math.round((done / total) * 100) : 0;

                  let progressColor = 'bg-red-500';
                  let borderBadgeColor = 'text-red-700 bg-red-50 border-red-200';
                  if (pct >= 70) {
                    progressColor = 'bg-emerald-500';
                    borderBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  } else if (pct >= 30) {
                    progressColor = 'bg-amber-500';
                    borderBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                  }

                  return (
                    <div key={c.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[9px] font-extrabold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            {c.scheduleType} • {c.timeSlot} • {c.classroom}
                          </span>
                          <h4 className="font-bold text-slate-800 font-display text-sm leading-snug mt-2">{c.courseName}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">Instructor: {c.instructorName}</p>
                          <p className="text-[10px] text-slate-400">Class Term: {c.startDate || 'N/A'} to {c.endDate || 'N/A'}</p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${borderBadgeColor}`}>
                          {pct}% Completed
                        </span>
                      </div>

                      <div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>{done} of {total} modules covered</span>
                          <span>Total syllabus duration: {c.totalDurationHours} hrs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructor hours tally - Right column */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold font-display text-slate-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Instructor Teaching Hours
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Total instruction hours logged</p>
              </div>

              <div className="divide-y divide-slate-100">
                {instructorHoursBreakdown.map((instructor) => (
                  <div key={instructor.email} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-xs truncate">{instructor.name}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          instructor.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {instructor.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{instructor.center} | {instructor.classCount} classes</p>
                      
                      {/* Secure Status Toggle Button */}
                      <button
                        onClick={() => {
                          const isAct = String(instructor.status).toUpperCase() === 'ACTIVE';
                          handleStatusChange(instructor.id, instructor.name, isAct ? 'SUSPENDED' : 'ACTIVE');
                        }}
                        className={`text-[9px] font-extrabold mt-1 uppercase cursor-pointer hover:underline transition-all ${
                          String(instructor.status).toUpperCase() === 'ACTIVE' ? 'text-red-600 hover:text-red-500' : 'text-emerald-600 hover:text-emerald-500'
                        }`}
                      >
                        {String(instructor.status).toUpperCase() === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-extrabold font-display text-slate-900 text-sm">{instructor.hours} hrs</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Logged Duration</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* INSTRUCTORS ADMINISTRATION PANEL */}
        {adminTab === 'Instructors' && (
          <motion.div
            key="instructors-admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={instructorSearch}
                  onChange={(e) => { setInstructorSearch(e.target.value); setInstPage(1); }}
                  className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                  <select
                    value={instStatusFilter}
                    onChange={(e) => { setInstStatusFilter(e.target.value); setInstPage(1); }}
                    className="border border-slate-200 bg-slate-50 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Center Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Center:</span>
                  <select
                    value={instCenterFilter}
                    onChange={(e) => { setInstCenterFilter(e.target.value); setInstPage(1); }}
                    className="border border-slate-200 bg-slate-50 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                  >
                    <option value="All">All Centers</option>
                    {config.centers.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                </div>

                {/* Course Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Course:</span>
                  <select
                    value={instCourseFilter}
                    onChange={(e) => { setInstCourseFilter(e.target.value); setInstPage(1); }}
                    className="border border-slate-200 bg-slate-50 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                  >
                    <option value="All">All Courses</option>
                    {config.courses.flatMap(cat => cat.items).map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main content grid */}
            {instLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                <p className="text-slate-400 text-xs font-semibold mt-4">Syncing real-time records from Neon PostgreSQL...</p>
              </div>
            ) : instError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                <p className="text-red-600 text-xs font-semibold">{instError}</p>
                <button onClick={fetchAdminInstructors} className="mt-3 text-xs font-bold text-white bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition-all cursor-pointer">Retry Fetch</button>
              </div>
            ) : dbInstructors.length === 0 ? (
              <div className="bg-slate-50 p-12 text-center rounded-2xl border border-dashed border-slate-200">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Instructors Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No records match your selected search terms or status filters. Try resetting filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dbInstructors.map((inst, instIdx) => {
                    const statusColors: any = {
                      PENDING: "bg-yellow-50 text-yellow-800 border-yellow-300",
                      ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      SUSPENDED: "bg-amber-50 text-amber-800 border-amber-300",
                      REJECTED: "bg-rose-50 text-rose-700 border-rose-200"
                    };

                    const statusLabels: any = {
                      PENDING: "Pending Approval",
                      ACTIVE: "Active",
                      SUSPENDED: "Suspended",
                      REJECTED: "Rejected"
                    };

                    const instSt = String(inst.status || 'ACTIVE').toUpperCase();

                    return (
                      <div
                        key={inst.id ? `${inst.id}-${instIdx}` : instIdx}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{inst.firstName} {inst.lastName}</h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{inst.email}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${statusColors[instSt] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {statusLabels[instSt] || instSt}
                            </span>
                          </div>

                          <div className="space-y-2 mt-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Centre Scope:</span>
                              <span className="font-semibold text-slate-800">{inst.center || "Unassigned"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Assigned Role:</span>
                              <span className="font-semibold text-red-600 font-mono text-[10px]">{inst.role}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-1">Teaching Competencies:</span>
                              <div className="flex flex-wrap gap-1">
                                {inst.courses && inst.courses.length > 0 ? (
                                  inst.courses.map((c: string, cIdx: number) => (
                                    <span key={`${c}-${cIdx}`} className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                                      {c}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">None assigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5 mt-5 pt-3 border-t border-slate-100 items-center">
                          {instSt === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleApproveInstructor(inst.id, `${inst.firstName} ${inst.lastName}`)}
                                className="flex-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg py-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectInstructor(inst.id, `${inst.firstName} ${inst.lastName}`)}
                                className="flex-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg py-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          ) : instSt === 'ACTIVE' ? (
                            <button
                              onClick={() => handleStatusChange(inst.id, `${inst.firstName} ${inst.lastName}`, 'SUSPENDED')}
                              className="flex-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg py-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(inst.id, `${inst.firstName} ${inst.lastName}`, 'ACTIVE')}
                              className="flex-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg py-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedInstructor(inst);
                              setEditFirstName(inst.firstName);
                              setEditLastName(inst.lastName);
                              setEditGender(inst.gender || 'Prefer not to say');
                              setEditCenter(inst.center || '');
                              setEditCourses(inst.courses || []);
                              setIsEditingProfile(false);
                              setIsDetailDrawerOpen(true);
                            }}
                            className="flex-1 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-100 transition-all cursor-pointer active:scale-95 text-center"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => handleDeleteInstructor(inst.id, `${inst.firstName} ${inst.lastName}`)}
                            title="Permanently Delete Instructor Account"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination bar */}
                {instTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 py-4 border-t border-slate-100 mt-4">
                    <button
                      disabled={instPage === 1}
                      onClick={() => setInstPage(prev => Math.max(1, prev - 1))}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      Page {instPage} of {instTotalPages}
                    </span>
                    <button
                      disabled={instPage === instTotalPages}
                      onClick={() => setInstPage(prev => Math.min(instTotalPages, prev + 1))}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* STUDENTS ADMINISTRATION PANEL */}
        {adminTab === 'Students' && (
          <motion.div
            key="students-admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-grow">
                <div className="relative flex-grow max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name, email, number..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <select
                  value={studentCenterFilter}
                  onChange={(e) => setStudentCenterFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Centers</option>
                  {config.centers.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending Activation</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <button
                onClick={() => setIsStudentModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Register New Student
              </button>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Student Number</th>
                      <th className="py-3.5 px-4">Center</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {studentLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">Loading students...</td>
                      </tr>
                    ) : dbStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">No students registered yet. Click "Register New Student" to add one.</td>
                      </tr>
                    ) : (
                      dbStudents.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{stu.firstName} {stu.lastName}</div>
                            <div className="text-[11px] text-slate-400">{stu.email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{stu.studentNumber || 'N/A'}</td>
                          <td className="py-3.5 px-4 font-medium">{stu.center || 'Headquarters'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              String(stu.status).toUpperCase() === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {stu.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{stu.phone || 'No phone'}</td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleStudentStatus(stu.id, stu.status)}
                              className={`px-2.5 py-1 font-semibold text-[11px] rounded-lg transition-all cursor-pointer ${
                                String(stu.status).toUpperCase() === 'ACTIVE'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {String(stu.status).toUpperCase() === 'ACTIVE' ? 'Suspend' : 'Activate Account'}
                            </button>
                            <button
                              onClick={() => handleReinviteStudent(stu.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                            >
                              Reset Password
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(stu.id, stu.firstName, stu.lastName)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* STUDENT SURVEYS TAB */}
        {adminTab === 'Surveys' && (
          <motion.div
            key="surveys"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Filters Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
              <div className="flex justify-between items-center text-slate-800">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Search & Filters</h4>
                </div>
                <button
                  onClick={exportSurveysToCsv}
                  disabled={filteredSurveys.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Export matching surveys as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export filtered to CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search text */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Keywords</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search comments, names..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 pl-8 border border-slate-300 rounded-lg text-xs"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                {/* Center Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Center</label>
                  <select
                    value={centerFilter}
                    onChange={(e) => setCenterFilter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="All">All Centers</option>
                    {config.centers.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course</label>
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="All">All Courses</option>
                    {config.courses.flatMap((cat) => cat.items).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alerts/Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="All">All Responses</option>
                    <option value="Alerts Only">All Classroom Issues</option>
                    <option value="Low">Low Severity Issues</option>
                    <option value="Medium">Medium Severity Issues</option>
                    <option value="High">High Severity Issues</option>
                    <option value="Urgent">Urgent Blockers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Surveys List */}
            <div className="space-y-4">
              {filteredSurveys.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                  No matching student pulse survey responses found for filters.
                </div>
              ) : (
                filteredSurveys.map((survey) => (
                  <div
                    key={survey.id}
                    className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all hover:shadow-md ${
                      survey.hadIssue === 'Yes'
                        ? survey.severity === 'Urgent' || survey.severity === 'High'
                          ? 'border-l-4 border-l-red-500 border-slate-200'
                          : 'border-l-4 border-l-amber-500 border-slate-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800">
                            {survey.anonymous ? 'Anonymous Student' : survey.studentName}
                          </span>
                          <span className="text-slate-300 text-xs">|</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                            {survey.center} Center
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 font-display mt-1">{survey.courseName}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">
                          Week ending: {survey.weekEnding}
                        </span>
                        {survey.hadIssue === 'Yes' && (
                          <span
                            className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                              survey.severity === 'Urgent' || survey.severity === 'High'
                                ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            🚨 {survey.severity || 'Issue'} Alert
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Numeric rating matrices */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Weekly Pace</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getRatingIcon(survey.pace)}
                          <span className="text-xs font-bold text-slate-700">
                            {survey.pace === 5 ? 'Too Fast (5)' : survey.pace === 1 ? 'Too Slow (1)' : `Balanced (${survey.pace})`}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Instruction Clarity</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getRatingIcon(survey.clarity)}
                          <span className="text-xs font-bold text-slate-700">{survey.clarity}/5 Stars</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Overall satisfaction</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getRatingIcon(survey.overallSatisfaction)}
                          <span className="text-xs font-bold text-slate-700">{survey.overallSatisfaction}/5</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Topic Confidence</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getRatingIcon(survey.confidence)}
                          <span className="text-xs font-bold text-slate-700">{survey.confidence}/5 Index</span>
                        </div>
                      </div>
                    </div>

                    {/* Complained Issues */}
                    {survey.hadIssue === 'Yes' && (
                      <div className="bg-red-50/30 border border-red-100 rounded-xl p-4 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {survey.issueCategories.map((cat) => (
                            <span key={cat} className="text-[9px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded border border-red-200">
                              {cat}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-red-950 font-medium italic">"{survey.issueDescription}"</p>
                        <div className="flex gap-4 text-[10px] text-slate-500 pt-1 border-t border-red-100/50">
                          <span>Repeat Issue: <strong className="text-slate-700">{survey.repeatIssue || 'No'}</strong></span>
                          <span>Tools worked: <strong className="text-slate-700">{survey.toolsWorked}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Standard Feedback */}
                    {survey.additionalComments && (
                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <strong className="text-slate-700 block mb-1">Additional Student Voice:</strong>
                        <p className="italic">"{survey.additionalComments}"</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* INSTRUCTOR WEEKLY LOGS TAB */}
        {adminTab === 'InstructorLogs' && (
          <motion.div
            key="instructor-logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold font-display text-slate-900 text-sm">Instructor Classroom Compliance Audits</h3>
                  <p className="text-slate-500 text-xs">Review formal self-reported logs mapping classroom durations, covered modules, and challenges</p>
                </div>
                <button
                  onClick={exportLogsToCsv}
                  disabled={logs.length === 0}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Export all compliance logs to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Logs to CSV
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No classroom compliance logs filed yet.</div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => {
                    const matchedClass = classes.find((c) => c.id === log.classId);
                    return (
                      <div key={log.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Log Entry</span>
                            <span className="text-xs font-bold text-slate-800">Class: {matchedClass ? matchedClass.courseName : 'Unknown Course'}</span>
                            <span className="text-[10px] text-slate-500 block">Logged by: {instructors.find(i => i.id === log.instructorId)?.firstName || 'Instructor'}</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs bg-red-100 text-red-800 border border-red-200 font-extrabold px-2.5 py-1 rounded-full">
                              Week {log.weekNumber} Report
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">Logged at: {new Date(log.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Teaching Hours</span>
                            <p className="text-sm font-extrabold text-slate-800">{log.hoursLogged} hours this week</p>
                          </div>
                          <div className="p-3 bg-white border border-slate-100 rounded-lg">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Classroom Reference</span>
                            <p className="text-sm font-extrabold text-slate-800">{matchedClass?.classroom || 'N/A'}</p>
                          </div>
                        </div>

                        {log.modulesCoveredThisWeek.length > 0 && (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-600 block">Covered Syllabus Items:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.modulesCoveredThisWeek.map((id) => {
                                const modName = matchedClass?.modules.find((m) => m.id === id)?.name || 'Module';
                                return (
                                  <span key={id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                    ✓ {modName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {log.challenges && (
                          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs">
                            <span className="font-bold text-amber-800 block">Instructor Challenge Notes:</span>
                            <p className="italic text-slate-600 mt-1">"{log.challenges}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* REPORTS & CERTIFICATES TAB */}
        {adminTab === 'Reports' && (
          <motion.div
            key="reports-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AdminReportsTab config={config} classes={classes} />
          </motion.div>
        )}

        {adminTab === 'Profile' && (
          <motion.div
            key="profile-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ProfileForm />
          </motion.div>
        )}

        {/* OPERATIONS CONFIG & CURRICULUM HUB */}
        {adminTab === 'Config' && (
          <motion.div
            key="config-manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* SUB-TABS BAR FOR OPS */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setOpsSection('classes')}
                className={`px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                  opsSection === 'classes' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Manage Classes ({classes.length})
              </button>
              <button
                onClick={() => setOpsSection('courses')}
                className={`px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                  opsSection === 'courses' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Advanced Curriculums ({courses.length})
              </button>
              <button
                onClick={() => setOpsSection('centers')}
                className={`px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                  opsSection === 'centers' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Centers Setup
              </button>
              <button
                onClick={() => setOpsSection('exams')}
                className={`px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
                  opsSection === 'exams' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Competency Exams ({examAttempts.length})
              </button>
            </div>

            {configSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>{configSuccess}</span>
              </div>
            )}

            {/* SECTION 1: MANAGE CLASSES (CRUD) */}
            {opsSection === 'classes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Active Class Operational Roster</h3>
                    <p className="text-slate-500 text-xs">Create, edit, adjust dates, or delete active class setups</p>
                  </div>
                  {!showClassForm && (
                    <button
                      onClick={() => {
                        setClassFormMode('create');
                        setClassCourse(courses[0]?.name || '');
                        setClassInstructor(instructors[0]?.id || '');
                        setClassDuration(40);
                        setClassRoom('Lab 1');
                        setClassStartDate('2026-07-15');
                        setClassEndDate('2026-08-15');
                        setClassSchedule('Weekday');
                        setClassTimeSlot('Morning');
                        setClassModulesText('Module 1: Foundations\nModule 2: Practical Exercises\nModule 3: Project and Capstone');
                        setShowClassForm(true);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Class
                    </button>
                  )}
                </div>

                {/* Class Creator/Editor Form */}
                {showClassForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-md"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {classFormMode === 'create' ? 'Create New Class' : 'Edit Class Configuration'}
                      </h4>
                      <button
                        onClick={() => setShowClassForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSubmitClassForm} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Select Course Syllabus</label>
                          <select
                            value={classCourse}
                            required
                            onChange={(e) => setClassCourse(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="">Select course...</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Assign Instructor</label>
                          <select
                            value={classInstructor}
                            required
                            onChange={(e) => setClassInstructor(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="">Select instructor...</option>
                            {instructors.map((i) => (
                              <option key={i.id} value={i.id}>{i.firstName} {i.lastName} ({i.center})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Classroom / Lab ID</label>
                          <input
                            type="text"
                            required
                            value={classRoom}
                            onChange={(e) => setClassRoom(e.target.value)}
                            placeholder="e.g. Lab 4"
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Total Course Duration (Hours)</label>
                          <input
                            type="number"
                            required
                            value={classDuration}
                            onChange={(e) => setClassDuration(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Schedule Session Type</label>
                          <select
                            value={classSchedule}
                            onChange={(e) => setClassSchedule(e.target.value as any)}
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
                          <p className="text-[10px] text-slate-400 mb-1">Either only Morning or Afternoon sessions per operations</p>
                          <select
                            value={classTimeSlot}
                            onChange={(e) => setClassTimeSlot(e.target.value as any)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            required
                            value={classStartDate}
                            onChange={(e) => setClassStartDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                          <input
                            type="date"
                            required
                            value={classEndDate}
                            onChange={(e) => setClassEndDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {classFormMode === 'create' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus Modules (One per line)</label>
                          <p className="text-[10px] text-slate-400 mb-1">These will generate checklist weights for compliance tracking</p>
                          <textarea
                            rows={3}
                            value={classModulesText}
                            onChange={(e) => setClassModulesText(e.target.value)}
                            placeholder="Module 1: Introduction&#10;Module 2: Deep Dive&#10;Module 3: Hands-on Labs"
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Class Setup
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClassForm(false)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Classes Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200">
                          <th className="p-4">Course & Classroom</th>
                          <th className="p-4">Instructor</th>
                          <th className="p-4">Timeline (Start / End)</th>
                          <th className="p-4">Schedule Details</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {classes.map((cls) => (
                          <tr key={cls.id} className="hover:bg-slate-50/50">
                            <td className="p-4">
                              <span className="font-bold text-slate-900 block">{cls.courseName}</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{cls.classroom}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-slate-700 block">{cls.instructorName}</span>
                            </td>
                            <td className="p-4">
                              <span className="block font-medium text-slate-600">{cls.startDate || 'N/A'}</span>
                              <span className="block text-[10px] text-slate-400">to {cls.endDate || 'N/A'}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                {cls.scheduleType} • {cls.timeSlot}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-1">{cls.days.join(', ')}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                cls.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                cls.status === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {cls.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleEditClassClick(cls)}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
                                title="Edit Class"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete this class? This action is irreversible.`)) {
                                    onDeleteClass(cls.id);
                                    setConfigSuccess(`Class deleted successfully!`);
                                    setTimeout(() => setConfigSuccess(''), 2500);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Class"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: CURRICULUMS AND SYLLABUS OPERATIONS (CRUD) */}
            {opsSection === 'courses' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 border border-slate-200 rounded-xl gap-4 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Rich Course Curriculums</h3>
                    <p className="text-slate-500 text-xs">Manage detailed course descriptions, outlines, and teaching slides/documents per lesson</p>
                  </div>
                  {!showCourseForm && (
                    <button
                      onClick={() => {
                        setCourseFormMode('create');
                        setCourseName('');
                        setCourseCategory(config.courses[0]?.category || 'IT Infrastructure');
                        setCourseDescription('');
                        setCourseLessons([]);
                        setAiPromptTopic('');
                        setShowCourseForm(true);
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Author New Course
                    </button>
                  )}
                </div>

                {/* Course Authoring Form */}
                {showCourseForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-6"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {courseFormMode === 'create' ? 'Author New Course Curriculum' : 'Edit Course Details & Lessons'}
                      </h4>
                      <button
                        onClick={() => setShowCourseForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* GEMINI CURRICULUM AUTHOR ASSISTANT */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                          <h5 className="font-bold text-xs">Gemini AI Curriculum Authoring Assistant</h5>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                          Server-side Secure
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Input a topic (e.g. "Generative AI Development") and category. Gemini will generate a professional curriculum, lessons, and teaching resource slides/text!
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Topic for Gemini to draft... e.g. AWS Cloud Security Practitioner"
                          value={aiPromptTopic}
                          onChange={(e) => setAiPromptTopic(e.target.value)}
                          className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          disabled={isAiGenerating}
                          onClick={handleAiGenerateCourse}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:bg-indigo-300"
                        >
                          {isAiGenerating ? 'Drafting...' : <><Sparkles className="w-3.5 h-3.5" /> AI Draft Outline</>}
                        </button>
                      </div>
                      {aiError && <p className="text-red-500 text-[10px] font-semibold">{aiError}</p>}
                    </div>

                    <form onSubmit={handleSubmitCourseForm} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Course Name</label>
                          <input
                            type="text"
                            required
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            placeholder="e.g. Advanced Cybersecurity"
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Category Group</label>
                          <select
                            value={courseCategory}
                            required
                            onChange={(e) => setCourseCategory(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                          >
                            {config.courses.map(cat => (
                              <option key={cat.category} value={cat.category}>{cat.category}</option>
                            ))}
                            <option value="Advanced Systems">Advanced Systems</option>
                            <option value="Artificial Intelligence">Artificial Intelligence</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Course Summary / Description</label>
                        <textarea
                          rows={3}
                          value={courseDescription}
                          onChange={(e) => setCourseDescription(e.target.value)}
                          placeholder="Provide a detailed outline summary..."
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      {/* LESSONS BUILDER (COURSE OUTLINE) */}
                      <div className="border-t border-slate-200 pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Lessons / Syllabus Outline</h5>
                          <button
                            type="button"
                            onClick={handleAddLessonToForm}
                            className="px-2 py-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Lesson Unit
                          </button>
                        </div>

                        {courseLessons.length === 0 ? (
                          <p className="text-center py-6 text-slate-400 text-xs italic">No lessons defined yet. Click 'Add Lesson' or utilize Gemini AI draft above.</p>
                        ) : (
                          <div className="space-y-4">
                            {courseLessons.map((lesson, lIdx) => (
                              <div key={lesson.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lesson Unit {lIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLessonFromForm(lesson.id)}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                                  >
                                    Remove Lesson
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Lesson Title</label>
                                    <input
                                      type="text"
                                      required
                                      value={lesson.title}
                                      onChange={(e) => handleUpdateLessonField(lesson.id, 'title', e.target.value)}
                                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Lesson Objectives</label>
                                    <input
                                      type="text"
                                      required
                                      value={lesson.description}
                                      onChange={(e) => handleUpdateLessonField(lesson.id, 'description', e.target.value)}
                                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>

                                {/* RESOURCES PER LESSON */}
                                <div className="border-t border-slate-100 pt-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500">Instructor Study Resources (Read/View/Play)</span>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleAddResourceToLesson(lesson.id, 'slides')}
                                        className="text-[9px] bg-white border px-1.5 py-0.5 rounded hover:bg-slate-50 font-semibold"
                                      >
                                        + Slides
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddResourceToLesson(lesson.id, 'pdf')}
                                        className="text-[9px] bg-white border px-1.5 py-0.5 rounded hover:bg-slate-50 font-semibold"
                                      >
                                        + PDF Manual
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddResourceToLesson(lesson.id, 'video')}
                                        className="text-[9px] bg-white border px-1.5 py-0.5 rounded hover:bg-slate-50 font-semibold"
                                      >
                                        + Video
                                      </button>
                                    </div>
                                  </div>

                                  {lesson.resources.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">No slide, PDF, or video study materials added for this lesson.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {lesson.resources.map((res) => (
                                        <div key={res.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">
                                              Type: {res.type}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveResourceFromLesson(lesson.id, res.id)}
                                              className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                            >
                                              Remove Resource
                                            </button>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-3">
                                              <div>
                                                <label className="block text-[9px] text-slate-500 uppercase font-bold">Resource Display Name</label>
                                                <input
                                                  type="text"
                                                  required
                                                  value={res.name}
                                                  onChange={(e) => handleUpdateResourceField(lesson.id, res.id, 'name', e.target.value)}
                                                  className="w-full p-1.5 border border-slate-300 rounded text-xs mt-0.5"
                                                />
                                              </div>
                                              
                                              {/* Cloudflare R2 Upload Component */}
                                              <FileUploader
                                                currentUrl={res.url !== "#" ? res.url : ""}
                                                onUploadSuccess={(url) => handleUpdateResourceField(lesson.id, res.id, 'url', url)}
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] text-slate-500 uppercase font-bold">
                                                {res.type === 'slides' ? 'Slide Deck Contents (Use newline for separate slides)' : res.type === 'pdf' ? 'PDF Study Content (Paragraphs of study reading)' : 'Video Lecture Script/Overview'}
                                              </label>
                                              <textarea
                                                rows={5}
                                                required
                                                value={res.content || ''}
                                                onChange={(e) => handleUpdateResourceField(lesson.id, res.id, 'content', e.target.value)}
                                                className="w-full p-1.5 border border-slate-300 rounded text-xs mt-0.5 font-mono"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Save Curriculum Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCourseForm(false)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Course List rendering */}
                <div className="space-y-4">
                  {courses.map((course) => {
                    const isExpanded = expandedCourseId === course.id;
                    return (
                      <div key={course.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-5 flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {course.category}
                              </span>
                            </div>
                            <h4 className="font-extrabold font-display text-slate-900 text-sm mt-1.5">{course.name}</h4>
                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{course.description}</p>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-lg text-slate-600 flex items-center gap-1 transition-all"
                            >
                              {isExpanded ? 'Hide Outline' : 'View Outline'}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleEditCourseClick(course)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                              title="Edit Course"
                            >
                              <Edit className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete course ${course.name}? This removes its syllabus entirely.`)) {
                                  onDeleteCourseRich(course.id);
                                  setConfigSuccess(`Course ${course.name} deleted successfully!`);
                                  setTimeout(() => setConfigSuccess(''), 2500);
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                              title="Delete Course"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Course Outline Details */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Course Lessons & Lesson Study Materials</h5>
                            
                            {(course.lessons || []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No detailed lessons configured for this course syllabus. Click edit to author them.</p>
                            ) : (
                              <div className="space-y-4">
                                {course.lessons.map((lesson, idx) => (
                                  <div key={lesson.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                                    <h6 className="font-bold text-slate-800 text-xs">
                                      Unit {idx + 1}: {lesson.title}
                                    </h6>
                                    <p className="text-slate-500 text-[11px] mt-0.5">{lesson.description}</p>
                                    
                                    {/* Resources listing */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {(lesson.resources || []).map((res) => (
                                        <span
                                          key={res.id}
                                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                                            res.type === 'slides' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                            res.type === 'pdf' ? 'bg-red-50 border-red-200 text-red-700' :
                                            'bg-emerald-50 border-emerald-200 text-emerald-700'
                                          }`}
                                        >
                                          {res.type === 'slides' && <Layers className="w-3 h-3" />}
                                          {res.type === 'pdf' && <FileText className="w-3 h-3" />}
                                          {res.type === 'video' && <Play className="w-3 h-3" />}
                                          {res.name} (View-Only)
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: CENTERS MANAGEMENT */}
            {opsSection === 'centers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Centers configuration card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold font-display text-slate-900 text-sm">Add Training Centers</h3>
                  </div>

                  <form onSubmit={handleCreateCenter} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Center Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Abuja"
                        value={newCenter}
                        onChange={(e) => setNewCenter(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors"
                    >
                      Create Center
                    </button>
                  </form>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Active Centers List</label>
                    <div className="flex flex-wrap gap-2">
                      {config.centers.map((center) => (
                        <span key={center} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                          {center}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center space-y-3">
                  <Sliders className="w-10 h-10 text-slate-400" />
                  <h4 className="font-bold text-slate-800 text-sm">Operations Guidelines</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Changes made inside the Operations Hub directly synchronize with the live Student Pulse Survey Select list indices and the Instructor Class creation views instantly.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 4: INSTRUCTOR EVALUATION COMPETE CY EXAM LOGS */}
            {opsSection === 'exams' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold font-display text-slate-900 text-sm">Instructor Competency Evaluation History</h3>
                  <p className="text-slate-500 text-xs">Review formal Gemini AI generated and graded evaluation outcomes. Pass threshold is strictly 70% with 2 trial attempts.</p>
                </div>

                {examAttempts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No instructor competency exams logged in system yet. Instructors take exams inside their Staff Portal.</div>
                ) : (
                  <div className="space-y-4">
                    {examAttempts.map((attempt) => {
                      const instructor = instructors.find(i => i.id === attempt.instructorId);
                      return (
                        <div key={attempt.id} className={`border rounded-xl p-4 bg-slate-50/50 space-y-3 border-l-4 ${
                          attempt.passed ? 'border-l-emerald-500 border-slate-200' : 'border-l-red-500 border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block">Trial Attempt Log</span>
                              <span className="font-bold text-slate-800 text-xs">
                                Instructor: {instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Instructor'} ({instructor?.email})
                              </span>
                              <p className="text-[11px] text-slate-600 mt-1 font-medium">Evaluation Course: {attempt.courseName}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className={`inline-block text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${
                                attempt.passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {attempt.passed ? 'Passed (✓ Competent)' : 'Failed (✗ Not Certified)'}
                              </span>
                              <p className="text-xs font-bold text-slate-800 mt-1">Score: {attempt.score}%</p>
                              <span className="text-[9px] text-slate-400 block">Trial Attempt: {attempt.trialNumber} of 2</span>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-lg p-3 text-xs text-slate-600 italic leading-relaxed">
                            <strong className="text-slate-800 block not-italic mb-1">AI Assessor Mentor Feedback:</strong>
                            "{attempt.feedback}"
                          </div>
                          
                          <p className="text-[9px] text-slate-400 text-right">Taken on: {new Date(attempt.takenAt).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED INSTRUCTOR DRAWER */}
      <AnimatePresence>
        {isDetailDrawerOpen && selectedInstructor && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsDetailDrawerOpen(false)}
            />
            
            {/* Drawer container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">Instructor Administration</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedInstructor.email} • {selectedInstructor.center || 'Center not specified'}</p>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm cursor-pointer text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* Pending Status Banner */}
                {selectedInstructor.status === 'PENDING' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex gap-2 items-start">
                      <ShieldCheck className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-yellow-800">Pending Profile Activation</h4>
                        <p className="text-[11px] text-yellow-700 mt-0.5">This instructor has registered and is waiting for administrator credentials verification.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 mt-1.5">
                      <button
                        onClick={() => handleApproveInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                        className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 transition-all cursor-pointer"
                      >
                        Approve Profile
                      </button>
                      <button
                        onClick={() => handleRejectInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                        className="flex-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-1.5 transition-all cursor-pointer"
                      >
                        Reject Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Form or Display Details */}
                {isEditingProfile ? (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">Edit Instructor Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">First Name</label>
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gender</label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Center Scope</label>
                      <select
                        value={editCenter}
                        onChange={(e) => setEditCenter(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white animate-none"
                      >
                        <option value="">Select Center...</option>
                        {config.centers.map(center => (
                          <option key={center} value={center}>{center}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teaching Competencies</label>
                      <div className="grid grid-cols-2 gap-2 mt-1 bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                        {config.courses.flatMap(cat => cat.items).map(course => {
                          const checked = editCourses.includes(course);
                          return (
                            <label key={course} className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setEditCourses(prev => prev.filter(c => c !== course));
                                  } else {
                                    setEditCourses(prev => [...prev, course]);
                                  }
                                }}
                                className="accent-red-500 rounded"
                              />
                              {course}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleSaveProfileEdit(selectedInstructor.id)}
                        className="flex-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg py-2 transition-all cursor-pointer"
                      >
                        Save Profile
                      </button>
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg py-2 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Basic details cards */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="absolute right-3 top-3 text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded px-2.5 py-1 text-slate-600 transition-all cursor-pointer"
                      >
                        Edit Details
                      </button>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Instructor Profile</h4>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Full Name</span>
                          <span className="font-bold text-slate-800">{selectedInstructor.firstName} {selectedInstructor.lastName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Email Address</span>
                          <span className="font-bold text-slate-800">{selectedInstructor.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Gender</span>
                          <span className="font-bold text-slate-800">{selectedInstructor.gender || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Center Assigned</span>
                          <span className="font-bold text-slate-800">{selectedInstructor.center || "Not assigned"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Change Role Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Administrative Role ({selectedInstructor.role})</h4>
                      <div className="flex gap-2">
                        {['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                          <button
                            key={r}
                            disabled={selectedInstructor.role === r}
                            onClick={() => handleRoleChange(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`, r)}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                              selectedInstructor.role === r
                                ? 'bg-red-50 border-red-200 text-red-600 font-extrabold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {r === 'INSTRUCTOR' ? 'Instructor' : r === 'ADMIN' ? 'Admin' : 'Super Admin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Management */}
                    {selectedInstructor.status !== 'PENDING' && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Account Access</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Toggle instructor system access credentials.</p>
                        </div>
                        <div>
                          {String(selectedInstructor.status).toUpperCase() === 'ACTIVE' ? (
                            <button
                              onClick={() => handleStatusChange(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`, 'SUSPENDED')}
                              className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              Suspend Account
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`, 'ACTIVE')}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              Reactivate Account
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delete Instructor Account Section */}
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-rose-800">Permanent Account Deletion</h4>
                        <p className="text-[10px] text-rose-600 mt-0.5">Erase instructor account and all associated records permanently from system.</p>
                      </div>
                      <button
                        onClick={() => handleDeleteInstructor(selectedInstructor.id, `${selectedInstructor.firstName} ${selectedInstructor.lastName}`)}
                        className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit Logs / Activity History list inside drawer */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-400" />
                    Operational Audit History
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-48 overflow-y-auto space-y-2.5">
                    <div className="flex gap-2 items-start text-[11px] text-slate-600">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold block text-slate-800">Profile Initial Registration</span>
                        <span className="text-slate-400 text-[9px] block">Self-registration from login workspace portal</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start text-[11px] text-slate-600">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <span className="font-semibold block text-slate-800">Competency Verification Checklist</span>
                        <span className="text-slate-400 text-[9px] block">Assigned and calibrated by centers coordinator</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION OVERLAY MODAL */}
      <AnimatePresence>
        {confirmationModal && confirmationModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setConfirmationModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-200 z-10"
            >
              <h3 className="text-sm font-extrabold text-slate-900 font-display flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                {confirmationModal.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{confirmationModal.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmationModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmationModal.onConfirm();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* REGISTER STUDENT MODAL */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsStudentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 z-10 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-red-500" />
                  Register New Student
                </h3>
                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {studentFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {studentFormError}
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudentFirstName}
                      onChange={(e) => setNewStudentFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudentLastName}
                      onChange={(e) => setNewStudentLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Student Number (Optional)</label>
                    <input
                      type="text"
                      value={newStudentStudentNumber}
                      onChange={(e) => setNewStudentStudentNumber(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value)}
                      placeholder="+234..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Center</label>
                    <select
                      value={newStudentCenterId}
                      onChange={(e) => setNewStudentCenterId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="">Select Center...</option>
                      {config.centers.map((c: string) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                    <select
                      value={newStudentGender}
                      onChange={(e) => setNewStudentGender(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Create & Generate Code
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVATION CODE SUCCESS MODAL */}
      <AnimatePresence>
        {createdStudentResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setCreatedStudentResult(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                {createdStudentResult.isReinvite ? "Password Reset Successfully!" : "Student Created Successfully!"}
              </h3>
              <p className="text-xs text-slate-500">
                Share this auto-generated password with <strong className="text-slate-800">{createdStudentResult.firstName} {createdStudentResult.lastName}</strong> ({createdStudentResult.email}). They can use it to login to their portal account.
              </p>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-2xl tracking-[0.2em] text-slate-800 break-all select-all font-bold">
                {createdStudentResult.activationToken}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdStudentResult.activationToken);
                    alert("Password copied to clipboard!");
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm mb-2"
                >
                  Copy Password
                </button>
                <button
                  onClick={() => setCreatedStudentResult(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
