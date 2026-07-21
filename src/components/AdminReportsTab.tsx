import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Award,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Class, SystemConfig } from '../types';

interface AdminReportsTabProps {
  config: SystemConfig;
  classes: Class[];
}

type ReportType = 'enrolments' | 'progress' | 'attendance' | 'assignments' | 'assessments' | 'instructors' | 'feedback' | 'storage' | 'certificates';

export default function AdminReportsTab({ config, classes }: AdminReportsTabProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('enrolments');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);
  
  const [centerId, setCenterId] = useState('All');
  const [classId, setClassId] = useState('All');
  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentId, setStudentId] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Certificate Issuance Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueClassId, setIssueClassId] = useState('');
  const [issueStudentId, setIssueStudentId] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  // Certificate Revocation State
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  // Verification Search State
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const reportOptions: { id: ReportType; label: string; icon: any; desc: string }[] = [
    { id: 'enrolments', label: 'Class Enrolments', icon: UserCheck, desc: 'Student class registration logs & statuses' },
    { id: 'progress', label: 'Course Progress', icon: Layers, desc: 'Lesson and syllabus coverage tracking' },
    { id: 'attendance', label: 'Student Attendance', icon: Calendar, desc: 'Attendance histories & session arrivals' },
    { id: 'assignments', label: 'Class Assignments', icon: FileSpreadsheet, desc: 'Published deliverables & submission rates' },
    { id: 'assessments', label: 'Assessments & Grades', icon: CheckCircle, desc: 'Student marks, attempt logs, and feedback' },
    { id: 'instructors', label: 'Instructor Output', icon: Award, desc: 'Teaching durations, logged hours, and centers' },
    { id: 'feedback', label: 'Student Surveys', icon: AlertTriangle, desc: 'Pulse checks, paced metrics, and comments' },
    { id: 'storage', label: 'Asset Storage (R2)', icon: Download, desc: 'Syllabus slides, handbooks, and documents' },
    { id: 'certificates', label: 'Certificates Dashboard', icon: Award, desc: 'Issue, revoke, and verify credentials' }
  ];

  const fetchReportData = async () => {
    if (activeReport === 'certificates') {
      fetchCertificates();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        centerId,
        classId,
        status,
        startDate,
        endDate,
        studentId,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/v1/admin/reports/${activeReport}?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve report data');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data.data || result.data);
        const meta = result.data.meta;
        if (meta) {
          setTotalPages(meta.pages || 1);
          setTotalItems(meta.total || 0);
        }
      } else {
        throw new Error(result.error || 'Server reports extraction error');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Neon reports database engine');
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/certificates/admin/certificates`);
      if (!response.ok) {
        throw new Error('Failed to load certificates registry');
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setTotalPages(1);
        setTotalItems(result.data.length);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to certificates ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchReportData();
  }, [activeReport, centerId, classId, status, startDate, endDate, studentId, sortBy, sortOrder]);

  useEffect(() => {
    if (activeReport !== 'certificates') {
      fetchReportData();
    }
  }, [page]);

  const handleExportCsv = () => {
    const queryParams = new URLSearchParams({
      export: 'csv',
      centerId,
      classId,
      status,
      startDate,
      endDate,
      studentId,
      sortBy,
      sortOrder
    });
    
    // Redirect browser to trigger file download of server-generated audit-logged CSV
    window.location.href = `/api/v1/admin/reports/${activeReport}?${queryParams.toString()}`;
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueClassId || !issueStudentId) {
      setIssueError('Class ID and Student ID are required.');
      return;
    }

    setIssueLoading(true);
    setIssueError('');
    setIssueSuccess('');
    try {
      const response = await fetch(`/api/certificates/admin/classes/${issueClassId}/students/${issueStudentId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        setIssueSuccess(`Certificate generated! Number: ${result.data.certificateNumber}`);
        fetchReportData();
        setTimeout(() => {
          setShowIssueModal(false);
          setIssueSuccess('');
          setIssueClassId('');
          setIssueStudentId('');
        }, 3000);
      } else {
        throw new Error(result.error || 'Evaluation failed.');
      }
    } catch (err: any) {
      setIssueError(err.message || 'Criteria evaluation check rejected.');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevokeCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeReason || revokeReason.trim().length < 5) {
      setRevokeError('Please provide a descriptive reason (minimum 5 characters).');
      return;
    }

    setRevokeLoading(true);
    setRevokeError('');
    try {
      const response = await fetch(`/api/certificates/admin/certificates/${selectedCertId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason })
      });
      const result = await response.json();
      if (result.success) {
        setShowRevokeModal(false);
        setRevokeReason('');
        setSelectedCertId('');
        fetchReportData();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setRevokeError(err.message || 'Revocation request rejected.');
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleVerifyCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const response = await fetch(`/api/certificates/verify/${encodeURIComponent(verifyCode.trim())}`);
      const result = await response.json();
      if (result.success) {
        setVerifyResult(result.data);
      } else {
        throw new Error(result.error || 'Verification code not found.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'No valid matching certificate found.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reports Navigation Panel */}
        <div className="lg:col-span-3 space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2 px-1">
            Operational Intelligence
          </span>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
            {reportOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeReport === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setActiveReport(opt.id);
                    setData([]);
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-all shrink-0 cursor-pointer w-auto lg:w-full ${
                    isActive
                      ? 'bg-red-500 text-white shadow-sm font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="text-xs">
                    <span className="block leading-none">{opt.label}</span>
                    <span className={`hidden lg:block text-[9px] mt-0.5 leading-tight ${isActive ? 'text-red-100 font-normal' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content Grid */}
        <div className="lg:col-span-9 space-y-6">
          {/* Filters shelf */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
              <h3 className="font-extrabold font-display text-slate-900 text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                Query Calibration Filters
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={fetchReportData}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Reload Live Database Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {activeReport !== 'certificates' && (
                  <button
                    onClick={handleExportCsv}
                    disabled={loading || data.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    <Download className="w-4.5 h-4.5" />
                    Export CSV
                  </button>
                )}
                {activeReport === 'certificates' && (
                  <button
                    onClick={() => setShowIssueModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors animate-pulse"
                  >
                    <Award className="w-4.5 h-4.5" />
                    Issue Certificate
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Center filter */}
              {activeReport !== 'certificates' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Center</label>
                  <select
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="All">All Centers</option>
                    {config.centers.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class/Course Filter */}
              {activeReport !== 'certificates' && activeReport !== 'instructors' && activeReport !== 'storage' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="All">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.courseName} ({c.classroom})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              {['enrolments', 'attendance', 'assignments', 'assessments', 'instructors'].includes(activeReport) && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="All">All Statuses</option>
                    {activeReport === 'enrolments' && (
                      <>
                        <option value="ACTIVE">Active</option>
                        <option value="INVITED">Invited</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                      </>
                    )}
                    {activeReport === 'attendance' && (
                      <>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="EXCUSED">Excused</option>
                      </>
                    )}
                    {activeReport === 'assignments' && (
                      <>
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                      </>
                    )}
                    {activeReport === 'assessments' && (
                      <>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="GRADED">Graded</option>
                        <option value="LATE">Late Submission</option>
                      </>
                    )}
                    {activeReport === 'instructors' && (
                      <>
                        <option value="ACTIVE">Active</option>
                        <option value="PENDING">Pending Approval</option>
                        <option value="SUSPENDED">Suspended</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Date Filters */}
              {['enrolments', 'attendance', 'storage'].includes(activeReport) && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Verification Box (Only on Certificates view) */}
          {activeReport === 'certificates' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-slate-500" />
                Public Verification Simulator
              </h3>
              <form onSubmit={handleVerifyCertificate} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter Certificate Number or Verification Code..."
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Verify Code
                </button>
              </form>

              {verifyLoading && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" /> Verifying ledger entries...
                </div>
              )}

              {verifyError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifyResult && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 text-sm">NHS Secure Verification Ledger</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${verifyResult.revoked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {verifyResult.revoked ? 'REVOKED / INVALID' : 'VALID / GENUINE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>Student: <strong className="text-slate-800">{verifyResult.studentName}</strong></div>
                    <div>Course/Class: <strong className="text-slate-800">{verifyResult.className}</strong></div>
                    <div>Certificate: <strong className="text-slate-800">{verifyResult.certificateNumber}</strong></div>
                    <div>Issued: <strong className="text-slate-800">{new Date(verifyResult.issuedAt).toLocaleDateString()}</strong></div>
                  </div>
                  {verifyResult.revoked && (
                    <div className="mt-2 bg-red-50 p-2 rounded text-[10px] text-red-800 italic">
                      Reason for revocation: "{verifyResult.revocationReason}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main report grid table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-slate-400 text-xs font-semibold mt-4">Extracting dynamic telemetry records from Neon PostgreSQL...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500 text-xs font-bold">
                {error}
              </div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No matching database records found for this query layout.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-100">
                    <tr>
                      {activeReport === 'enrolments' && (
                        <>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Class/Course</th>
                          <th className="px-5 py-3">Center</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Enrolled At</th>
                          <th className="px-5 py-3">Grade Score</th>
                          <th className="px-5 py-3">Actions</th>
                        </>
                      )}
                      {activeReport === 'progress' && (
                        <>
                          <th className="px-5 py-3">Student Name</th>
                          <th className="px-5 py-3">Syllabus Course</th>
                          <th className="px-5 py-3">Completed Lessons</th>
                          <th className="px-5 py-3">Total Lessons</th>
                          <th className="px-5 py-3">Completion Pct</th>
                        </>
                      )}
                      {activeReport === 'attendance' && (
                        <>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Class Name</th>
                          <th className="px-5 py-3">Session Date</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Arrival Time</th>
                          <th className="px-5 py-3">Note</th>
                        </>
                      )}
                      {activeReport === 'assignments' && (
                        <>
                          <th className="px-5 py-3">Title</th>
                          <th className="px-5 py-3">Class Name</th>
                          <th className="px-5 py-3">Total Marks</th>
                          <th className="px-5 py-3">Due Date</th>
                          <th className="px-5 py-3">Submissions</th>
                          <th className="px-5 py-3">Status</th>
                        </>
                      )}
                      {activeReport === 'assessments' && (
                        <>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Assignment</th>
                          <th className="px-5 py-3">Attempt</th>
                          <th className="px-5 py-3">Score</th>
                          <th className="px-5 py-3">Max Score</th>
                          <th className="px-5 py-3">Submitted At</th>
                          <th className="px-5 py-3">Status</th>
                        </>
                      )}
                      {activeReport === 'instructors' && (
                        <>
                          <th className="px-5 py-3">Instructor</th>
                          <th className="px-5 py-3">Center Assigned</th>
                          <th className="px-5 py-3">Classes Count</th>
                          <th className="px-5 py-3">Weekly Logs</th>
                          <th className="px-5 py-3">Status</th>
                        </>
                      )}
                      {activeReport === 'feedback' && (
                        <>
                          <th className="px-5 py-3">Campaign</th>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Pace / Clarity</th>
                          <th className="px-5 py-3">Lab / Materials</th>
                          <th className="px-5 py-3">Issue</th>
                          <th className="px-5 py-3">Comments</th>
                        </>
                      )}
                      {activeReport === 'storage' && (
                        <>
                          <th className="px-5 py-3">File Name</th>
                          <th className="px-5 py-3">MIME Type</th>
                          <th className="px-5 py-3">Size (KB)</th>
                          <th className="px-5 py-3">Uploaded By</th>
                          <th className="px-5 py-3">Created At</th>
                        </>
                      )}
                      {activeReport === 'certificates' && (
                        <>
                          <th className="px-5 py-3">Certificate Number</th>
                          <th className="px-5 py-3">Student Name</th>
                          <th className="px-5 py-3">Class Name</th>
                          <th className="px-5 py-3">Issued Date</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/50">
                        {activeReport === 'enrolments' && (
                          <>
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-slate-900 block">{row.studentName}</span>
                              <span className="text-slate-400 text-[10px] block">{row.studentEmail}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-800">{row.className}</td>
                            <td className="px-5 py-3.5 text-slate-500">{row.centerName || 'Unassigned'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>{row.status}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(row.enrolledAt).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{row.gradeScore !== null ? `${row.gradeScore}%` : 'N/A'}</td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => {
                                  setIssueClassId(row.classId);
                                  setIssueStudentId(row.id || row.studentId);
                                  setShowIssueModal(true);
                                }}
                                className="px-2 py-1 border border-red-200 hover:bg-red-50 text-red-600 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Issue Certificate
                              </button>
                            </td>
                          </>
                        )}
                        {activeReport === 'progress' && (
                          <>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-800">{row.studentName}</span>
                              <span className="text-slate-400 block text-[10px]">{row.studentEmail}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">{row.courseName}</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">{row.completedLessons}</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-500">{row.totalLessons}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{row.progressPercent}%</span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${row.progressPercent}%` }} />
                                </div>
                              </div>
                            </td>
                          </>
                        )}
                        {activeReport === 'attendance' && (
                          <>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-800">{row.studentName}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">{row.className}</td>
                            <td className="px-5 py-3.5 text-slate-500">{new Date(row.sessionDate).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}>{row.status}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400">{row.arrivalTime || 'N/A'}</td>
                            <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{row.note || '-'}</td>
                          </>
                        )}
                        {activeReport === 'assignments' && (
                          <>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{row.title}</td>
                            <td className="px-5 py-3.5 text-slate-600">{row.className}</td>
                            <td className="px-5 py-3.5 text-slate-500 font-bold">{row.totalMarks}</td>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(row.dueAt).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">{row.submissionsCount}</td>
                            <td className="px-5 py-3.5">
                              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">{row.status}</span>
                            </td>
                          </>
                        )}
                        {activeReport === 'assessments' && (
                          <>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-800">{row.studentName}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 font-medium">{row.assignmentTitle}</td>
                            <td className="px-5 py-3.5 text-slate-500">Attempt {row.attemptNumber}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{row.score !== null ? row.score : 'Pending'}</td>
                            <td className="px-5 py-3.5 text-slate-400">{row.totalMarks}</td>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(row.submittedAt).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'GRADED' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
                              }`}>{row.status}</span>
                            </td>
                          </>
                        )}
                        {activeReport === 'instructors' && (
                          <>
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-slate-900 block">{row.name}</span>
                              <span className="text-slate-400 text-[10px] block">{row.email}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">{row.center || 'All Centers'}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{row.classesCount}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-500">{row.approvedLogsCount}</td>
                            <td className="px-5 py-3.5">
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">{row.status}</span>
                            </td>
                          </>
                        )}
                        {activeReport === 'feedback' && (
                          <>
                            <td className="px-5 py-3.5 text-slate-700 font-bold">{row.campaignTitle}</td>
                            <td className="px-5 py-3.5 text-slate-500">{row.studentName}</td>
                            <td className="px-5 py-3.5">
                              Pace: <strong>{row.pace}/5</strong> • Clarity: <strong>{row.clarity}/5</strong>
                            </td>
                            <td className="px-5 py-3.5">
                              Lab: <strong>{row.labRating}/5</strong> • Mat: <strong>{row.materialsRating}/5</strong>
                            </td>
                            <td className="px-5 py-3.5">
                              {row.hadIssue ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded font-bold">
                                  {row.issueSeverity || 'Yes'}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{row.comments || '-'}</td>
                          </>
                        )}
                        {activeReport === 'storage' && (
                          <>
                            <td className="px-5 py-3.5 text-slate-900 font-bold">{row.name}</td>
                            <td className="px-5 py-3.5 text-slate-400 font-mono text-[10px]">{row.mimeType}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{Math.round(row.size / 1024)} KB</td>
                            <td className="px-5 py-3.5 text-slate-500">{row.uploadedByName || 'System'}</td>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                          </>
                        )}
                        {activeReport === 'certificates' && (
                          <>
                            <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">{row.certificateNumber}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">{row.studentName}</td>
                            <td className="px-5 py-3.5 text-slate-600">{row.className}</td>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(row.issuedAt).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                row.revoked ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>{row.revoked ? 'REVOKED' : 'ACTIVE'}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {!row.revoked && (
                                <button
                                  onClick={() => {
                                    setSelectedCertId(row.id);
                                    setShowRevokeModal(true);
                                  }}
                                  className="text-rose-600 hover:text-rose-700 font-bold text-[10px] px-2 py-1 rounded border border-rose-200 hover:bg-rose-50 cursor-pointer"
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {activeReport !== 'certificates' && totalPages > 1 && (
              <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2 text-slate-600">
                <span className="text-[11px] font-semibold text-slate-400">
                  Showing {data.length} of {totalItems} total ledger entries
                </span>
                <div className="flex items-center gap-3">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold font-mono">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: ISSUE CERTIFICATE */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowIssueModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 z-10 space-y-4"
            >
              <h3 className="text-sm font-extrabold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="w-5 h-5 text-red-500" />
                NHS Credentials Eligibility Assessor
              </h3>

              <form onSubmit={handleIssueCertificate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Class ID (UUID)"
                    value={issueClassId}
                    onChange={(e) => setIssueClassId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Student User ID (UUID)"
                    value={issueStudentId}
                    onChange={(e) => setIssueStudentId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">Completion Criteria Checklist:</div>
                  <div>• Minimum <strong>80% class session attendance</strong></div>
                  <div>• Submission of <strong>100% published assignments</strong></div>
                  <div>• Cumulative assignment score <strong>&ge; 50% average</strong></div>
                </div>

                {issueError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {issueError}
                  </div>
                )}

                {issueSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                    {issueSuccess}
                  </div>
                )}

                <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={issueLoading}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1.5"
                  >
                    {issueLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Evaluate &amp; Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: REVOKE CERTIFICATE */}
      <AnimatePresence>
        {showRevokeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRevokeModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-200 z-10 space-y-4"
            >
              <h3 className="text-sm font-extrabold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3 text-red-600">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Revoke Secure Certificate
              </h3>

              <form onSubmit={handleRevokeCertificate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason for Revocation</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide explicit, audited justification for certificate revocation..."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none"
                  />
                </div>

                {revokeError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {revokeError}
                  </div>
                )}

                <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRevokeModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={revokeLoading}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all flex items-center gap-1.5"
                  >
                    {revokeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Revocation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
