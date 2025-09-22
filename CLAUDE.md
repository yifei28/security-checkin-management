# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for 都豪鼎盛内部系统 (Duhao Dingsheng Internal System). The application provides an admin interface for managing security guards, sites, and check-in records, with role-based access control (super admin vs regular admin).

**UI Framework**: Built with **shadcn/ui** components on Tailwind CSS v4 for modern, accessible, and professional user interface design.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compilation then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

### Testing and Quality Assurance
- **End-to-End Tests**: `npx playwright test` - 20+ comprehensive test scenarios in `tests/` directory
- **Run Single Test**: `npx playwright test [test-name].spec.ts`
- **Test UI Mode**: `npx playwright test --ui` for interactive test debugging
- **Run in Browser**: `npm run test:headed` - Watch tests run in browser
- **CI Tests**: `npm run test:ci` - Pre-push validation tests
- **Core Tests**: `npm run test:core` - TypeScript validation tests
- **Basic Tests**: `npm run test:basic` - Core functionality tests
- **Pre-push Check**: `npm run pre-push` - Full validation (lint + build + test:ci)
- **Type Checking**: TypeScript compilation occurs during build process
- **Error Boundaries**: Global error handling via `APIErrorBoundary` component

### Deployment Commands
- **Docker Build**: `docker build -t checkin-frontend:latest .`
- **Docker Compose**: `docker-compose up -d --build`
- **Production Deploy**: `./deploy.sh --update --clean`
- **Local Deploy**: `./deploy.sh`
- **Health Check**: Check `http://localhost:3000` after deployment

### shadcn/ui Commands

- **Add new components**: `npx shadcn@latest add [component-name]`
- **Initialize shadcn/ui**: `npx shadcn@latest init` (already configured)
- **List available components**: `npx shadcn@latest add`

## Architecture

### Core Technologies
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **React Router Dom** for client-side routing
- **React Query (TanStack Query v5)** for server state management
- **Axios** for HTTP client with interceptors
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** for modern, accessible UI components
- **React Leaflet** for map visualization
- **React Hook Form + Zod** for form validation
- **PostCSS** for CSS processing (required for Tailwind v4)
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
│   ├── login.tsx        # Login page (built with shadcn/ui)
│   └── layout.tsx       # Admin layout wrapper
├── api/             # API layer architecture
│   ├── client.ts        # Axios instance with interceptors
│   ├── interceptors.ts  # Request/response interceptors
│   ├── queryClient.ts   # React Query configuration
│   ├── queryKeys.ts     # Query key factory functions
│   ├── authApi.ts       # Authentication endpoints
│   ├── guardsApi.ts     # Guards CRUD operations
│   ├── sitesApi.ts      # Sites CRUD operations
│   ├── checkinsApi.ts   # Check-ins and analytics
│   └── index.ts         # Unified API exports
├── hooks/           # React Query hooks
│   ├── useAuth.ts       # Authentication hooks
│   ├── useGuards.ts     # Guards data hooks
│   ├── useSites.ts      # Sites data hooks
│   ├── useCheckIns.ts   # Check-ins data hooks
│   └── api/dashboard.ts # Dashboard analytics hooks
├── components/      # UI components
│   ├── ui/              # shadcn/ui components
│   ├── APIErrorBoundary.tsx  # Global error handling
│   ├── CheckinAnalytics.tsx  # Analytics widgets
│   └── CheckinMapView.tsx    # Geographic visualization
├── contexts/        # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── types/           # TypeScript definitions
│   ├── index.ts         # Core interfaces (Guard, Site, CheckInRecord)
│   └── schemas.ts       # Validation schemas
├── lib/             # Utility libraries
│   ├── utils.ts         # Tailwind class utilities (cn function)
│   └── react-query.ts   # React Query client setup
├── util/            # Application utilities
│   ├── auth.ts          # Authentication helpers
│   ├── config.ts        # Configuration (API base URL)
│   ├── request.ts       # HTTP request wrapper (legacy)
│   └── logger.ts        # Logging utilities
└── assets/          # Static assets
```

### Authentication & Authorization
- Token-based authentication stored in localStorage
- Two user roles: regular admin and super admin (`superAdmin` flag in localStorage)
- Protected routes with automatic redirection to login on authentication failure
- API requests automatically include Bearer token and handle 401 responses

### API Architecture

**Modern React Query + Axios Architecture**:
- **API Client**: `src/api/client.ts` - Configured axios instance with interceptors
- **Request/Response Interceptors**: `src/api/interceptors.ts` - Automatic auth headers, error handling, token refresh
- **React Query Integration**: `src/api/queryClient.ts` - Global cache configuration and error handling
- **Query Key Factory**: `src/api/queryKeys.ts` - Centralized query key management for cache invalidation
- **API Base URL**: `src/util/config.ts` - Uses empty string `''` to avoid double prefix, proxied to backend at localhost:8080 in dev

**Service Layer Pattern**:
- **authApi.ts**: Login, logout, token refresh, user management
- **guardsApi.ts**: CRUD operations for security guards
- **sitesApi.ts**: CRUD operations for security sites  
- **checkinsApi.ts**: Check-in records, dashboard analytics, reporting

**Custom Hooks Pattern**:
- **useAuth**: Authentication state, login/logout operations
- **useGuards**: Guards data with optimistic updates and cache management
- **useSites**: Sites data with relationship invalidation
- **useCheckIns**: Check-in records with real-time analytics

**Data Relationships**:
- **Guard ↔ Site**: One-to-one relationship (Guard.siteId → Site.id)
- **CheckInRecord**: References both guardId and siteId with location validation
- **Automatic Cache Invalidation**: Related data updates automatically invalidate dependent queries

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
- `AdminLayout`: Provides navigation sidebar and main content area (to be redesigned with shadcn/ui)
- Individual admin pages for CRUD operations on different entities

### shadcn/ui Component Usage
- **Login Page**: Already implemented with Card, Input, and Button components
- **Management Interface**: Use shadcn/ui components for consistent, professional UI:
  - **Tables**: Use Table, TableHeader, TableBody, TableRow, TableCell for data display
  - **Forms**: Use Form, FormField, FormItem, FormLabel, FormControl for user input
  - **Navigation**: Use Sheet or NavigationMenu for sidebar/navigation
  - **Dialogs**: Use Dialog, AlertDialog for modals and confirmations
  - **Buttons**: Use Button with variants (default, destructive, outline, secondary, ghost)
  - **Cards**: Use Card for content sections and dashboard widgets
  - **Inputs**: Use Input, Textarea, Select for form controls
  - **Feedback**: Use Alert, Toast for user notifications
  - **Layout**: Use Separator, Skeleton for spacing and loading states

## Tailwind CSS v4 + shadcn/ui Configuration

### Critical Setup Requirements

**IMPORTANT**: This project uses **Tailwind CSS v4** with **shadcn/ui**. The configuration is specific and must be maintained exactly as follows:

#### Required Files and Configuration:

1. **`postcss.config.js`** - **CRITICAL**: Required for Tailwind v4 processing
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

2. **`src/index.css`** - Tailwind v4 syntax with OKLCH colors
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  // ... other color mappings
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  // ... OKLCH format variables
}
```

