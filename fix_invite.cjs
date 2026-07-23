const fs = require('fs');
let file = fs.readFileSync('src/server/modules/admin/admin.routes.ts', 'utf8');

const targetStr = `
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      \`INSERT INTO user_invitations (email, role, token_hash, invited_by, expires_at)
       VALUES ($1, 'STUDENT', $2, $3, $4)\`,
      [student.email, tokenHash, req.user!.id, expiresAt]
    );

    await emailService.sendInvitation(student.email, rawToken, "STUDENT", req.user!.email);
`;

const replacementStr = `
    const passwordHash = await argon2.hash(rawToken, { type: argon2.argon2id });
    await query(
      \`UPDATE users SET password_hash = $1, status = 'ACTIVE' WHERE id = $2\`,
      [passwordHash, id]
    );
`;

file = file.replace(targetStr, replacementStr);
fs.writeFileSync('src/server/modules/admin/admin.routes.ts', file);
