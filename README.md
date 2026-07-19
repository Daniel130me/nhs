# New Horizons LMS & Operational Analytics Portal

Welcome to **New Horizons**, a modern, production-grade Learning Management System (LMS) and Operational Analytics Portal built for administrators and instructors. This portal bridges classroom instruction compliance, real-time student pulse metrics, and secure, AI-powered instructor evaluations.

---

## 🌟 Key Product Features

- **Double-Sided Workspace**:
  - **Admin Dashboard**: Real-time teaching hours analytics, compliance tracking, curriculum manager, student pulse dashboards, and secure account activation controls.
  - **Instructor Portal**: Comprehensive checklist mapping, weekly logs compliance form, interactive slide reviews, sandbox terminal simulators, and AI-graded competency assessments.
- **Durable Postgres Integration**: Backed by high-performance Neon Postgres storing instructor profiles, classes, weekly logs, surveys, and evaluation outcomes.
- **Smart Mentoring Evaluations**: Integrates Gemini API to construct custom, dynamically targeted competency questions, grade evaluations, and write personalized feedback.
- **CSV Exporters**: Standard export functionality to download student survey datasets and weekly compliance logs in clean Excel-compatible CSV formats.

---

## 🏗️ Architectural Topology

```
                  ┌───────────────────────┐
                  │   Vite Front-End      │ (React 19 + TypeScript)
                  │   (Tailwind & Motion) │
                  └──────────┬────────────┘
                             │
                  ┌──────────▼────────────┐
                  │   Express Web Server  │ (Node.js CJS/ESM Bundle)
                  └──────────┬────────────┘
                             │
           ┌─────────────────┴─────────────────┐
           ▼                                   ▼
 ┌───────────────────┐               ┌───────────────────┐
 │   Neon Postgres   │               │    Gemini API     │ (Google GenAI SDK)
 │   Database SQL    │               └───────────────────┘
 └───────────────────┘
```

---

## 🔒 Security & Input Validation Architecture

1. **SHA-256 Passwords**: Passwords are securely hashed with a localized salt-free SHA-256 signature.
2. **On-the-Fly Upgrades**: Built-in seamless hash-migration upgrades plaintext passwords to hashes upon successful login.
3. **Strict Input Verification**: All endpoints enforce schema validation via **Zod** models before performing SQL writes.
4. **Global Isolation**: Mounted a React 19 `ErrorBoundary` to catch UI rendering crashes and isolate them, providing diagnostic logs and instant reload recovery.
5. **Role & Activation Security**: Automatically enforces accounts status blocking deactivated instructors from logging in or filing metrics.

---

## 💾 Core SQL Tables Reference

### 1. `instructors`
- `id` (VARCHAR primary key)
- `first_name` (VARCHAR), `last_name` (VARCHAR)
- `email` (VARCHAR unique)
- `password` (VARCHAR hashed)
- `role` (VARCHAR: 'Instructor' | 'Admin')
- `status` (VARCHAR: 'Active' | 'Deactivated')

### 2. `classes`
- `id` (VARCHAR primary key)
- `course_name` (VARCHAR)
- `instructor_id` (VARCHAR FK)
- `classroom` (VARCHAR)
- `modules` (JSONB Checklist progress)
- `status` (VARCHAR: 'Active' | 'Completed' | 'Paused')

### 3. `student_surveys`
- `id` (VARCHAR primary key)
- `course_name` (VARCHAR)
- `center` (VARCHAR)
- `pace` (INT), `clarity` (INT), `keep_up` (INT)
- `had_issue` (VARCHAR: 'Yes' | 'No')
- `severity` (VARCHAR)

### 4. `weekly_logs`
- `id` (VARCHAR primary key)
- `class_id` (VARCHAR FK)
- `hours_logged` (INT)
- `modules_covered_this_week` (JSONB)
- `challenges` (TEXT)

---

## 🚀 Execution & Command Reference

### Development Sandbox
```bash
# Boot Express and hot Vite asset proxy on port 3000
npm run dev
```

### Static Code Analysis
```bash
# Run strict TypeScript configuration checks
npm run lint
```

### Automated Quality Assurance Suite
```bash
# Execute unit test suites (hashing and schema correctness) via Vitest
npm run test
```

### Build & Compilation
```bash
# Compile and bundle the full production server and React assets
npm run build
```

### Production Launch
```bash
# Run the bundled production CJS server
npm start
```

---

## 🧪 Testing Suite Details

We employ **Vitest** for quality assurance testing, targeting:
- **Hashing Determinism**: Validates encryption outcomes.
- **Zod Schemas**: Tests boundary inputs for both valid and malformed requests.
