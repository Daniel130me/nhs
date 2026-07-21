import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Calendar, CheckCircle2, Clock, AlertTriangle, 
  FileText, Link as LinkIcon, Send, Save, RefreshCw, 
  ChevronRight, Award, HelpCircle, Loader2, LogOut, ArrowLeft, UploadCloud, Trash2,
  Bell, LifeBuoy, Shield, MessageSquare, Plus, Check, Info, AlertCircle, ThumbsUp
} from "lucide-react";

interface StudentPortalProps {
  currentStudent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  onLogout: () => Promise<void>;
}

interface ClassItem {
  id: string;
  courseName: string;
  classroom: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Assignment {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  totalMarks: number;
  dueAt: string | null;
  allowLateSubmission: boolean;
  maxAttempts: number;
  status: string;
  resources: Array<{ name: string; url: string }>;
}

interface Submission {
  id: string;
  assignmentId: string;
  attemptNumber: number;
  textContent: string | null;
  status: "DRAFT" | "SUBMITTED" | "LATE" | "RETURNED" | "GRADED";
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  files: Array<{ id: string; name: string; url: string }>;
}

interface Gradebook {
  assignments: Array<{ id: string; title: string; totalMarks: number; dueAt: string | null }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    grades: Record<string, {
      score: number | null;
      status: string;
      isLate: boolean;
      isMissing: boolean;
      feedback: string | null;
      attemptNumber: number;
      totalMarks: number;
    }>;
    totalEarned: number;
    totalPossible: number;
    percentage: number;
    missingCount: number;
    lateCount: number;
  }>;
}

