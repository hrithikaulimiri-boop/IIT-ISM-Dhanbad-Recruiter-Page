# Campus Recruitment System (Option 2 Stack)

Full rebuild using strict stack:
- Frontend: Next.js (App Router) + MUI + NextAuth.js
- Backend: Laravel-style API codebase (JWT auth, Eloquent models, migrations)
- Database: MySQL/MariaDB (`campus_recruitment`)

## Structure
- `frontend/` Next.js recruiter portal (INF/JNF selection, dashboard, jobs, pipeline, applications, documents)
- `backend/` Laravel-compatible backend source (controllers, models, migrations, routes, email, uploads)
- `backend/postman/` Postman collection for API testing

## JNF alignment
Fields and sections are mapped from IIT ISM JNF 2026 PDF:
- Company overview + contacts
- Opening details and eligibility
- Salary breakup
- Hiring stages
- Uniform declaration

## Frontend setup
1. `cd frontend`
2. `cp .env.example .env.local`
3. Update `NEXT_PUBLIC_API_BASE_URL`
4. `npm install`
5. `npm run dev`

## Backend setup on XAMPP/Composer machine
1. Install Composer + PHP 8.2 + MySQL
2. `cd backend`
3. Initialize Laravel app if needed and copy these files into it OR continue directly if this folder is merged into a real Laravel project.
4. `cp .env.example .env`
5. Set DB to:
   - `DB_DATABASE=campus_recruitment`
   - `DB_USERNAME=root`
   - `DB_PASSWORD=`
6. Set Gmail SMTP values and `ADMIN_EMAIL`.
7. Install dependencies:
   - `composer install`
8. Generate key and jwt secret:
   - `php artisan key:generate`
   - `php artisan jwt:secret`
9. Run migrations:
   - `php artisan migrate`
10. Storage link:
   - `php artisan storage:link`
11. Serve API:
   - `php artisan serve`

## Required tables implemented
- company
- contact_person
- job_profile
- hiring_stage
- job_stage
- job_application
- recruitment_cycle
- salary
- eligibility
- job_document
- company_document
- salary_document
- declaration

## Notes
- Recruiter registration creates an active account (no manual approval step).
- Admin receives a no-reply notification email when a recruiter registers.
- Supports role types: `admin`, `recruiter`.
- Applications are segmented by portal in sidebar: `JNF Applications`, `INF Applications`.
- Applications support one-time edit and withdraw actions.
- Export endpoint: `/api/reports/applications/export` (Excel).
- Seeder includes demo admin:
  - email: `24je0900@iitism.ac.in`
  - password: `Admin@12345`
- Frontend route protection added via NextAuth middleware:
  - unauthenticated users are blocked from app routes
- Backend authorization hardening:
  - recruiters are restricted to their own company-scoped data
  - applies to companies, jobs, stages, applications, and documents
