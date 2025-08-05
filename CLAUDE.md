# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for a check-in management system. The application provides an admin interface for managing security guards, sites, and check-in records, with role-based access control (super admin vs regular admin).

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compilation then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Architecture

### Core Technologies
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **React Router Dom** for client-side routing
- **Tailwind CSS** for styling
- **ESLint** for code linting

### Project Structure
```
src/
├── admin/           # Admin interface components
│   ├── dashboard.tsx    # Main dashboard
│   ├── guards.tsx       # Guard management
│   ├── sites.tsx        # Site management  
│   ├── checkins.tsx     # Check-in records
│   ├── manager.tsx      # Super admin page
│   ├── login.tsx        # Login page
│   └── layout.tsx       # Admin layout wrapper
├── util/            # Utility modules
│   ├── auth.ts          # Authentication helpers
│   ├── config.ts        # Configuration (API base URL)
│   └── request.ts       # HTTP request wrapper
└── assets/          # Static assets
```

### Authentication & Authorization
- Token-based authentication stored in localStorage
- Two user roles: regular admin and super admin (`superAdmin` flag in localStorage)
- Protected routes with automatic redirection to login on authentication failure
- API requests automatically include Bearer token and handle 401 responses

### API Integration
- Base API URL configured in `src/util/config.ts` (currently `http://localhost:8080`)
- Centralized request wrapper in `src/util/request.ts` handles:
  - Authorization headers
  - Token validation
  - Automatic logout on 401 responses

### Routing Structure
- `/login` - Login page (public)
- `/admin/*` - Admin interface (protected)
  - `/admin` - Dashboard
  - `/admin/guards` - Guard management
  - `/admin/sites` - Site management  
  - `/admin/checkins` - Check-in records
- `/manager` - Super admin only page (protected + role check)
- Default redirect to `/admin`

### Key Components
- `ProtectedRoute`: Handles authentication and role-based access control
- `AdminLayout`: Provides navigation sidebar and main content area
- Individual admin pages for CRUD operations on different entities

## Configuration Files
- `vite.config.ts`: Vite build configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript project references
- `eslint.config.js`: ESLint configuration