export default function StudentPortal({ currentStudent, onLogout }: StudentPortalProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);

  // Top-level Student Navigation Tabs
  const [activeTab, setActiveTab] = useState<'classes' | 'campaigns' | 'support' | 'notifications'>('classes');

  // Backend Integration States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [supportCases, setSupportCases] = useState<any[]>([]);

  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Active Campaign Survey Filler state
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [surveyFormData, setSurveyFormData] = useState({
    pace: 3,
    clarity: 4,
    confidence: 4,
    materialsRating: 4,
    labRating: 4,
    hadIssue: false,
    issueSeverity: "MEDIUM",
    comments: "",
    autoCreateSupportCase: false,
  });
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [surveySuccess, setSurveySuccess] = useState<string | null>(null);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  // New Support Case form state
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    classId: "",
    category: "General Query",
    severity: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    subject: "",
    description: "",
  });
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseSuccess, setCaseSuccess] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Loaders
  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || data);
      }
    } catch (err) {
      console.error("Error loading notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Error marking notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Error marking all notifications as read", err);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setSurveySuccess(null);
    setSurveyError(null);
    try {
      const res = await fetch("/api/feedback/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data || data);
      }
    } catch (err) {
      console.error("Failed to load feedback campaigns", err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;

    setSubmittingSurvey(true);
    setSurveySuccess(null);
    setSurveyError(null);

    try {
      const res = await fetch(`/api/feedback/campaigns/${activeCampaign.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pace: surveyFormData.pace,
          clarity: surveyFormData.clarity,
          confidence: surveyFormData.confidence,
          materialsRating: surveyFormData.materialsRating,
          labRating: surveyFormData.labRating,
          hadIssue: surveyFormData.hadIssue,
          issueSeverity: surveyFormData.hadIssue ? surveyFormData.issueSeverity : null,
          comments: surveyFormData.comments,
          autoCreateSupportCase: surveyFormData.autoCreateSupportCase,
        })
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Failed to submit feedback response.");
      }

      setSurveySuccess("Your feedback pulse survey has been recorded successfully. Thank you for helping us improve!");
      setActiveCampaign(null);
      loadCampaigns();
      loadNotifications();
    } catch (err: any) {
      setSurveyError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const loadSupportCases = async () => {
    setLoadingSupport(true);
    setCaseSuccess(null);
    setCaseError(null);
    try {
      const res = await fetch("/api/support/cases");
      if (res.ok) {
        const data = await res.json();
        setSupportCases(data.data || data);
      }
    } catch (err) {
      console.error("Failed to load support cases", err);
    } finally {
      setLoadingSupport(false);
    }
  };

  const handleCreateSupportCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCase(true);
    setCaseSuccess(null);
    setCaseError(null);

    try {
      const res = await fetch("/api/support/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: newCaseData.classId || null,
          category: newCaseData.category,
          severity: newCaseData.severity,
          subject: newCaseData.subject,
          description: newCaseData.description,
        })
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Failed to submit support case.");
      }

      setCaseSuccess("Support case has been opened successfully. Our team will review and resolve it promptly!");
      setNewCaseData({
        classId: "",
        category: "General Query",
        severity: "MEDIUM",
        subject: "",
        description: "",
      });
      setShowNewCaseModal(false);
      loadSupportCases();
    } catch (err: any) {
      setCaseError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingCase(false);
    }
  };

  // Synchronize loading on tab switches
  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns();
    } else if (activeTab === 'support') {
      loadSupportCases();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab]);

  useEffect(() => {
    loadNotifications();
    loadCampaigns();
  }, []);
  
  // Loading & Action States
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingGradebook, setLoadingGradebook] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  
  // Active Submission Work State
  const [textContent, setTextContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab View within class: 'assignments' or 'gradebook'
  const [classTab, setClassTab] = useState<'assignments' | 'gradebook'>('assignments');

  // Load enrolled classes
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true);
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          // Filter classes that this student is enrolled in (usually the backend handles this or we can filter)
          // Since the endpoint fetches all, we can verify enrollment via our secure checks or let backend reject un-enrolled requests
          // Let's list classes and backend api will secure access when we select one.
          setClasses(data);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  // Load assignments and gradebook for selected class
  useEffect(() => {
    if (!selectedClass) {
      setAssignments([]);
      setSelectedAssignment(null);
      setGradebook(null);
      return;
    }

    async function loadClassData() {
      setLoadingAssignments(true);
      setLoadingGradebook(true);
      try {
        // 1. Get assignments
        const asgRes = await fetch(`/api/classes/${selectedClass!.id}/assignments`);
        if (asgRes.ok) {
          const asgData = await asgRes.json();
          setAssignments(asgData.data || asgData);
        }

        // 2. Get gradebook (will contain this student's personalized row)
        const gbRes = await fetch(`/api/classes/${selectedClass!.id}/gradebook`);
        if (gbRes.ok) {
          const gbData = await gbRes.json();
          setGradebook(gbData.data || gbData);
        }
      } catch (err) {
        console.error("Error loading class workspace data", err);
      } finally {
        setLoadingAssignments(false);
        setLoadingGradebook(false);
      }
    }

    loadClassData();
  }, [selectedClass]);

  // Load submissions for selected assignment
  useEffect(() => {
    if (!selectedAssignment) {
      setSubmissions([]);
      setTextContent("");
      setAttachedFiles([]);
      return;
    }

    async function loadSubmissions() {
      setLoadingSubmissions(true);
      try {
        const res = await fetch(`/api/assignments/${selectedAssignment!.id}/my-submissions`);
        if (res.ok) {
          const data = await res.json();
          const list: Submission[] = data.data || data;
          setSubmissions(list);
          
          // Pre-populate with the latest draft or returned draft
          const latest = list[0];
          if (latest && (latest.status === "DRAFT" || latest.status === "RETURNED")) {
            setTextContent(latest.textContent || "");
            setAttachedFiles(latest.files || []);
          } else {
            setTextContent("");
            setAttachedFiles([]);
          }
        }
      } catch (err) {
        console.error("Error loading submissions", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }

    loadSubmissions();
  }, [selectedAssignment]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File exceeds the maximum size limit of 15MB");
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileData: base64Data,
            fileSize: file.size
          }),
        });

        if (!response.ok) {
          throw new Error("R2 upload endpoint failed");
        }

        const resData = await response.json();
        const fileRecord = resData.data;

        setAttachedFiles(prev => [...prev, {
          id: fileRecord.id,
          name: fileRecord.name,
          url: fileRecord.url
        }]);
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload file to Cloudflare R2 bucket.");
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async (status: "DRAFT" | "SUBMITTED") => {
    if (!selectedAssignment) return;
    
    setIsSubmitting(true);
    setSubSuccess(null);
    setSubError(null);

    try {
      const response = await fetch(`/api/assignments/${selectedAssignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent,
          status,
          fileIds: attachedFiles.map(f => f.id)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit assignment");
      }

      const resData = await response.json();
      setSubSuccess(status === "SUBMITTED" ? "Your assignment has been submitted successfully!" : "Draft saved successfully.");
      
      // Reload submissions list
      const subListRes = await fetch(`/api/assignments/${selectedAssignment.id}/my-submissions`);
      if (subListRes.ok) {
        const listData = await subListRes.json();
        setSubmissions(listData.data || listData);
      }

      // Reload gradebook
      const gbRes = await fetch(`/api/classes/${selectedClass!.id}/gradebook`);
      if (gbRes.ok) {
        const gbData = await gbRes.json();
        setGradebook(gbData.data || gbData);
      }
    } catch (err: any) {
      setSubError(err.message || "An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200 animate-pulse";
      case "LATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RETURNED":
        return "bg-red-50 text-red-700 border-red-200";
      case "GRADED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const latestSubmission = submissions[0];
  const totalEnrolledClasses = classes.filter(c => c.status === "Active");

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-12">
      {/* STUDENT HEADER */}
      <div className="bg-white border-b border-slate-200 py-6 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Student Dashboard Workspace</span>
            <h2 className="text-xl font-display font-extrabold text-slate-900 mt-1">
              Welcome, {currentStudent.firstName} {currentStudent.lastName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{currentStudent.email} • Student ID: NHS-STU-ACTIVE</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-xs font-bold rounded-lg transition-all self-start cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Workspace
          </button>
        </div>

        {/* Top level Student Portal Navigation */}
        <div className="max-w-7xl mx-auto flex border-b border-slate-100 mt-6 overflow-x-auto gap-6 scrollbar-none">
          <button
            onClick={() => { setActiveTab('classes'); setSelectedClass(null); }}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 ${
              activeTab === 'classes' ? 'border-red-500 text-red-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            My Classes & Work
          </button>
          <button
            onClick={() => { setActiveTab('campaigns'); setActiveCampaign(null); }}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 relative ${
              activeTab === 'campaigns' ? 'border-red-500 text-red-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Pulse Surveys
            {campaigns.filter(c => !c.hasResponded).length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                {campaigns.filter(c => !c.hasResponded).length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('support'); }}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 ${
              activeTab === 'support' ? 'border-red-500 text-red-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Support & Help
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); }}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 px-1 relative ${
              activeTab === 'notifications' ? 'border-red-500 text-red-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'classes' ? (
          !selectedClass ? (
          /* CLASS SELECTION HUB */
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">Your Enrolled Courses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a course to open your assignments workspace, resources, and gradebook.</p>
            </div>

            {loadingClasses ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : totalEnrolledClasses.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No Active Enrolments</h4>
                <p className="text-xs text-slate-400 mt-1">You are not currently enrolled in any active classes. Contact your center administrator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {totalEnrolledClasses.map(cls => (
                  <div 
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[10px] font-bold">
                          {cls.classroom}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{cls.startDate}</span>
                      </div>
                      <h4 className="font-display font-extrabold text-slate-900 text-sm mt-3 group-hover:text-red-600 transition-colors">
                        {cls.courseName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Instructor: {cls.instructorName}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-[11px] font-semibold text-red-500 group-hover:translate-x-1 transition-transform">
                      <span>Open Classroom</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CLASSROOM VIEW */
          <div className="space-y-6">
            {/* Class Nav Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedClass(null); setSelectedAssignment(null); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-500"
                  title="Back to Courses"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Currently Attending</span>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm sm:text-base">{selectedClass.courseName}</h3>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold shrink-0">
                <button
                  onClick={() => { setClassTab('assignments'); setSelectedAssignment(null); }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    classTab === 'assignments' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Assignments & Work
                </button>
                <button
                  onClick={() => setClassTab('gradebook')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    classTab === 'gradebook' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Class Gradebook
                </button>
              </div>
            </div>

            {classTab === 'assignments' ? (
              /* ASSIGNMENTS COMPONENT */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Panel: Assignment List */}
                <div className={`lg:col-span-4 space-y-4 ${selectedAssignment ? 'hidden lg:block' : ''}`}>
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Assignments</h4>
                  {loadingAssignments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                      No assignments published for this class yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map(asg => {
                        // Find latest grade status for this assignment from gradebook if hydrated
                        const studentRow = gradebook?.students.find(s => s.id === currentStudent.id);
                        const gradeInfo = studentRow?.grades[asg.id];
                        const status = gradeInfo?.status || "UNSUBMITTED";

                        return (
                          <div
                            key={asg.id}
                            onClick={() => setSelectedAssignment(asg)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                              selectedAssignment?.id === asg.id
                                ? 'bg-red-50/50 border-red-300 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`px-2 py-0.5 border rounded-md text-[9px] font-bold ${getStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                              {asg.dueAt && (
                                <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(asg.dueAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs mt-2.5 line-clamp-1">
                              {asg.title}
                            </h5>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-medium">
                              <span>Max Attempts: {asg.maxAttempts}</span>
                              <span className="font-bold text-slate-700">{asg.totalMarks} Marks</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Panel: Selected Assignment Workspace */}
                <div className="lg:col-span-8">
                  {selectedAssignment ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                      {/* Back button on mobile */}
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="lg:hidden flex items-center gap-1 text-xs text-slate-500 font-semibold mb-3"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to List
                      </button>

                      {/* Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-4 gap-3">
                        <div>
                          <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider block">Class Assignment Assignment</span>
                          <h4 className="font-display font-extrabold text-slate-900 text-sm sm:text-base mt-0.5">{selectedAssignment.title}</h4>
                          {selectedAssignment.dueAt && (
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Due Date: <span className="font-bold text-slate-700">{new Date(selectedAssignment.dueAt).toLocaleString()}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right sm:self-start bg-slate-50 border border-slate-100 p-2.5 rounded-lg shrink-0">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Weight</span>
                          <span className="text-xs font-extrabold text-slate-700">{selectedAssignment.totalMarks} Marks</span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Instructions & Tasks</h5>
                        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 border border-slate-100 rounded-xl whitespace-pre-wrap">
                          {selectedAssignment.instructions}
                        </div>
                      </div>

                      {/* Resources */}
                      {selectedAssignment.resources && selectedAssignment.resources.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Attachments & Lesson Assets</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedAssignment.resources.map((res, i) => (
                              <a
                                key={i}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2.5 border border-slate-200 hover:border-red-200 hover:bg-red-50/30 rounded-xl text-xs transition-colors"
                              >
                                <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-bold text-slate-700 hover:text-red-600 truncate">{res.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Previous attempts/feedback */}
                      {submissions.length > 0 && (
                        <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                          <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Submission Attempts</h5>
                          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                            {submissions.map(sub => (
                              <div key={sub.id} className="bg-white p-3 border border-slate-200 rounded-lg text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-700">Attempt #{sub.attemptNumber}</span>
                                  <span className={`px-2 py-0.5 border rounded-md text-[9px] font-bold ${getStatusBadgeClass(sub.status)}`}>
                                    {sub.status}
                                  </span>
                                </div>
                                {sub.submittedAt && (
                                  <p className="text-[10px] text-slate-400">
                                    Submitted at: {new Date(sub.submittedAt).toLocaleString()}
                                  </p>
                                )}
                                {sub.score !== null && (
                                  <p className="font-bold text-emerald-600 text-[11px]">
                                    Score: {sub.score} / {selectedAssignment.totalMarks} ({Math.round((sub.score / selectedAssignment.totalMarks) * 100)}%)
                                  </p>
                                )}
                                {sub.feedback && (
                                  <div className="bg-red-50/30 border-l-2 border-red-500 p-2 text-[11px] text-slate-600 italic">
                                    <span className="font-bold text-slate-700 not-italic block mb-0.5">Instructor Feedback:</span>
                                    {sub.feedback}
                                  </div>
                                )}
                                {sub.files && sub.files.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {sub.files.map(f => (
                                      <a
                                        key={f.id}
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded"
                                      >
                                        <FileText className="w-3 h-3 text-indigo-500" />
                                        {f.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACTIVE WORKSPACE FORM (If allowed to submit) */}
                      {(!latestSubmission || latestSubmission.status === "DRAFT" || latestSubmission.status === "RETURNED") && (
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                              {latestSubmission?.status === "RETURNED" ? "Resubmission Workspace" : "Your Submission"}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Attempt {latestSubmission?.status === "RETURNED" ? submissions.length + 1 : submissions.length || 1} of {selectedAssignment.maxAttempts}
                            </span>
                          </div>

                          {/* Text input */}
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Write-up / Explanation</label>
                            <textarea
                              rows={5}
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              placeholder="Write your answer, response or links to external documentation here..."
                              className="w-full border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl p-3 text-xs outline-none transition-all resize-y"
                            />
                          </div>

                          {/* Secure File Attachment Widget */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">R2 File Attachments (Secure Storage)</label>
                            
                            {/* Attachments List */}
                            {attachedFiles.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {attachedFiles.map(file => (
                                  <div 
                                    key={file.id} 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 rounded-lg"
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">{file.name}</a>
                                    <button 
                                      type="button" 
                                      onClick={() => removeAttachedFile(file.id)}
                                      className="hover:text-red-500 transition-colors p-0.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Attachment button */}
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-all cursor-pointer"
                              >
                                {uploadingFile ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                ) : (
                                  <UploadCloud className="w-4 h-4 text-slate-400" />
                                )}
                                Attach File to R2
                              </button>
                              <span className="text-[10px] text-slate-400">PDF, ZIP, PNG, docx up to 15MB</span>
                            </div>

                            {uploadError && <p className="text-[10px] text-red-500 font-semibold">{uploadError}</p>}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
                            {subError && <p className="text-xs font-semibold text-red-500 text-left flex-1 py-2">{subError}</p>}
                            {subSuccess && <p className="text-xs font-semibold text-emerald-600 text-left flex-1 py-2">{subSuccess}</p>}

                            <button
                              onClick={() => handleSubmit("DRAFT")}
                              disabled={isSubmitting || uploadingFile}
                              className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              Save Draft
                            </button>
                            <button
                              onClick={() => handleSubmit("SUBMITTED")}
                              disabled={isSubmitting || uploadingFile}
                              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              Submit Attempt
                            </button>
                          </div>
                        </div>
                      )}

                      {/* FINALIZED STATE MESSAGE */}
                      {latestSubmission && latestSubmission.status !== "DRAFT" && latestSubmission.status !== "RETURNED" && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <h6 className="text-xs font-bold text-slate-800">Your Attempt is Finalized</h6>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              This attempt has been submitted for evaluation. You cannot modify your answers or attachments unless the instructor returns it for revisions.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col justify-center items-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-3" />
                      <h4 className="font-bold text-slate-700 text-sm">Workspace Idle</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Select any of the published assignments from the left-hand panel to view instructions, resources, and submit your responses.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CLASS GRADEBOOK */
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-sm">Your Course Report</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time grades, completion statistics, and aggregate averages calculated securely on the server.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      setLoadingGradebook(true);
                      const res = await fetch(`/api/classes/${selectedClass!.id}/gradebook`);
                      if (res.ok) {
                        const data = await res.json();
                        setGradebook(data.data || data);
                      }
                      setLoadingGradebook(false);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Reload Grades"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {loadingGradebook ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  </div>
                ) : !gradebook || gradebook.students.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No active grades mapped to this course report.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Performance Summary Cards */}
                    {gradebook.students.map(studentRow => (
                      <div key={studentRow.id} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Aggregate Marks</span>
                            <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                              {studentRow.totalEarned} / {studentRow.totalPossible}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Percentage</span>
                            <span className={`text-sm font-extrabold mt-1 block ${studentRow.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {studentRow.percentage}%
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Late Attempts</span>
                            <span className="text-sm font-extrabold text-amber-600 mt-1 block">{studentRow.lateCount}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Missing Tasks</span>
                            <span className="text-sm font-extrabold text-red-500 mt-1 block">{studentRow.missingCount}</span>
                          </div>
                        </div>

                        {/* Individual Assignment Grades */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                              <tr>
                                <th className="p-3">Assignment Title</th>
                                <th className="p-3">Due Date</th>
                                <th className="p-3">Submission Status</th>
                                <th className="p-3">Score Obtained</th>
                                <th className="p-3">Attempt</th>
                                <th className="p-3">Feedback</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {gradebook.assignments.map(asg => {
                                const grade = studentRow.grades[asg.id];
                                return (
                                  <tr key={asg.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-bold text-slate-800">{asg.title}</td>
                                    <td className="p-3 text-slate-400">
                                      {asg.dueAt ? new Date(asg.dueAt).toLocaleDateString() : "N/A"}
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 border rounded-md text-[9px] font-extrabold uppercase ${getStatusBadgeClass(grade?.status || "UNSUBMITTED")}`}>
                                        {grade?.status || "UNSUBMITTED"}
                                      </span>
                                    </td>
                                    <td className="p-3 font-extrabold text-slate-800">
                                      {grade?.score !== null && grade?.score !== undefined ? (
                                        <span className="text-emerald-600">{grade.score} / {asg.totalMarks}</span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-slate-500">
                                      {grade?.attemptNumber ? `Attempt ${grade.attemptNumber}` : "—"}
                                    </td>
                                    <td className="p-3 text-slate-500 italic max-w-xs truncate" title={grade?.feedback || ""}>
                                      {grade?.feedback || <span className="text-slate-400">No feedback yet</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )) : activeTab === 'campaigns' ? (
          /* PULSE SURVEYS HUB */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">Pulse Surveys & Feedback Campaigns</h3>
                <p className="text-xs text-slate-500 mt-0.5">Share your feedback to help instructors and administrators improve your learning experience.</p>
              </div>
              <button
                onClick={loadCampaigns}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer"
                title="Refresh Surveys"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {surveySuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">{surveySuccess}</p>
                </div>
              </div>
            )}

            {surveyError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold">{surveyError}</p>
                </div>
              </div>
            )}

            {activeCampaign ? (
              /* ACTIVE SURVEY FILLER FORM */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-2xl mx-auto space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-md border border-red-100 uppercase tracking-wide">
                      {activeCampaign.className}
                    </span>
                    <h4 className="font-display font-extrabold text-slate-950 text-base mt-2">{activeCampaign.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Closes on {new Date(activeCampaign.closesAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setActiveCampaign(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Anonymity Notice */}
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  activeCampaign.anonymous 
                    ? "bg-slate-50 border-slate-200 text-slate-700" 
                    : "bg-amber-50/50 border-amber-200 text-amber-900"
                }`}>
                  {activeCampaign.anonymous ? (
                    <>
                      <Shield className="w-4 h-4 shrink-0 text-slate-600 mt-0.5" />
                      <div>
                        <p className="font-bold">This survey is strictly Anonymous</p>
                        <p className="text-slate-500 mt-0.5">Your name and email address will not be recorded or linked to this response. Instructors and administrators will only see aggregated, anonymous statistics and feedback.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-bold">This survey is NOT Anonymous</p>
                        <p className="text-amber-800/80 mt-0.5">Your response is linked to your student account. This allows your instructor or helper to follow up and assist you directly if you raise any issues.</p>
                      </div>
                    </>
                  )}
                </div>

                <form onSubmit={handleSurveySubmit} className="space-y-6">
                  {/* Rating Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pace */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Course / Class Pace (1-5)</label>
                      <p className="text-[10px] text-slate-400">1 = Too Slow, 3 = Perfect, 5 = Too Fast</p>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSurveyFormData(prev => ({ ...prev, pace: val }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              surveyFormData.pace === val
                                ? "bg-red-500 border-red-500 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clarity */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Instructional Clarity (1-5)</label>
                      <p className="text-[10px] text-slate-400">1 = Highly Confusing, 5 = Extremely Clear</p>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSurveyFormData(prev => ({ ...prev, clarity: val }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              surveyFormData.clarity === val
                                ? "bg-red-500 border-red-500 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Your Confidence Level (1-5)</label>
                      <p className="text-[10px] text-slate-400">1 = Lost, 5 = High Mastery & Ready</p>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSurveyFormData(prev => ({ ...prev, confidence: val }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              surveyFormData.confidence === val
                                ? "bg-red-500 border-red-500 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Materials Rating */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Course Materials Rating (1-5)</label>
                      <p className="text-[10px] text-slate-400">1 = Poor / Missing, 5 = Outstanding</p>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSurveyFormData(prev => ({ ...prev, materialsRating: val }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              surveyFormData.materialsRating === val
                                ? "bg-red-500 border-red-500 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lab Rating */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700">Lab Practice & Setup Rating (1-5)</label>
                      <p className="text-[10px] text-slate-400">1 = Blocked by technical issues, 5 = Flawless sandbox environment</p>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSurveyFormData(prev => ({ ...prev, labRating: val }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                              surveyFormData.labRating === val
                                ? "bg-red-500 border-red-500 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Issue Flag */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">Did you encounter any critical blocker or issue?</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">Let us know if you need administrative, mental, or technical support.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={surveyFormData.hadIssue}
                        onChange={(e) => setSurveyFormData(prev => ({ ...prev, hadIssue: e.target.checked }))}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                      />
                    </div>

                    {surveyFormData.hadIssue && (
                      <div className="space-y-4 pt-3 border-t border-slate-200">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">Issue Severity</label>
                          <select
                            value={surveyFormData.issueSeverity}
                            onChange={(e) => setSurveyFormData(prev => ({ ...prev, issueSeverity: e.target.value }))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                          >
                            <option value="LOW">Low (Minor annoyance)</option>
                            <option value="MEDIUM">Medium (Slows down progress)</option>
                            <option value="HIGH">High (Blocked / Frustrated)</option>
                            <option value="CRITICAL">Critical (Total blocker / emergency)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h6 className="text-xs font-bold text-slate-700">Auto-create Support Ticket?</h6>
                            <p className="text-[10px] text-slate-400">This automatically forwards this issue to helpdesk handlers as an active support ticket.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={surveyFormData.autoCreateSupportCase}
                            onChange={(e) => setSurveyFormData(prev => ({ ...prev, autoCreateSupportCase: e.target.checked }))}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Detailed Comments & Suggestions</label>
                    <textarea
                      value={surveyFormData.comments}
                      onChange={(e) => setSurveyFormData(prev => ({ ...prev, comments: e.target.value }))}
                      rows={3}
                      placeholder="Please share any positive remarks, concerns, or technical issues you encountered..."
                      className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Submission buttons */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveCampaign(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingSurvey}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingSurvey ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit Pulse Feedback
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* SURVEYS LIST */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active campaigns column */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    Open Surveys ({campaigns.filter(c => !c.hasResponded).length})
                  </h4>

                  {loadingCampaigns ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : campaigns.filter(c => !c.hasResponded).length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                      No pending pulse surveys found for your classes.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.filter(c => !c.hasResponded).map(c => (
                        <div
                          key={c.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-red-300 transition-all"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[9px] font-bold">
                                {c.className}
                              </span>
                              {c.anonymous ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[9px] font-bold">
                                  <Shield className="w-2.5 h-2.5" /> Anonymous
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[9px] font-bold">
                                  <Info className="w-2.5 h-2.5" /> Non-Anonymous
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs mt-3">{c.title}</h5>
                            <p className="text-[10px] text-slate-400 mt-1">Closes: {new Date(c.closesAt).toLocaleDateString()}</p>
                          </div>
                          <button
                            onClick={() => {
                              setActiveCampaign(c);
                              setSurveyFormData({
                                pace: 3,
                                clarity: 4,
                                confidence: 4,
                                materialsRating: 4,
                                labRating: 4,
                                hadIssue: false,
                                issueSeverity: "MEDIUM",
                                comments: "",
                                autoCreateSupportCase: false,
                              });
                            }}
                            className="mt-4 text-center py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-bold rounded-lg border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                          >
                            Fill Feedback Survey
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completed surveys column */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Completed Surveys ({campaigns.filter(c => c.hasResponded).length})
                  </h4>

                  {loadingCampaigns ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : campaigns.filter(c => c.hasResponded).length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                      You haven't submitted any surveys yet in this dashboard.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.filter(c => c.hasResponded).map(c => (
                        <div
                          key={c.id}
                          className="bg-white/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-md text-[9px] font-bold">
                                {c.className}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[9px] font-bold">
                                <Check className="w-2.5 h-2.5" /> Submitted
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-500 text-xs mt-3 line-clamp-1">{c.title}</h5>
                            <p className="text-[10px] text-slate-400 mt-1">Thank you for sharing your feedback!</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'support' ? (
          /* SUPPORT & HELP HUB */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">Support Case Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">Submit support inquiries, platform bugs, or course delivery issues to help handlers.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadSupportCases}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer"
                  title="Refresh Cases"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCaseSuccess(null);
                    setCaseError(null);
                    setShowNewCaseModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Support Ticket
                </button>
              </div>
            </div>

            {caseSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">{caseSuccess}</p>
                </div>
              </div>
            )}

            {caseError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold">{caseError}</p>
                </div>
              </div>
            )}

            {/* NEW CASE MODAL OVERLAY/CARD */}
            {showNewCaseModal && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 max-w-xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-display font-extrabold text-slate-900 text-sm">Open Support Case</h4>
                  <button 
                    onClick={() => setShowNewCaseModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleCreateSupportCase} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Course / Class context (Optional)</label>
                      <select
                        value={newCaseData.classId}
                        onChange={(e) => setNewCaseData(prev => ({ ...prev, classId: e.target.value }))}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                      >
                        <option value="">No specific class / Platform issue</option>
                        {classes.filter(c => c.status === "Active").map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.courseName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Category</label>
                      <select
                        value={newCaseData.category}
                        onChange={(e) => setNewCaseData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                      >
                        <option value="Trainer/Delivery Style">Trainer / Delivery Style</option>
                        <option value="Technical/Lab Equipment">Technical / Lab Equipment</option>
                        <option value="Platform Bug">Platform Bug / Tech Support</option>
                        <option value="Syllabus/Content">Course Content / Syllabus</option>
                        <option value="General Query">General Query</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700">Severity</label>
                      <select
                        value={newCaseData.severity}
                        onChange={(e) => setNewCaseData(prev => ({ ...prev, severity: e.target.value as any }))}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                      >
                        <option value="LOW">Low (Question or minor inconvenience)</option>
                        <option value="MEDIUM">Medium (Normal issue, slow progress)</option>
                        <option value="HIGH">High (Blocked / Major impact)</option>
                        <option value="CRITICAL">Critical (Total blocker / emergency)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Subject</label>
                    <input
                      type="text"
                      required
                      value={newCaseData.subject}
                      onChange={(e) => setNewCaseData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Lab server won't respond to requests"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Describe the Issue</label>
                    <textarea
                      required
                      rows={4}
                      value={newCaseData.description}
                      onChange={(e) => setNewCaseData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please provide details so we can investigate and help you resolve this..."
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewCaseModal(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCase}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingCase ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Opening Ticket...
                        </>
                      ) : (
                        "Submit Ticket"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CASES LIST */}
            {loadingSupport ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : supportCases.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No Support Inquiries Raised</h4>
                <p className="text-xs text-slate-400 mt-1">If you experience platform issues or delivery problems, use the "New Support Ticket" button to file an inquiry.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {supportCases.map(c => {
                  const severityColors: Record<string, string> = {
                    LOW: "bg-slate-50 text-slate-600 border-slate-200",
                    MEDIUM: "bg-blue-50 text-blue-600 border-blue-200",
                    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
                    CRITICAL: "bg-red-50 text-red-700 border-red-200 animate-pulse",
                  };
                  const statusColors: Record<string, string> = {
                    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
                    IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    CLOSED: "bg-slate-50 text-slate-600 border-slate-200",
                  };

                  return (
                    <div 
                      key={c.id} 
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-50 pb-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold block">TICKET ID: {c.id.substring(0, 8).toUpperCase()}</span>
                          <h4 className="text-xs font-bold text-slate-900">{c.subject}</h4>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${severityColors[c.severity] || "bg-slate-50"}`}>
                            {c.severity} Severity
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${statusColors[c.status] || "bg-slate-50"}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-medium text-slate-600">
                        <div className="md:col-span-8 space-y-1.5">
                          <p className="text-slate-500 whitespace-pre-wrap">{c.description}</p>
                          {c.resolutionNote && (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-[11px] mt-2">
                              <span className="font-bold text-emerald-800 block">Resolution Comment</span>
                              <p className="text-emerald-700/95 mt-0.5">{c.resolutionNote}</p>
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-4 bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5 h-fit text-[11px]">
                          <span className="font-bold text-slate-700 block mb-1">Ticket Context</span>
                          <p><span className="text-slate-400 font-semibold">Category:</span> {c.category}</p>
                          <p><span className="text-slate-400 font-semibold">Associated Course:</span> {c.className || "General / Platform"}</p>
                          <p><span className="text-slate-400 font-semibold">Filed on:</span> {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* NOTIFICATIONS CENTER HUB */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">In-App Notification Center</h3>
                <p className="text-xs text-slate-500 mt-0.5">Stay up to date on your account approvals, class schedules, assignments, and grades.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadNotifications}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer"
                  title="Refresh Notifications"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer border border-slate-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {loadingNotifications ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">Inbox is completely clear</h4>
                <p className="text-xs text-slate-400 mt-1">You don't have any in-app system notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markAsRead(n.id); }}
                    className={`border rounded-xl p-4 transition-all flex justify-between items-center gap-4 ${
                      n.isRead 
                        ? "bg-white border-slate-200 opacity-80" 
                        : "bg-red-50/20 border-red-200 shadow-xs hover:bg-red-50/30 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        n.isRead ? "bg-slate-100 text-slate-400" : "bg-red-50 text-red-500"
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800 text-xs">{n.title}</h5>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-2 font-semibold">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Mark as Read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