3. **`tailwind.config.js`** - Minimal v4 configuration
```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
}
```

4. **`components.json`** - shadcn/ui configuration for v4
```json
{
  "tailwind": {
    "config": "",  // EMPTY for v4!
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  }
}
```

### Key Dependencies
- `tailwindcss@^4.1.8` - Tailwind CSS v4
- `@tailwindcss/postcss@^4.1.8` - PostCSS plugin for v4
- `tw-animate-css@^1.3.6` - Animation utilities for v4
- `tailwindcss-animate@^1.0.7` - Additional animations

### Troubleshooting
- If shadcn/ui components appear unstyled, ensure `postcss.config.js` exists
- Colors must be in OKLCH format, not HSL
- Config path in `components.json` must be empty for v4
- PostCSS plugin is required for Vite to process Tailwind v4

### Critical Configuration Issues

#### API Double Prefix Problem
**CRITICAL**: The `BASE_URL` in `src/util/config.ts` must be empty string `''` to prevent double `/api/api/` prefix:

```typescript
// CORRECT - prevents double prefix
export const BASE_URL = '';

// WRONG - causes /api/api/ double prefix error
export const BASE_URL = '/api';
```

**Why**: Vite proxy already adds `/api` prefix to requests, and backend endpoints include `/api` prefix. Setting BASE_URL to '/api' creates `/api/api/` paths that fail.

## CI/CD and Deployment Architecture

### GitHub Actions Pipeline
- **Triggered on**: Push to `main` branch and pull requests
- **CI Stage**: ESLint → TypeScript compilation → Build → Basic tests → Docker build
- **CD Stage**: SSH deployment to production server using `deploy.sh`
- **Artifacts**: Build artifacts uploaded for debugging

### Production Deployment
- **Container**: Docker with nginx serving static files
- **Port**: Exposed on port 3000 (container port 80)
- **Health Checks**: Automated health monitoring with retry logic
- **Domain**: https://duhaosecurity.com
- **Timezone**: Configured for Asia/Shanghai

### Deployment Script Features (`deploy.sh`)
- **Code Updates**: Automatic git pull with fallback strategies
- **Container Management**: Graceful stop/start with cleanup options
- **Health Monitoring**: Multi-endpoint health checks with detailed logging
- **Rollback Support**: Automatic cleanup on deployment failure
- **Usage**: `./deploy.sh [--update] [--clean]`

### Container Architecture
- **Multi-stage Build**: Node.js build → nginx production image
- **Base Image**: nginx:alpine for minimal footprint
- **Build Process**: npm ci → build → static file serving
- **Configuration**: React Router support with fallback to index.html

