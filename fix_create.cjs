const fs = require('fs');

let file = fs.readFileSync('src/server/modules/admin/admin.routes.ts', 'utf8');

// replace the argon2 hash for temp hash
file = file.replace(
  'const tempHash = await argon2.hash(crypto.randomBytes(32).toString("hex"), { type: argon2.argon2id });',
  `const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    password += chars[bytes[i] % chars.length];
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });`
);

file = file.replace(
  "VALUES ($1, $2, $3, $4, $5, 'STUDENT', 'PENDING', $6, $7, TRUE)",
  "VALUES ($1, $2, $3, $4, $5, 'STUDENT', 'ACTIVE', $6, $7, TRUE)"
);

file = file.replace(/tempHash/g, "passwordHash");

const invStart = file.indexOf('// Create invitation');
const invEnd = file.indexOf('await query("COMMIT");');
if (invStart !== -1 && invEnd !== -1) {
  file = file.substring(0, invStart) + `
    // Return generated password as activation token for backward compatibility in UI
    const rawToken = password;
    ` + file.substring(invEnd);
}

fs.writeFileSync('src/server/modules/admin/admin.routes.ts', file);
