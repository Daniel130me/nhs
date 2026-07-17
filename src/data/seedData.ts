import { Instructor, Class, WeeklyLog, StudentSurvey, SystemConfig } from '../types';

export const DEFAULT_CONFIG: SystemConfig = {
  centers: [
    'Ikeja',
    'Akoka',
    'Ajah',
    'Lekki',
    'Festac',
    'Surulere',
    'Egbeda',
    'Ikorodu',
    'Abeokuta',
    'Akure 1',
    'Akure 2',
    'Ado-Ekiti',
    'Akute'
  ],
  courses: [
    {
      category: 'ICT Fundamentals',
      items: ['ICT Fundamentals']
    },
    {
      category: 'Computer Networking',
      items: [
        'Networking - CompTIA N+',
        'Networking - CCNA',
        'Networking - CCNP'
      ]
    },
    {
      category: 'Cyber Security',
      items: [
        'Cyber Security - CompTIA Security+',
        'Cyber Security - CompTIA Pen Test+',
        'Cyber Security - CompTIA SecAI+',
        'Cyber Security - CEH v13 AI',
        'Cyber Security - CISM',
        'Cyber Security - CISSP'
      ]
    },
    {
      category: 'General IT',
      items: [
        'CompTIA A+',
        'ITIL Foundation',
        'CRM (MS Dynamics)',
        'Office 365'
      ]
    },
    {
      category: 'Graphics & Multimedia',
      items: [
        'Graphics & Multimedia - Graphics Design & Video Editing',
        'Graphics & Multimedia - Advanced Video Editing',
        'UI/UX (Product) Design',
        'Web Design'
      ]
    },
    {
      category: 'Data & Cloud',
      items: [
        'Excel Analytics & Presentation',
        'Data Analysis',
        'Cloud - Azure',
        'Cloud - AWS'
      ]
    },
    {
      category: 'Programming & Development',
      items: [
        'Python Programming',
        'Microsoft Technology (C#)',
        'Java Technology',
        'Full Stack Web Development',
        'Full Stack Software Development',
        'Mobile Application Development',
        'Blockchain'
      ]
    },
    {
      category: 'E-Business',
      items: [
        'E-Business - Digital Marketing & Analytics',
        'E-Business - Project Management Professional',
        'E-Business - Scrum & More'
      ]
    },
    {
      category: 'Accounting & Finance',
      items: ['AI for Accounting & Finance']
    }
  ],
  timeSlots: [
    'Morning (9am - 12pm)',
    'Afternoon (12pm - 4pm)',
    'Evening (5pm - 8pm)'
  ]
};