## Configuration Files
- `vite.config.ts`: Vite build configuration with path aliases and API proxy to localhost:8080
- `tailwind.config.js`: Minimal Tailwind CSS v4 configuration
- `postcss.config.js`: PostCSS configuration for Tailwind v4 processing
- `components.json`: shadcn/ui component configuration
- `tsconfig.json`: TypeScript project references
- `eslint.config.js`: ESLint configuration
- `playwright.config.ts`: E2E test configuration with auto-start dev server
- `Dockerfile`: Multi-stage build (Node.js 20 → nginx production)
- `nginx.conf`: Production nginx config with React Router support and caching
- `docker-compose.yml`: Container orchestration with health checks
- `deploy.sh`: Production deployment script with rollback capabilities
- `.github/workflows/deploy.yml`: CI/CD pipeline for automated testing and deployment

## Development Guidelines

### Adding New shadcn/ui Components
1. Install component: `npx shadcn@latest add [component-name]`
2. Import in your file: `import { ComponentName } from "@/components/ui/component-name"`
3. Use the `cn()` utility for class merging: `import { cn } from "@/lib/utils"`

### Code Quality Standards
- **ESLint**: Zero errors and warnings enforced (recently achieved perfect state)
- **TypeScript**: Strict type checking enabled, avoid `any` types (use `unknown` instead)
- **React Hooks**: Proper dependency arrays required, use `useCallback` for stable references
- **Fast Refresh**: Components and utilities properly separated for optimal development experience
- **Import Organization**: Consistent import ordering and absolute path usage via `@/` alias

### UI Design Principles
- **Consistency**: Use shadcn/ui components throughout the application
- **Accessibility**: shadcn/ui components are built with accessibility in mind
- **Theming**: Components automatically adapt to light/dark themes via CSS variables
- **Chinese Language**: Ensure all text content remains in Chinese
- **Professional Appearance**: Use semantic colors and proper spacing

### Component Implementation Examples
```tsx
// Card-based layout
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述文字</CardDescription>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
</Card>

// Form with validation
<Form>
  <FormField>
    <FormLabel>用户名</FormLabel>
    <FormControl>
      <Input placeholder="请输入用户名" />
    </FormControl>
  </FormField>
</Form>

// Data table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>姓名</TableHead>
      <TableHead>状态</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>张三</TableCell>
      <TableCell>在线</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Testing Strategy

### Test Categories
- **Basic Functionality**: Core login, navigation, and CRUD operations
- **Integration Tests**: Guard-site relationships, API interactions, data flow
- **Time Zone Tests**: Beijing time handling, date filtering, time display consistency
- **Performance Tests**: Dashboard metrics, checkin analytics, optimization validation
- **CI Tests**: Pre-push validation ensuring deployable state

### Key Test Files
- `basic-functionality.spec.ts`: Core application functionality
- `pre-push-check.spec.ts`: CI validation before deployment
- `typescript-fixes-core-validation.spec.ts`: Type safety verification
- `comprehensive-time-test.spec.ts`: Time zone and filtering validation
- `guard-site-relationship.spec.ts`: Business logic validation

### Test Configuration
- **Auto-start**: Development server automatically starts for tests
- **Mock Data**: Authentication bypass for testing with mock tokens
- **Time Zone**: Tests configured for Asia/Shanghai timezone
- **Browser**: Chromium headless for CI, headed mode available for debugging

## Critical Business Logic

### Guard-Site Relationship
- **One-to-One Constraint**: Each guard can only be assigned to ONE site (Guard.siteId)
- **Site Assignment**: Sites can have multiple guards (Site.assignedGuardIds array)
- **EmployeeId Auto-Generation**: Backend automatically generates employeeId - never manually input

### Check-In Validation Rules
- **Location Validation**: Check-ins must be within `Site.allowedRadiusMeters` of the site coordinates
- **Face Recognition**: All check-ins require face image verification (`faceImageUrl`)
- **Status Types**: `'success' | 'failed' | 'pending'` based on validation results

### API Response Patterns
```typescript
// Standard API Response Format
interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination?: PaginationResponse;
  message?: string;
  statistics?: CheckInStatistics;
}

// Paginated responses include statistics for current filter
interface CheckInStatistics {
  totalRecords: number;
  successCount: number;
  failedCount: number;
  successRate: number;
}
```

### React Query Patterns
```typescript
// Use custom hooks for all data operations
const { data: guards, isLoading } = useGuards({ siteId: selectedSiteId });
const createGuard = useCreateGuard();

// Mutations with optimistic updates and cache invalidation
const updateGuard = useUpdateGuard();
updateGuard.mutate({ guardId, updates: { name: 'New Name' } });

// Query keys follow hierarchical pattern
queryKeys.guards.lists() // All guard lists
queryKeys.guards.detail(guardId) // Specific guard
queryKeys.guards.bySite(siteId) // Guards for a site
```

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
