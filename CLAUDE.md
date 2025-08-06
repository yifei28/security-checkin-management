# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for a check-in management system. The application provides an admin interface for managing security guards, sites, and check-in records, with role-based access control (super admin vs regular admin).

**UI Framework**: Built with **shadcn/ui** components on Tailwind CSS v4 for modern, accessible, and professional user interface design.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compilation then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

### shadcn/ui Commands

- **Add new components**: `npx shadcn@latest add [component-name]`
- **Initialize shadcn/ui**: `npx shadcn@latest init` (already configured)
- **List available components**: `npx shadcn@latest add`

## Architecture

### Core Technologies
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **React Router Dom** for client-side routing
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** for modern, accessible UI components
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
├── components/      # shadcn/ui components
│   └── ui/              # Generated shadcn/ui components
│       ├── button.tsx       # Button component
│       ├── card.tsx         # Card component
│       ├── input.tsx        # Input component
│       └── ...              # Other shadcn/ui components
├── lib/             # Utility libraries
│   └── utils.ts         # Tailwind class utilities (cn function)
├── util/            # Application utilities
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

## Configuration Files
- `vite.config.ts`: Vite build configuration with path aliases
- `tailwind.config.js`: Minimal Tailwind CSS v4 configuration
- `postcss.config.js`: PostCSS configuration for Tailwind v4 processing
- `components.json`: shadcn/ui component configuration
- `tsconfig.json`: TypeScript project references
- `eslint.config.js`: ESLint configuration

## Development Guidelines

### Adding New shadcn/ui Components
1. Install component: `npx shadcn@latest add [component-name]`
2. Import in your file: `import { ComponentName } from "@/components/ui/component-name"`
3. Use the `cn()` utility for class merging: `import { cn } from "@/lib/utils"`

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

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
