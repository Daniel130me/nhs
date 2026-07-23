const fs = require('fs');

let file = fs.readFileSync('src/components/InstructorPortal.tsx', 'utf8');

file = file.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport ProfileForm from './ProfileForm';"
);

const targetProfileStr = `
                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                  <span>Profile Registration</span>
                  <span>{new Date(currentInstructor.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
`;

const replacementProfileStr = targetProfileStr + `
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <ProfileForm />
              </div>
`;

file = file.replace(targetProfileStr, replacementProfileStr);

fs.writeFileSync('src/components/InstructorPortal.tsx', file);