export const SEED_INSTRUCTORS: Instructor[] = [
  {
    id: 'inst-admin-1',
    firstName: 'Olusola',
    lastName: 'Adekoya',
    email: 'admin@newhorizons.com',
    gender: 'Male',
    center: 'Ikeja',
    courses: ['Data Analysis', 'Python Programming', 'Cloud - AWS'],
    role: 'Admin',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inst-2',
    firstName: 'Chidi',
    lastName: 'Eze',
    email: 'instructor@newhorizons.com',
    gender: 'Male',
    center: 'Ikeja',
    courses: ['Data Analysis', 'Python Programming', 'Excel Analytics & Presentation'],
    role: 'Instructor',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inst-3',
    firstName: 'Fatima',
    lastName: 'Bello',
    email: 'fatima@newhorizons.com',
    gender: 'Female',
    center: 'Akoka',
    courses: ['Cyber Security - CompTIA Security+', 'Networking - CCNA'],
    role: 'Instructor',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const SEED_CLASSES: Class[] = [
  {
    id: 'class-1',
    courseName: 'Data Analysis',
    instructorId: 'inst-2',
    instructorName: 'Chidi Eze',
    totalDurationHours: 40,
    classroom: 'Lab 3',
    scheduleType: 'Weekend',
    days: ['Saturday', 'Sunday'],
    timeSlot: 'Afternoon',
    startDate: '2026-06-15',
    endDate: '2026-08-15',
    modules: [
      { id: 'm1', name: 'Module 1: Introduction to Power Query & Data Cleaning', done: true },
      { id: 'm2', name: 'Module 2: Advanced DAX formulas and Modeling', done: true },
      { id: 'm3', name: 'Module 3: Visualizations & Interactive Dashboards', done: false },
      { id: 'm4', name: 'Module 4: Publishing Reports & Row-Level Security', done: false },
      { id: 'm5', name: 'Module 5: Project Presentation & Final Evaluation', done: false }
    ],
    status: 'Active',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'class-2',
    courseName: 'Python Programming',
    instructorId: 'inst-2',
    instructorName: 'Chidi Eze',
    totalDurationHours: 32,
    classroom: 'Lab 1',
    scheduleType: 'Weekday',
    days: ['Monday', 'Wednesday'],
    timeSlot: 'Morning',
    startDate: '2026-06-20',
    endDate: '2026-07-25',
    modules: [
      { id: 'p1', name: 'Module 1: Syntax, Variables and Basic Operations', done: true },
      { id: 'p2', name: 'Module 2: Control Flow and Loops', done: true },
      { id: 'p3', name: 'Module 3: Functions, Modules and Standard Library', done: true },
      { id: 'p4', name: 'Module 4: File I/O and Error Handling', done: true },
      { id: 'p5', name: 'Module 5: Object-Oriented Programming principles', done: false },
      { id: 'p6', name: 'Module 6: Final Capstone API and Deployment', done: false }
    ],
    status: 'Active',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'class-3',
    courseName: 'Cyber Security - CompTIA Security+',
    instructorId: 'inst-3',
    instructorName: 'Fatima Bello',
    totalDurationHours: 48,
    classroom: 'Lab 2',
    scheduleType: 'Weekday',
    days: ['Tuesday', 'Thursday'],
    timeSlot: 'Morning',
    startDate: '2026-06-10',
    endDate: '2026-07-30',
    modules: [
      { id: 's1', name: 'Module 1: Attacks, Threats, and Vulnerabilities', done: true },
      { id: 's2', name: 'Module 2: Architecture and Design of Secure Systems', done: false },
      { id: 's3', name: 'Module 3: Implementation of Host & Network Security', done: false },
      { id: 's4', name: 'Module 4: Operations and Incident Response', done: false },
      { id: 's5', name: 'Module 5: Governance, Risk, and Compliance', done: false }
    ],
    status: 'Active',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const SEED_LOGS: WeeklyLog[] = [
  {
    id: 'log-1',
    classId: 'class-1',
    weekNumber: 1,
    hoursLogged: 8,
    modulesCoveredThisWeek: ['m1'],
    challenges: 'Power BI Service license issues in Lab 3 caused minor delay, but solved by using offline Desktop version.',
    submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    instructorId: 'inst-2'
  },
  {
    id: 'log-2',
    classId: 'class-1',
    weekNumber: 2,
    hoursLogged: 8,
    modulesCoveredThisWeek: ['m2'],
    challenges: 'Data modeling is slightly difficult for a few students. Spending extra 30 minutes on relationships.',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    instructorId: 'inst-2'
  },
  {
    id: 'log-3',
    classId: 'class-2',
    weekNumber: 1,
    hoursLogged: 6,
    modulesCoveredThisWeek: ['p1', 'p2'],
    challenges: 'One student laptop required Python PATH variable correction. Smooth other than that.',
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    instructorId: 'inst-2'
  },
  {
    id: 'log-4',
    classId: 'class-2',
    weekNumber: 2,
    hoursLogged: 6,
    modulesCoveredThisWeek: ['p3', 'p4'],
    challenges: 'Very active engagement during the file exercises. No major challenges.',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    instructorId: 'inst-2'
  }
];

export const SEED_SURVEYS: StudentSurvey[] = [
  {
    id: 'survey-1',
    weekEnding: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    courseName: 'Data Analysis',
    center: 'Ikeja',
    studentName: 'Adebayo T.',
    anonymous: false,
    pace: 3, // Just right
    clarity: 5, // Strongly Agree
    keepUp: 4, // Agree
    questionsAnswered: 'Always',
    materialsClear: 5,
    materialsOnTime: 'Yes, on time',
    exercisesMatched: 'Yes',
    labSufficient: 5,
    toolsWorked: 'Yes, no issues',
    couldComplete: 'Yes',
    hadIssue: 'No',
    issueCategories: [],
    severity: '',
    issueDescription: '',
    repeatIssue: '',
    overallSatisfaction: 5,
    confidence: 4,
    additionalComments: 'Mr. Chidi explains things so well! Love the Power BI modeling exercises.',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'survey-2',
    weekEnding: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    courseName: 'Data Analysis',
    center: 'Ikeja',
    studentName: '',
    anonymous: true,
    pace: 4, // Somewhat fast
    clarity: 4, // Agree
    keepUp: 3, // Neutral
    questionsAnswered: 'Usually',
    materialsClear: 4,
    materialsOnTime: 'Yes, on time',
    exercisesMatched: 'Partially',
    labSufficient: 4,
    toolsWorked: 'Minor issues',
    couldComplete: 'Partially',
    hadIssue: 'Yes',
    issueCategories: ['Pace of Teaching', 'Technical/Lab Equipment'],
    severity: 'Medium',
    issueDescription: 'The trainer is a bit fast on DAX functions. Also, some PCs in Lab 3 had slow internet connection.',
    repeatIssue: 'No',
    overallSatisfaction: 3,
    confidence: 3,
    additionalComments: '',
    submittedAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'survey-3',
    weekEnding: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    courseName: 'Python Programming',
    center: 'Ikeja',
    studentName: 'Faith O.',
    anonymous: false,
    pace: 3, // Just right
    clarity: 5, // Strongly Agree
    keepUp: 5, // Strongly Agree
    questionsAnswered: 'Always',
    materialsClear: 5,
    materialsOnTime: 'Yes, on time',
    exercisesMatched: 'Yes',
    labSufficient: 5,
    toolsWorked: 'Yes, no issues',
    couldComplete: 'Yes',
    hadIssue: 'No',
    issueCategories: [],
    severity: '',
    issueDescription: '',
    repeatIssue: '',
    overallSatisfaction: 5,
    confidence: 5,
    additionalComments: 'This Python class is absolutely amazing. Highly practical and direct.',
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'survey-4',
    weekEnding: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    courseName: 'Cyber Security - CompTIA Security+',
    center: 'Akoka',
    studentName: '',
    anonymous: true,
    pace: 4, // Somewhat fast
    clarity: 3, // Neutral
    keepUp: 2, // Disagree
    questionsAnswered: 'Sometimes',
    materialsClear: 3,
    materialsOnTime: 'Late',
    exercisesMatched: 'No',
    labSufficient: 2,
    toolsWorked: 'Major issues',
    couldComplete: 'No',
    hadIssue: 'Yes',
    issueCategories: ['Course Material', 'Software/Tools Access', 'Technical/Lab Equipment'],
    severity: 'High',
    issueDescription: 'Slides were only shared on Thursday afternoon. The virtualization lab VMs did not load because of RAM issues on Akoka Lab 2 machines.',
    repeatIssue: 'Yes',
    overallSatisfaction: 2,
    confidence: 2,
    additionalComments: 'Please look into the lab machines. We spent 2 hours trying to boot VMs without success.',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];
