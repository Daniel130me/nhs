const fs = require('fs');

let file = fs.readFileSync('src/components/StudentPortal.tsx', 'utf8');

file = file.replace(
  "const [activeTab, setActiveTab] = useState<'classes' | 'campaigns' | 'support' | 'notifications' | 'certificates'>('classes');",
  "const [activeTab, setActiveTab] = useState<'classes' | 'campaigns' | 'support' | 'notifications' | 'certificates' | 'profile'>('classes');"
);

file = file.replace(
  "import { \n  BookOpen",
  "import ProfileForm from './ProfileForm';\nimport { \n  User, BookOpen"
);

// Add the Profile tab button
const targetTabs = `
            <button
              onClick={() => { setActiveTab('certificates'); }}
              className={\`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer \${
                activeTab === 'certificates' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }\`}
            >
              <Award className="w-4 h-4" /> Certificates
            </button>
`;

const replaceTabs = targetTabs + `
            <button
              onClick={() => { setActiveTab('profile'); }}
              className={\`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer \${
                activeTab === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }\`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
`;

file = file.replace(targetTabs, replaceTabs);

const targetContent = `
          {activeTab === 'support' && renderSupportCases()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'certificates' && renderCertificates()}
`;

const replaceContent = targetContent + `
          {activeTab === 'profile' && (
            <div className="p-6">
              <ProfileForm />
            </div>
          )}
`;

file = file.replace(targetContent, replaceContent);

fs.writeFileSync('src/components/StudentPortal.tsx', file);
