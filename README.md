# 🎓 Course Management Platform — Fullstack EdTech & Learning Management Platform

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![EF Core](https://img.shields.io/badge/Entity_Framework_Core-10.0-512BD4?logo=nuget&logoColor=white)](https://learn.microsoft.com/ef/core/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern, role-based educational management and online course platform built with an **ASP.NET Core Web API** backend and a **React + TypeScript + TanStack** frontend. The platform provides end-to-end workflows for students, teachers, and system administrators, featuring real-time enrollment validation, teacher branch eligibility matching, support ticketing, analytics dashboards, and seamless bilingual (EN / TR) localization.

---

## 📸 Overview & Features

### 👤 Role-Based Portals & Capabilities

#### 1. 🛡️ System Administrator
* **Dashboard & Financial Metrics:** Real-time summary cards for total students, teachers, active courses, and platform revenue.
* **Teaching Request Approvals:** Review course assignment applications from teachers with verified branch compatibility.
* **Student & Teacher Management:** Advanced data tables with inline search, multi-select batch deletion, and profile inspection modals.
* **Support Ticket Center:** Multi-tab support inbox (Pending / Resolved) with in-app reply dispatching and soft-deletion controls.
* **Audit & Reports:** Detailed enrollment logs and system announcements.

#### 2. 👨‍🏫 Instructors (Teachers)
* **Taught Courses Portal:** Overview of active assigned courses, enrolled students, and classroom capacity.
* **Course Teaching Applications:** Browse unassigned courses and submit teaching requests strictly validated against instructor certification branches.
* **Direct Enrollment Tracking:** View attendee rosters per course with student numbers and enrollment dates.
* **Support Requests:** Dedicated portal to submit technical or administrative questions directly to the admin desk.

#### 3. 🎓 Students
* **Course Catalog & Search:** Explore featured, active, and upcoming courses with dynamic pricing and instructor details.
* **One-Click Enrollment:** Real-time capacity checks and duplicate enrollment prevention.
* **My Courses Dashboard:** Active course cards with instructor contacts and quick access.
* **Support Ticket Tracking:** Dual-tab status tracker (Pending / Resolved) to view submitted inquiries and admin responses.
* **Personal Profile Management:** Editable bio, personal details, and avatar image uploads.

---

## 🛠️ Tech Stack

### Backend (`/backend`)
* **Framework:** ASP.NET Core Web API (.NET 10)
* **Architecture:** N-Tier / Clean Architecture (`API`, `Business`, `Core`, `DataAccess`)
* **ORM:** Entity Framework Core 10 (Code-First with Migrations)
* **Database:** Microsoft SQL Server / LocalDB
* **Authentication:** JWT (JSON Web Tokens) with custom claims (`Role`, `Username`, `NameIdentifier`)
* **Security & Validation:**
  * FluentValidation with automatic pipeline validation
  * BCrypt.Net for secure password hashing
  * CORS security policies and global exception middleware
  * Soft-delete with EF Core Global Query Filters (`IsDeleted`, `IsDeletedByAdmin`)
* **Services & Background Tasks:**
  * SMTP Email Service integration
  * Background cleanup worker (`SoftDeleteCleanupService`)
  * Multipart file upload pipeline for user avatars

### Frontend (`/frontend`)
* **Core:** React 19, TypeScript
* **Routing:** `@tanstack/react-router` with type-safe route trees
* **Build Tool:** Vite with TanStack Start
* **Styling & UI:** Tailwind CSS v4, Radix UI primitives, Lucide React icons
* **Internationalization:** `i18next` & `react-i18next` (Seamless English / Turkish runtime toggle)
* **Data Visualization & Notifications:** Recharts, Sonner toasts
* **State & Forms:** React Hook Form, TanStack Query

---

## 📂 Project Architecture

```
course-management-platform/
├── backend/
│   ├── EdTechApi.API/           # HTTP Controllers, Middlewares, DI Setup, Program.cs
│   │   ├── Controllers/         # Auth, Courses, Students, Teachers, Requests, etc.
│   │   ├── Middlewares/         # Global Exception Handler Middleware
│   │   └── appsettings.example.json # Safe configuration template
│   ├── EdTechApi.Business/      # Core Business Logic & Services
│   │   ├── Services/            # CourseService, StudentService, EmailService, etc.
│   │   ├── ValidationRules/     # FluentValidation Validators
│   │   └── BackgroundJobs/      # Scheduled cleanup hosted services
│   ├── EdTechApi.Core/          # Domain Entities, DTOs & Interfaces
│   │   └── Entities/            # Course, User, Student, Teacher, SupportRequest, etc.
│   └── EdTechApi.DataAccess/    # EF Core DbContext, Migrations & Database Configurations
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components (Sidebar, PageHeader, Modal, etc.)
│   │   ├── locales/             # en.json and tr.json translation dictionaries
│   │   ├── routes/              # TanStack type-safe file routes
│   │   │   ├── _authenticated.tsx         # Auth guard & token expiration check
│   │   │   ├── _authenticated.dashboard.tsx
│   │   │   ├── _authenticated.istekler.tsx # Admin request management
│   │   │   ├── _authenticated.yardim.tsx   # Help & Support ticket submission
│   │   │   └── ...
│   │   └── lib/                 # Utility functions & helpers
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/download)
* [Node.js (v18+)](https://nodejs.org/) & `npm`
* [SQL Server](https://www.microsoft.com/sql-server) or SQL Server Express / LocalDB

---

### 1. Backend Setup

1. **Navigate to the API directory:**
   ```bash
   cd backend/EdTechApi.API
   ```

2. **Configure App Settings:**
   Copy the example settings template to create your local `appsettings.json`:
   ```bash
   cp appsettings.example.json appsettings.json
   ```
   Open `appsettings.json` and adjust your connection string and credentials:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=EdTechDB;Trusted_Connection=True;TrustServerCertificate=True;"
     },
     "Jwt": {
       "Key": "YOUR_SUPER_SECRET_KEY_AT_LEAST_32_CHARACTERS!",
       "Issuer": "EdTechApi",
       "Audience": "EdTechApiUsers"
     }
   }
   ```

3. **Apply Database Migrations:**
   ```bash
   dotnet ef database update -p ../EdTechApi.DataAccess/EdTechApi.DataAccess.csproj -s EdTechApi.API.csproj
   ```

4. **Run the API:**
   ```bash
   dotnet run
   ```
   *The API will start listening at `http://localhost:5157`.*

---

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Launch the development server:**
   ```bash
   npm run dev
   ```
   *The client application will open at `http://localhost:8080` (or `http://localhost:5173`).*

---

## 🔐 Authentication & Roles

User roles are assigned during registration:
* **Student (`User`):** Standard registration with default student privileges.
* **Teacher (`Teacher`):** Registered using an approved teacher registration code; linked with subject branches.
* **Administrator (`Admin` / `SuperAdmin`):** Full access to user management, course approvals, and ticket centers.

---

## 🌐 Localization (i18n)

The application supports real-time language toggling between **English (EN)** and **Turkish (TR)** without page reloads. All labels, table headers, forms, dynamic course categories, and backend validation errors are mapped through centralized dictionary stores in `frontend/src/locales/`.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Yağız Cengiz**
* GitHub: [@yagizcngz](https://github.com/yagizcngz)
* Email: [yagizcengiz55@gmail.com](mailto:yagizcengiz55@gmail.com)
