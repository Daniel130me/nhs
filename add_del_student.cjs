const fs = require('fs');

let file = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const targetMethod = `
  const handleToggleStudentStatus = async (id: string, currentStatus: string) => {
`;

const addMethod = `
  const handleDeleteStudent = async (id: string, firstName: string, lastName: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Delete Student Account",
      message: \`Are you sure you want to permanently delete \${firstName} \${lastName}? This action cannot be undone and will remove their access.\`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('nhs_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = \`Bearer \${token}\`;

          const res = await fetch(\`/api/v1/admin/students/\${id}\`, {
            method: 'DELETE',
            headers
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to delete student');
          }

          alert("Student deleted successfully!");
          fetchAdminStudents();
        } catch (err: any) {
          alert(err.message || 'Failed to delete student');
        } finally {
          setConfirmationModal(null);
        }
      }
    });
  };

  const handleToggleStudentStatus = async (id: string, currentStatus: string) => {
`;

file = file.replace(targetMethod, addMethod);

const targetButton = `
                            <button
                              onClick={() => handleReinviteStudent(stu.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                            >
                              Regenerate Invite
                            </button>
`;

const addButton = targetButton + `
                            <button
                              onClick={() => handleDeleteStudent(stu.id, stu.firstName, stu.lastName)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
`;

file = file.replace(targetButton, addButton);

fs.writeFileSync('src/components/AdminDashboard.tsx', file);
