const fs = require('fs');

let file = fs.readFileSync('src/components/InstructorPortal.tsx', 'utf8');

const targetStrStart = '{/* Password Management */}';
const targetStrEnd = '</motion.div>';

const startIndex = file.indexOf(targetStrStart);
const endIndex = file.indexOf(targetStrEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const toReplace = file.substring(startIndex, endIndex);
  const replacement = `
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <ProfileForm />
              </div>
            `;
  file = file.replace(toReplace, replacement);
  fs.writeFileSync('src/components/InstructorPortal.tsx', file);
  console.log('Replaced successfully');
} else {
  console.log('Not found');
}
