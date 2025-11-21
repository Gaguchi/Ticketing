# Ticketing System AI Instructions

You are working on a multi-tenant ticketing system with a Django backend and two React frontends (Main App & Service Desk).

## 🏗 Architecture Overview

- **Backend**: Django 5.1+, DRF, PostgreSQL, Channels (WebSockets).
  - **Core Apps**: `tickets` (main logic), `chat` (websockets), `config` (settings).
  - **Auth**: Simple JWT + Custom `X-Super-Secret-Key` for dev.
- **Frontend**: React 19, TypeScript, Vite, Ant Design 5.
  - **State**: React Context (`CompanyProvider`), `useState`.
  - **Routing**: React Router 7.
- **Service Desk**: React 19, TypeScript, Vite, Tailwind CSS + Ant Design.
  - **Port**: 3001 (distinct from main frontend on 5173).

## 🚀 Critical Workflows

### Startup

- **Run All Services**: `.\start.ps1` (Windows PowerShell).
- **Backend Only**: `cd backend; python manage.py runserver`.
- **Frontend Only**: `cd frontend; npm run dev`.
- **Service Desk Only**: `cd servicedesk; npm run dev`.

### Database Management

- **Reset DB (Dev)**: `cd backend; .\reset_db.ps1 -CreateSuperuser` (PowerShell) or `./reset_db.sh --create-superuser` (Bash).
  - **Warning**: This wipes all data!
- **Migrations**: `python manage.py makemigrations` -> `python manage.py migrate`.

### Authentication

- **Dev Bypass**: Use header `X-Super-Secret-Key: dev-super-secret-key-12345` to bypass JWT.
- **Production**: JWT Bearer tokens (`/api/tickets/auth/login/`).

## 🧩 Code Conventions

### Backend (Django)

- **Models**: Located in `backend/tickets/models.py`. Use `UserRole` for project-level permissions.
- **Views**: DRF ViewSets in `backend/tickets/views.py`.
- **URLs**: `backend/tickets/urls.py` and `backend/config/urls.py`.
- **WebSockets**: `backend/chat/consumers.py` for real-time features.

### Frontend (React)

- **UI Library**: Ant Design (`antd`) is the primary UI kit.
- **Icons**: `@ant-design/icons` or FontAwesome.
- **API Calls**: Use `fetch` or `axios` with base URL from `VITE_API_BASE_URL`.
- **Components**: Functional components with TypeScript interfaces.
- **Drag & Drop**: `@dnd-kit` for Kanban boards.

### Service Desk

- **Styling**: Uses **Tailwind CSS** (`class` attributes) mixed with Ant Design.

## 📂 Documentation

- **Architecture**: `docs/SYSTEM_ARCHITECTURE.md` (Read this for data model details).
- **API**: `docs/api/API_REFERENCE.md`.
- **Deployment**: `docs/deployment/`.

## ⚠️ Important Notes

- **User Roles**: Roles are **per-project** (`UserRole` model), not global.
- **Companies**: Clients are `Company` entities; users can belong to companies.
- **Tickets**: Can be project-general OR company-specific.
