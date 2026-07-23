const fs = require('fs');
let file = fs.readFileSync('src/components/ProfileForm.tsx', 'utf8');

file = file.replace(
  "const token = localStorage.getItem('token');",
  "const token = localStorage.getItem('nhs_token');"
);

fs.writeFileSync('src/components/ProfileForm.tsx', file);
