const fs = require('fs');

let file = fs.readFileSync('src/server/modules/admin/admin.routes.ts', 'utf8');

const targetStr = `// POST /api/v1/admin/students/import`;

const replacementStr = `// DELETE /api/v1/admin/students/:id
router.delete(
  "/students/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const users = await query<any>(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = 'STUDENT' AND deleted_at IS NULL",
      [id]
    );

    if (users.length === 0) {
      throw new NotFoundError("Student account not found.");
    }

    const user = users[0];

    // Soft-delete user in database (bin/trash under the hood)
    await query("UPDATE users SET deleted_at = NOW(), status = 'DELETED', updated_at = NOW() WHERE id = $1", [id]);
    
    // Invalidate active sessions
    await query(\`DELETE FROM "session" WHERE sess::text LIKE $1\`, [\`%"userId":"\${id}"%\`]);

    await logAudit({
      req,
      action: "Delete Student",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email }
    });

    return sendSuccess(res, { success: true }, "Student account deleted successfully.");
  })
);

// POST /api/v1/admin/students/import`;

file = file.replace(targetStr, replacementStr);
fs.writeFileSync('src/server/modules/admin/admin.routes.ts', file);
