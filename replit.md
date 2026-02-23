# AI Course Builder

## Overview

AI Course Builder is a SaaS application that enables creators to instantly generate comprehensive online courses using AI (Google Gemini). Creators can transform any topic into a full multi-module, multi-lesson course structure with detailed educational content. The platform supports both free and paid courses, integrates with Whop for authentication and access management, and provides two distinct user experiences: a creator dashboard for course management and a member experience for course consumption.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- React with TypeScript for type safety
- Wouter for lightweight client-side routing
- Vite as the build tool and development server

**UI Component System:**
- Shadcn/ui component library (New York style variant)
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management

**State Management:**
- TanStack Query (React Query) for server state management and caching
- React Context for theme management and authentication state
- Local component state for UI interactions

**Design System:**
- Custom color system with HSL-based tokens supporting light/dark themes
- Consistent spacing using Tailwind's 4/6/8/12/16 unit scale
- Typography hierarchy with Inter font for UI and system fonts for content
- Responsive grid patterns for course cards and dashboard layouts

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- Custom middleware for Whop authentication and access control
- Session-based authentication flow

**API Design:**
- RESTful endpoints organized by resource type
- Two main API sections:
  - `/api/dashboard/:companyId/*` - Creator management endpoints
  - `/api/experiences/:experienceId/*` - Member consumption endpoints
- Request/response authentication using Whop user tokens in headers

**Database Layer:**
- MongoDB Atlas cloud database
- Mongoose ODM for schema definitions and queries
- Environment variable: `MONGODB_URI`
- Schema-first design with TypeScript interfaces

**Data Models:**
- Users (creators and members with role-based differentiation)
- Courses (with published status, pricing, and creator association)
- Modules (ordered sections within courses)
- Lessons (ordered content units within modules)
- Course Access (junction table for user-course permissions)

**AI Integration:**
- Google Gemini models for course content generation with automatic fallback
- Primary model: gemini-2.5-pro (Pro quality)
- Fallback models: gemini-2.5-flash, gemini-2.5-flash-lite (automatic fallback on errors/overload)
- Google Search grounding enabled for real-time information access and citations
- Automatic web searches for current trends, methodologies, and recent developments
- Structured JSON output parsing for course curriculum
- Support for full course generation and selective module/lesson regeneration
- Prompt engineering to ensure consistent, educational, and up-to-date content output
- Reduced hallucinations through grounded search results
- Robust error handling with transparent model fallback logging

### Authentication & Authorization

**Whop Integration:**
- OAuth-style token verification using Whop SDK
- User token passed via `x-whop-user-token` header
- Automatic user creation on first authentication
- Access level checking (admin/customer/no_access) for resource-based permissions

**Access Control Patterns:**
- Creator routes validate company ownership
- Member routes check course access via Whop or manual grants
- Free courses allow automatic access
- Paid courses require Whop purchase verification or manual access grants

### Build & Deployment

**Build Process:**
- Separate client and server builds
- Client: Vite builds React app to `dist/public`
- Server: esbuild bundles Express app with selective dependencies to `dist/index.cjs`
- Production mode serves static client files from Express

**Development Environment:**
- Vite dev server with HMR for client
- tsx for TypeScript execution in development
- Middleware mode integration between Vite and Express
- Development-only features: Replit plugins for debugging and cartography

## External Dependencies

### Third-Party Services

**Whop Platform:**
- Primary authentication provider
- Access management and purchase verification
- User profile data (username, email, profile picture)
- Company/experience resource management

**Google AI (Gemini):**
- Course content generation API
- Model: gemini-2.5-flash with Google Search grounding
- Google Search grounding for real-time information access
- Searches for latest methodologies, trends, and current developments
- JSON-structured curriculum output with up-to-date content
- Educational content creation with examples and tips
- Automatic search query execution for factual accuracy

### Database

**MongoDB Atlas:**
- Cloud-hosted MongoDB database
- Mongoose ODM for data modeling
- Environment variable: `MONGODB_URI`

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI components (20+ component primitives)
- `tailwindcss` - Utility-first CSS framework
- `wouter` - Lightweight routing
- `react-hook-form` + `zod` - Form validation
- `date-fns` - Date manipulation

**Backend:**
- `@whop/sdk` - Whop platform integration
- `@google/genai` - Google Gemini AI client
- `mongoose` - MongoDB ODM
- `express` - HTTP server framework

**Development:**
- `vite` - Build tool and dev server
- `tsx` - TypeScript execution
- `esbuild` - Server bundler

### Environment Variables Required

- `MONGODB_URI` - MongoDB Atlas connection string
- `WHOP_API_KEY` - Whop platform API key
- `GEMINI_API_KEY` - Google AI API key