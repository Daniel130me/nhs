export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  center: string;
  courses: string[];
  role: 'Instructor' | 'Admin';
  createdAt: string;
}

export interface Module {
  id: string;
  name: string;
  done: boolean;
}

export interface Resource {
  id: string;
  name: string;
  type: 'slides' | 'pdf' | 'video';
  url: string;
  content?: string; // slide contents or document details (securely read in UI)
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  resources: Resource[];
}

export interface Course {
  id: string;
  name: string;
  category: string;
  description: string;
  lessons: Lesson[];
  createdAt: string;
}

export interface Class {
  id: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  totalDurationHours: number;
  classroom: string;
  scheduleType: 'Weekday' | 'Weekend' | 'Fast-track' | 'Online';
  days: string[];
  timeSlot: 'Morning' | 'Afternoon';
  startDate: string; // e.g. '2026-07-10'
  endDate: string; // e.g. '2026-08-10'
  modules: Module[];
  status: 'Active' | 'Completed' | 'Paused';
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  instructorId: string;
  courseName: string;
  trialNumber: number; // 1 or 2
  score: number; // e.g., 80
  passed: boolean;
  feedback: string;
  takenAt: string;
}

export interface WeeklyLog {
  id: string;
  classId: string;
  weekNumber: number;
  hoursLogged: number;
  modulesCoveredThisWeek: string[]; // list of module IDs
  challenges: string;
  submittedAt: string;
  instructorId: string;
}

export interface StudentSurvey {
  id: string;
  weekEnding: string;
  courseName: string;
  center: string;
  studentName: string;
  anonymous: boolean;
  pace: number; // 1-5 (Too slow to Too fast)
  clarity: number; // 1-5
  keepUp: number; // 1-5
  questionsAnswered: string;
  materialsClear: number; // 1-5
  materialsOnTime: string;
  exercisesMatched: string;
  labSufficient: number | null; // 1-5 or null
  toolsWorked: string;
  couldComplete: string;
  hadIssue: 'Yes' | 'No';
  issueCategories: string[];
  severity: 'Low' | 'Medium' | 'High' | 'Urgent' | '';
  issueDescription: string;
  repeatIssue: 'Yes' | 'No' | 'Not sure' | '';
  overallSatisfaction: number; // 1-5
  confidence: number; // 1-5
  additionalComments: string;
  submittedAt: string;
}

export interface SystemConfig {
  centers: string[];
  courses: {
    category: string;
    items: string[];
  }[];
  timeSlots: string[];
}
