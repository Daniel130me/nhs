const fs = require('fs');

let file = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

file = file.replace(
  "const [adminTab, setAdminTab] = useState<'Analytics' | 'Instructors' | 'Students' | 'Surveys' | 'InstructorLogs' | 'Config' | 'Reports'>('Analytics');",
  "const [adminTab, setAdminTab] = useState<'Analytics' | 'Instructors' | 'Students' | 'Surveys' | 'InstructorLogs' | 'Config' | 'Reports' | 'Profile'>('Analytics');"
);

file = file.replace(
  "import { \n  Users",
  "import ProfileForm from './ProfileForm';\nimport { \n  Users"
);

const oldTabs = `
          [
            { id: 'Analytics', label: 'Analytics' },
            { id: 'Instructors', label: 'Instructors' },
            { id: 'Students', label: 'Students' },
            { id: 'Surveys', label: 'Surveys' },
            { id: 'InstructorLogs', label: 'Instructor Logs' },
            { id: 'Reports', label: 'Reports & Certificates' },
            { id: 'Config', label: 'Operations Hub' }
          ].map((tab) => (
`;

const newTabs = `
          [
            { id: 'Analytics', label: 'Analytics' },
            { id: 'Instructors', label: 'Instructors' },
            { id: 'Students', label: 'Students' },
            { id: 'Surveys', label: 'Surveys' },
            { id: 'InstructorLogs', label: 'Instructor Logs' },
            { id: 'Reports', label: 'Reports & Certificates' },
            { id: 'Config', label: 'Operations Hub' },
            { id: 'Profile', label: 'Profile' }
          ].map((tab) => (
`;

file = file.replace(oldTabs, newTabs);

const targetReports = `
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
`;

const targetProfile = targetReports + `
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
`;

file = file.replace(targetReports, targetProfile);

fs.writeFileSync('src/components/AdminDashboard.tsx', file);
console.log('Replaced Profile tab');
