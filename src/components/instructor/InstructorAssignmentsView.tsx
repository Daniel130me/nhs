import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Plus, Calendar, Clock, Edit, Trash2, 
  ChevronRight, Save, Send, ArrowLeft, CheckCircle2, 
  AlertCircle, Loader2, Link as LinkIcon, Trash, UploadCloud, X, HelpCircle
} from "lucide-react";
import { Class } from "../../types";

interface InstructorAssignmentsViewProps {
  currentInstructor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  classes: Class[];
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
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  resources: Array<{ name: string; url: string }>;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  textContent: string | null;
  status: "DRAFT" | "SUBMITTED" | "LATE" | "RETURNED" | "GRADED";
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  files: Array<{ id: string; name: string; url: string }>;
}

export default function InstructorAssignmentsView({ currentInstructor, classes }: InstructorAssignmentsViewProps) {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  
  // Loading states
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  // Form states - Assignment
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [dueAt, setDueAt] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [resources, setResources] = useState<Array<{ name: string; url: string }>>([]);

  // Resource adding
  const [resName, setResName] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Grading
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [gradingStatus, setGradingStatus] = useState<"GRADED" | "RETURNED">("GRADED");
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingSuccess, setGradingSuccess] = useState<string | null>(null);

  // Only show classes that belong to this instructor
  const instructorClasses = classes.filter(c => c.instructorId === currentInstructor.id);

  // Fetch assignments when class changes
  useEffect(() => {
    if (!selectedClass) {
      setAssignments([]);
      setSelectedAssignment(null);
      setSelectedSubmission(null);
      return;
    }
    loadAssignments();
  }, [selectedClass]);

  // Fetch submissions when assignment changes
  useEffect(() => {
    if (!selectedAssignment) {
      setSubmissions([]);
      setSelectedSubmission(null);
      return;
    }
    loadSubmissions();
  }, [selectedAssignment]);

  const loadAssignments = async () => {
    if (!selectedClass) return;
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data || data);
      }
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadSubmissions = async () => {
    if (!selectedAssignment) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.data || data);
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Handle assignment file resources upload via Cloudflare R2
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large! Maximum limit is 15MB.");
      return;
    }

    setUploadingFile(true);
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
          throw new Error("R2 upload request failed");
        }

        const resData = await response.json();
        const fileRecord = resData.data;

        setResources(prev => [...prev, {
          name: fileRecord.name,
          url: fileRecord.url
        }]);
      } catch (err: any) {
        alert(err.message || "Failed to upload file to Cloudflare R2");
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
  };

  const addResourceLink = () => {
    if (!resName.trim() || !resUrl.trim()) return;
    setResources(prev => [...prev, { name: resName.trim(), url: resUrl.trim() }]);
    setResName("");
    setResUrl("");
  };

  const removeResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenCreateForm = () => {
    setIsEditMode(false);
    setTitle("");
    setInstructions("");
    setTotalMarks("100");
    setDueAt("");
    setAllowLateSubmission(true);
    setMaxAttempts("1");
    setStatus("DRAFT");
    setResources([]);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (asg: Assignment) => {
    setIsEditMode(true);
    setTitle(asg.title);
    setInstructions(asg.instructions);
    setTotalMarks(asg.totalMarks.toString());
    setDueAt(asg.dueAt ? new Date(asg.dueAt).toISOString().slice(0, 16) : "");
    setAllowLateSubmission(asg.allowLateSubmission);
    setMaxAttempts(asg.maxAttempts.toString());
    setStatus(asg.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
    setResources(asg.resources || []);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    if (!title.trim() || !instructions.trim()) {
      setFormError("Title and Instructions are required.");
      return;
    }

    const marks = parseFloat(totalMarks);
    if (isNaN(marks) || marks <= 0) {
      setFormError("Total marks must be a positive number.");
      return;
    }

    const attempts = parseInt(maxAttempts, 10);
    if (isNaN(attempts) || attempts <= 0) {
      setFormError("Max attempts must be at least 1.");
      return;
    }

    setIsSavingAssignment(true);
    setFormError(null);
    setFormSuccess(null);

    const payload = {
      classId: selectedClass.id,
      title: title.trim(),
      instructions: instructions.trim(),
      totalMarks: marks,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      allowLateSubmission,
      maxAttempts: attempts,
      status,
      resources
    };

    try {
      const url = isEditMode && selectedAssignment 
        ? `/api/assignments/${selectedAssignment.id}`
        : "/api/assignments";
      
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save assignment.");
      }

      setFormSuccess(isEditMode ? "Assignment updated successfully!" : "Assignment created successfully!");
      setShowForm(false);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (asgId: string) => {
    if (!confirm("Are you sure you want to permanently delete this assignment? All associated student submissions will be lost!")) {
      return;
    }

    try {
      const response = await fetch(`/api/assignments/${asgId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }

      setSelectedAssignment(null);
      loadAssignments();
    } catch (err: any) {
      alert(err.message || "Failed to delete assignment");
    }
  };

  const handleGradeSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !selectedAssignment) return;

    const score = parseFloat(scoreInput);
    if (isNaN(score) || score < 0) {
      setGradingError("Score must be a positive number or zero.");
      return;
    }

    if (score > selectedAssignment.totalMarks) {
      setGradingError(`Score cannot exceed maximum total marks (${selectedAssignment.totalMarks}).`);
      return;
    }

    setIsGrading(true);
    setGradingError(null);
    setGradingSuccess(null);

    try {
      const response = await fetch(`/api/submissions/${selectedSubmission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          feedback: feedbackInput.trim() || null,
          status: gradingStatus
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit grade");
      }

      setGradingSuccess("Submission graded and feedback registered successfully!");
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (err: any) {
      setGradingError(err.message || "An error occurred while saving the grade.");
    } finally {
      setIsGrading(false);
    }
  };

  const openGradingPanel = (sub: Submission) => {
    setSelectedSubmission(sub);
    setScoreInput(sub.score !== null ? sub.score.toString() : "");
    setFeedbackInput(sub.feedback || "");
    setGradingStatus(sub.status === "RETURNED" ? "RETURNED" : "GRADED");
    setGradingError(null);
    setGradingSuccess(null);
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "PUBLISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
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

  return (
    <div className="space-y-6">
      {/* CLASS SELECTION BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Active Syllabus Workspace</label>
          <select
            value={selectedClass?.id || ""}
            onChange={(e) => {
              const cls = instructorClasses.find(c => c.id === e.target.value);
              setSelectedClass(cls || null);
            }}
            className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
          >
            <option value="">-- Select Active Class --</option>
            {instructorClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.courseName} ({cls.classroom})</option>
            ))}
          </select>
        </div>

        {selectedClass && !showForm && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        )}
      </div>

      {!selectedClass ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">No Active Class Selected</h4>
          <p className="text-xs text-slate-400 mt-1">Please select an assigned class syllabus from the dropdown to manage classroom activities.</p>
        </div>
      ) : showForm ? (
        /* CREATE / EDIT ASSIGNMENT FORM */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Course Assessment Manager</span>
              <h4 className="font-display font-extrabold text-slate-900 text-sm mt-0.5">
                {isEditMode ? "Modify Assignment Details" : "Construct New Student Assignment"}
              </h4>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Cancel Workspace
            </button>
          </div>

          <form onSubmit={handleSaveAssignment} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab Project 1: Drizzle & Neon Configuration"
                  className="w-full border border-slate-200 focus:border-red-500 rounded-xl p-3 text-xs outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Task Instructions & Criteria</label>
                <textarea
                  rows={8}
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Write clear steps, reference links, and criteria for student grading..."
                  className="w-full border border-slate-200 focus:border-red-500 rounded-xl p-3 text-xs outline-none transition-colors resize-y whitespace-pre-wrap"
                />
              </div>

              {/* R2 Secure File Attachments block inside Create Assignment */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Lesson Attachments & Resources (Hosted in Cloudflare R2)</label>
                
                {resources.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    {resources.map((res, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700 truncate" title={res.url}>{res.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeResource(i)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload to R2 option */}
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Upload directly to R2</span>
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
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {uploadingFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      Upload Asset to Cloud R2
                    </button>
                  </div>

                  {/* Manual URL entry */}
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Or link custom documentation</span>
                    <div className="flex gap-2">
                      <div className="space-y-1 flex-1">
                        <input
                          type="text"
                          value={resName}
                          onChange={(e) => setResName(e.target.value)}
                          placeholder="Doc Name"
                          className="w-full border border-slate-200 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                        <input
                          type="text"
                          value={resUrl}
                          onChange={(e) => setResUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full border border-slate-200 focus:border-red-500 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addResourceLink}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold self-end cursor-pointer"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 self-start">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Possible Marks</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full border border-slate-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none bg-white font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Max Submission Attempts</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="w-full border border-slate-200 focus:border-red-500 rounded-lg p-2 text-xs outline-none bg-white font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full border border-slate-200 focus:border-red-500 rounded-lg p-2 text-[11px] outline-none bg-white font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="allowLate"
                  checked={allowLateSubmission}
                  onChange={(e) => setAllowLateSubmission(e.target.checked)}
                  className="w-4 h-4 rounded text-red-500 border-slate-300 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="allowLate" className="text-xs text-slate-600 font-semibold cursor-pointer select-none">
                  Allow late submissions
                </label>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Publish Status</label>
                <div className="flex bg-white p-0.5 border border-slate-200 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStatus("DRAFT")}
                    className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                      status === "DRAFT" ? "bg-slate-850 text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("PUBLISHED")}
                    className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                      status === "PUBLISHED" ? "bg-red-500 text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Publish
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block pt-1">
                  {status === "PUBLISHED" ? "Students will immediately see and be able to submit." : "Draft stays hidden from students."}
                </span>
              </div>

              <div className="pt-4 space-y-2">
                {formError && <p className="text-[11px] text-red-500 font-semibold">{formError}</p>}
                {formSuccess && <p className="text-[11px] text-emerald-600 font-semibold">{formSuccess}</p>}
                
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  {isSavingAssignment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Assignment Configuration
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* LIST WORKSPACE VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Assignments List */}
          <div className={`lg:col-span-5 space-y-4 ${selectedAssignment ? 'hidden lg:block' : ''}`}>
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Class Assignments</h4>
            {loadingAssignments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 font-semibold">
                No assignments created yet for this syllabus.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(asg => (
                  <div
                    key={asg.id}
                    onClick={() => { setSelectedAssignment(asg); setSelectedSubmission(null); }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedAssignment?.id === asg.id
                        ? "bg-red-50/50 border-red-300 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 border rounded-md text-[9px] font-bold ${getStatusBadge(asg.status)}`}>
                        {asg.status}
                      </span>
                      {asg.dueAt && (
                        <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(asg.dueAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h5 className="font-extrabold text-slate-800 text-xs mt-2.5 line-clamp-1">{asg.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{asg.instructions}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 font-semibold border-t border-slate-100 pt-2">
                      <span>Max Attempts: {asg.maxAttempts}</span>
                      <span className="font-black text-slate-700">{asg.totalMarks} Marks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Active Selection Workspace / Submission grading */}
          <div className="lg:col-span-7">
            {selectedAssignment ? (
              <div className="space-y-6">
                {/* Assignment detail block */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className="lg:hidden flex items-center gap-1 text-xs text-slate-500 font-bold mb-3"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <div>
                      <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider block">Assessment Specification</span>
                      <h4 className="font-display font-extrabold text-slate-950 text-sm sm:text-base mt-0.5">{selectedAssignment.title}</h4>
                      {selectedAssignment.dueAt && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Due Date: {new Date(selectedAssignment.dueAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditForm(selectedAssignment)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Edit Assignment"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(selectedAssignment.id)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50/50 p-4 border border-slate-100 rounded-xl whitespace-pre-wrap leading-relaxed">
                    {selectedAssignment.instructions}
                  </div>

                  {selectedAssignment.resources && selectedAssignment.resources.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Lesson Resources</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedAssignment.resources.map((res, i) => (
                          <a
                            key={i}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-600"
                          >
                            <LinkIcon className="w-3 h-3 text-slate-400" />
                            {res.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submissions section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-sm">Student Submissions Workspace</h4>
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[10px] font-bold">
                      {submissions.length} Logged
                    </span>
                  </div>

                  {loadingSubmissions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400 font-semibold">
                      No submissions logged for this assignment yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                      {submissions.map(sub => (
                        <div key={sub.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{sub.studentName}</span>
                              <span className={`px-1.5 py-0.5 border rounded-md text-[8px] font-bold ${getStatusBadge(sub.status)}`}>
                                {sub.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {sub.studentEmail} • Attempt #{sub.attemptNumber}
                            </p>
                            {sub.submittedAt && (
                              <p className="text-[9px] text-slate-400">
                                Submitted: {new Date(sub.submittedAt).toLocaleString()}
                              </p>
                            )}
                            {sub.score !== null && (
                              <p className="font-bold text-emerald-600 text-[10px] mt-1">
                                Score: {sub.score} / {selectedAssignment.totalMarks}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => openGradingPanel(sub)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white hover:shadow-xs text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            Grade & Feedback
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submission grading popup/panel */}
                {selectedSubmission && (
                  <div className="bg-slate-900 text-white border border-slate-850 rounded-2xl p-6 space-y-4 shadow-xl">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[9px] text-red-400 font-extrabold uppercase tracking-wider block">Grading Assessment Entry</span>
                        <h4 className="font-display font-extrabold text-white text-xs sm:text-sm mt-0.5">
                          Evaluate {selectedSubmission.studentName}
                        </h4>
                      </div>
                      <button
                        onClick={() => setSelectedSubmission(null)}
                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Student Write-up & Attached R2 Files */}
                    <div className="space-y-3 text-xs bg-slate-950/80 p-4 border border-slate-850 rounded-xl">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Student Answer / Write-up</span>
                        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {selectedSubmission.textContent || <span className="text-slate-500 italic">No text write-up provided.</span>}
                        </p>
                      </div>

                      {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                        <div className="border-t border-slate-850 pt-2 mt-2 space-y-1.5">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">R2 Secure Attachments</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedSubmission.files.map(f => (
                              <a
                                key={f.id}
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-850 text-[10px] font-bold text-indigo-400 border border-slate-800 rounded"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                {f.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grading entry fields */}
                    <form onSubmit={handleGradeSubmissionSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                            Score Assigned (Max {selectedAssignment.totalMarks})
                          </label>
                          <input
                            type="number"
                            required
                            step="0.01"
                            min="0"
                            max={selectedAssignment.totalMarks}
                            value={scoreInput}
                            onChange={(e) => setScoreInput(e.target.value)}
                            placeholder="0.0"
                            className="w-full border border-slate-700 bg-slate-950 focus:border-red-500 rounded-lg p-2 text-xs outline-none text-white font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Evaluation Result</label>
                          <div className="flex bg-slate-950 p-0.5 border border-slate-700 rounded-lg text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setGradingStatus("GRADED")}
                              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                                gradingStatus === "GRADED" ? "bg-red-500 text-white" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Final Score
                            </button>
                            <button
                              type="button"
                              onClick={() => setGradingStatus("RETURNED")}
                              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                                gradingStatus === "RETURNED" ? "bg-red-500 text-white" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Return for Revision
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Instructor Performance Feedback</label>
                        <textarea
                          rows={3}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Provide supportive comments, corrections, or improvement steps..."
                          className="w-full border border-slate-700 bg-slate-950 focus:border-red-500 rounded-lg p-2.5 text-xs outline-none text-white resize-none"
                        />
                      </div>

                      <div className="pt-2 space-y-2">
                        {gradingError && <p className="text-[11px] text-red-400 font-bold">{gradingError}</p>}
                        {gradingSuccess && <p className="text-[11px] text-emerald-400 font-bold">{gradingSuccess}</p>}

                        <button
                          type="submit"
                          disabled={isGrading}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          {isGrading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Save Grade & Submit Feedback
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col justify-center items-center">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">Workspace Idle</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select an assignment from the left-hand index to configure specifications, view submissions, and grade work.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
