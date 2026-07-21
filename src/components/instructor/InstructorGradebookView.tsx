import React, { useState, useEffect } from "react";
import { 
  GraduationCap, Loader2, Download, AlertCircle, 
  CheckCircle2, AlertTriangle, FileSpreadsheet, RefreshCw, Sparkles, User, Mail
} from "lucide-react";
import { Class } from "../../types";

interface InstructorGradebookViewProps {
  currentInstructor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  classes: Class[];
}

interface GradebookAssignment {
  id: string;
  title: string;
  totalMarks: number;
  dueAt: string | null;
}

interface GradebookStudent {
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
}

export default function InstructorGradebookView({ currentInstructor, classes }: InstructorGradebookViewProps) {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [gradebookData, setGradebookData] = useState<{
    assignments: GradebookAssignment[];
    students: GradebookStudent[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const instructorClasses = classes.filter(c => c.instructorId === currentInstructor.id);

  // Fetch gradebook data
  const loadGradebook = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classes/${selectedClass.id}/gradebook`);
      if (!response.ok) {
        throw new Error("Failed to load gradebook data");
      }
      const resData = await response.json();
      setGradebookData(resData.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching gradebook.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClass) {
      setGradebookData(null);
      return;
    }
    loadGradebook();
  }, [selectedClass]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!gradebookData || !selectedClass) return;
    setExporting(true);

    try {
      const headers = ["Student Name", "Email"];
      gradebookData.assignments.forEach(asg => {
        headers.push(`${asg.title} (Max ${asg.totalMarks})`);
      });
      headers.push("Total Earned", "Total Possible", "Percentage (%)", "Missing Tasks", "Late Submissions");

      const rows = gradebookData.students.map(st => {
        const studentRow = [
          `"${st.firstName} ${st.lastName}"`,
          `"${st.email}"`
        ];
        gradebookData.assignments.forEach(asg => {
          const gradeInfo = st.grades[asg.id];
          if (gradeInfo) {
            if (gradeInfo.score !== null) {
              studentRow.push(`${gradeInfo.score}`);
            } else {
              studentRow.push(`"${gradeInfo.status}"`);
            }
          } else {
            studentRow.push('"N/A"');
          }
        });
        studentRow.push(
          `${st.totalEarned}`,
          `${st.totalPossible}`,
          `${st.percentage}`,
          `${st.missingCount}`,
          `${st.lateCount}`
        );
        return studentRow.join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Gradebook_${selectedClass.courseName.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  // Calculations for summary metrics
  const getSyllabusSummary = () => {
    if (!gradebookData || gradebookData.students.length === 0) return null;
    const studentCount = gradebookData.students.length;
    const assignmentCount = gradebookData.assignments.length;

    let classTotalPercentage = 0;
    let totalMissing = 0;
    let totalLate = 0;
    const highRiskStudents: GradebookStudent[] = [];

    gradebookData.students.forEach(st => {
      classTotalPercentage += st.percentage;
      totalMissing += st.missingCount;
      totalLate += st.lateCount;

      // Classify as high-risk if percentage < 60% or more than 2 missing assignments
      if (st.percentage < 60 || st.missingCount > 2) {
        highRiskStudents.push(st);
      }
    });

    const averagePercentage = parseFloat((classTotalPercentage / studentCount).toFixed(1));

    return {
      studentCount,
      assignmentCount,
      averagePercentage,
      totalMissing,
      totalLate,
      highRiskCount: highRiskStudents.length,
      highRiskStudents
    };
  };

  const metrics = getSyllabusSummary();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "GRADED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "LATE":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "RETURNED":
        return "bg-red-50 text-red-700 border-red-100";
      case "MISSING":
        return "bg-rose-50 text-rose-700 border-rose-100 font-bold";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* SELECTION AND REFRESH HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Class Syllabus Gradebook</label>
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

          {selectedClass && (
            <button
              onClick={loadGradebook}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors self-end cursor-pointer"
              title="Refresh Gradebook Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
            </button>
          )}
        </div>

        {gradebookData && gradebookData.students.length > 0 && (
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {exporting ? "Compiling..." : "Export to CSV"}
          </button>
        )}
      </div>

      {!selectedClass ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">Select a Class for Performance Tracking</h4>
          <p className="text-xs text-slate-400 mt-1">
            Choose a class from the options above to review grade sheets, export averages, and track attendance.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <span className="text-xs font-bold text-slate-500">Aggregating gradebook database...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-red-800 text-xs">Error Loading Gradebook</h5>
            <p className="text-[11px] text-red-600 mt-1">{error}</p>
          </div>
        </div>
      ) : !gradebookData || gradebookData.students.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">No Enrolled Students Logged</h4>
          <p className="text-xs text-slate-400 mt-1">There are no students currently enrolled in this active course class.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* ANALYTICS HIGHLIGHTS */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Class Average Score</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-display font-black text-2xl ${
                    metrics.averagePercentage >= 75 ? "text-emerald-600" : metrics.averagePercentage >= 60 ? "text-slate-800" : "text-red-500"
                  }`}>{metrics.averagePercentage}%</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Average of {metrics.studentCount} active students</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Completed Assignments</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-display font-black text-slate-900 text-2xl">{metrics.assignmentCount}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Syllabus compliance tasks active</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Missing Submissions</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-display font-black text-2xl ${
                    metrics.totalMissing > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}>{metrics.totalMissing}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Outstanding tasks past due dates</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Academic At-Risk Students</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`font-display font-black text-2xl ${
                    metrics.highRiskCount > 0 ? "text-red-500 animate-pulse" : "text-emerald-600"
                  }`}>{metrics.highRiskCount}</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Below 60% or &gt; 2 missing tasks</p>
              </div>
            </div>
          )}

          {/* GRADEBOOK MAIN TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">Class Grade Ledger</h4>
              <span className="text-[10px] text-slate-400 font-bold">Scroll horizontally to view all assignments</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-4 border-r border-slate-800 min-w-[200px] sticky left-0 bg-slate-900 z-10">Student</th>
                    {gradebookData.assignments.map(asg => (
                      <th key={asg.id} className="p-4 border-r border-slate-800 text-center min-w-[150px]">
                        <span className="block truncate max-w-[130px]" title={asg.title}>{asg.title}</span>
                        <span className="block text-[8px] text-slate-400 mt-0.5">Max {asg.totalMarks} pts</span>
                      </th>
                    ))}
                    <th className="p-4 text-center min-w-[100px] bg-slate-800">Total Score</th>
                    <th className="p-4 text-center min-w-[100px] bg-slate-850">Percentage</th>
                    <th className="p-4 text-center min-w-[100px]">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {gradebookData.students.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border-r border-slate-100 sticky left-0 bg-white hover:bg-slate-50 font-semibold z-10 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {st.firstName[0]}{st.lastName[0]}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block truncate max-w-[140px]">{st.firstName} {st.lastName}</span>
                          <span className="text-[9px] text-slate-400 block truncate max-w-[140px]" title={st.email}>{st.email}</span>
                        </div>
                      </td>

                      {gradebookData.assignments.map(asg => {
                        const gradeInfo = st.grades[asg.id];
                        return (
                          <td key={asg.id} className="p-4 border-r border-slate-100 text-center">
                            {gradeInfo ? (
                              <div className="space-y-1">
                                <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-bold ${getStatusBadgeClass(gradeInfo.status)}`}>
                                  {gradeInfo.score !== null ? `${gradeInfo.score} / ${asg.totalMarks}` : gradeInfo.status}
                                </span>
                                {gradeInfo.isLate && (
                                  <span className="block text-[8px] text-amber-500 font-extrabold uppercase">LATE SUBMIT</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-semibold">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Score aggregation column */}
                      <td className="p-4 border-r border-slate-100 text-center font-bold text-slate-900 bg-slate-50/40">
                        {st.totalEarned} / {st.totalPossible}
                      </td>

                      {/* Percentage metric with coloring */}
                      <td className="p-4 border-r border-slate-100 text-center font-black bg-slate-50/70">
                        <span className={`px-2 py-1 rounded-md text-[11px] ${
                          st.percentage >= 75 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                            : st.percentage >= 60 
                            ? "bg-slate-100 text-slate-850" 
                            : "bg-red-50 text-red-800 border border-red-100 animate-pulse"
                        }`}>
                          {st.percentage}%
                        </span>
                      </td>

                      {/* Overdue/Missing Counter */}
                      <td className="p-4 text-center">
                        {st.missingCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md border border-rose-100 text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                            {st.missingCount} Missing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md border border-emerald-100 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
