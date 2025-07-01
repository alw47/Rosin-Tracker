# Rosin Tracker - Full-Stack Cannabis Processing Application

## Overview

Rosin Tracker is a comprehensive full-stack web application designed for professional cannabis processing operations. The application enables users to track rosin press batches, monitor curing processes, and analyze production data through detailed charts and analytics. Built with modern web technologies, it features a React frontend with a Node.js/Express backend, PostgreSQL database integration, and a responsive design suitable for both web and future mobile deployment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Authentication**: Optional session-based authentication for self-hosting security

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless configuration
- **API Design**: RESTful endpoints following conventional patterns
- **Validation**: Zod schemas shared between frontend and backend
- **Authentication**: Express sessions with memory store for optional login protection
- **Security**: Environment-based password authentication with session management

### Development Environment
- **Hot Reload**: Vite dev server with HMR support
- **Error Handling**: Runtime error overlay for development
- **Type Safety**: Strict TypeScript configuration across the stack
- **Path Aliases**: Configured for clean imports (@/ for client, @shared/ for shared code)

## Key Components

### Database Schema
The application uses two primary tables:

**rosin_presses table**:
- Comprehensive batch tracking with fields for strain, material type, amounts, yields, temperature, pressure settings, micron bags, humidity, duration, and notes
- Support for image attachments stored as text arrays
- Automatic timestamp generation for press dates

**curing_logs table**:
- Linked to rosin press batches via foreign key relationship
- Tracks visual characteristics, aroma notes, consistency, and curing progress
- Supports image documentation of curing stages
- Cascade deletion when parent batch is removed

### API Endpoints
- **Rosin Press Operations**: Full CRUD operations with search, filtering, and pagination
- **Curing Log Management**: Batch-linked curing entries with comprehensive tracking
- **Analytics Endpoints**: Statistics, yield trends, and environment monitoring
- **Data Filtering**: Advanced filtering by strain, date ranges, yield thresholds, and press specifications

### User Interface Features
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Unit System Toggle**: Dynamic switching between metric and imperial units
- **Data Visualization**: Interactive charts for yield trends and environmental conditions
- **Image Upload**: Drag-and-drop image handling for batch documentation
- **Search and Filter**: Advanced filtering capabilities across all data types
- **Form Validation**: Real-time validation with user-friendly error messages
- **Backup & Restore**: Complete data export/import functionality with JSON format

### Units Context System
- **Global State**: Context provider for unit system preferences
- **Persistent Storage**: Local storage integration for user preferences
- **Dynamic Conversion**: Real-time conversion between metric and imperial units
- **Temperature Conversion**: Celsius to Fahrenheit conversion for press temperatures
- **Weight Conversion**: Grams to ounces conversion for material amounts

### Authentication System (Optional)
- **Self-Hosting Focus**: Designed for single-user self-hosted deployments
- **Environment-Based**: Enabled/disabled via AUTH_PASSWORD environment variable
- **Session Management**: Express sessions with secure cookie configuration
- **Protected Routes**: Middleware-based API route protection when enabled
- **Graceful Fallback**: Fully functional without authentication when disabled
- **UI Integration**: Login form, logout button, and loading states
- **Password-Based**: Simple password authentication suitable for personal use

## Data Flow

### Request Flow
1. User interactions trigger form submissions or data requests
2. React Query manages API calls with caching and background updates
3. Express routes handle requests with validation middleware
4. Drizzle ORM processes database operations with type safety
5. Responses flow back through the same chain with error handling

### State Management
- **Server State**: Managed by TanStack Query with automatic caching and synchronization
- **Client State**: React context for units, form state via React Hook Form
- **Persistent State**: Local storage for user preferences (unit system)

### Data Validation
- **Shared Schemas**: Zod schemas defined in shared directory for consistency
- **Frontend Validation**: Real-time form validation with React Hook Form
- **Backend Validation**: API endpoint validation using the same Zod schemas
- **Type Safety**: TypeScript ensures type consistency across the entire stack

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless with connection pooling
- **Authentication**: Ready for implementation (session-based architecture present)
- **File Handling**: Base64 image encoding for database storage
- **UI Components**: Radix UI for accessible, unstyled primitives
- **Charts**: Recharts for responsive data visualization

### Development Tools
- **Build System**: Vite with TypeScript and React plugins
- **Database Migration**: Drizzle Kit for schema management
- **Code Quality**: ESLint and TypeScript strict mode
- **Development Server**: Express with Vite middleware integration

## Deployment Strategy

### Manual Server Deployment (Primary)
- **Target Platform**: Debian/Ubuntu Linux systems
- **Automated Setup**: Custom installation script handles complete setup
- **Service Management**: Systemd service for automatic startup and monitoring
- **Database**: Local PostgreSQL installation with automated configuration
- **Web Server**: Optional Nginx reverse proxy with SSL support

### Production Build
- **Frontend**: Vite builds optimized static assets to dist/public
- **Backend**: esbuild bundles server code to dist/index.js
- **Database**: Drizzle migrations handle schema deployment
- **Environment**: Production configuration via environment variables

### Server Configuration
- **Static Files**: Express serves built frontend assets in production
- **Development Mode**: Vite middleware provides hot reload in development
- **Database Connection**: Local PostgreSQL with secure credentials
- **Process Management**: Systemd service with automatic restart
- **Security**: UFW firewall configuration and optional authentication

### Scalability Considerations
- **Database**: PostgreSQL with connection pooling
- **Caching**: TanStack Query provides client-side caching
- **API Design**: RESTful structure supports horizontal scaling
- **Monitoring**: Systemd logging and status monitoring

## Self-Hosting Configuration

### Environment Variables
The application uses environment variables for configuration. Create a `.env` file based on `.env.example`:

- **DATABASE_URL**: PostgreSQL connection string (required)
- **AUTH_PASSWORD**: Set to enable login protection, leave empty to disable authentication (optional)
- **SESSION_SECRET**: Random string for session security (recommended for production)

### Authentication Setup
Authentication is completely optional and designed for self-hosting security:

1. **Disabled (Default)**: Leave `AUTH_PASSWORD` unset or empty - application runs without login
2. **Enabled**: Set `AUTH_PASSWORD=your-secure-password` to require login before accessing the app
3. **Logout**: When enabled, a logout button appears in the sidebar

### Production Deployment
- Set secure session secrets and enable HTTPS for production
- Authentication protects all API routes when enabled
- Sessions persist for 24 hours with automatic cleanup

## Changelog

```
Changelog:
- June 30, 2025. Initial setup
- June 30, 2025. Enhanced micron bag system to be custom-only with smart learning from usage patterns
- June 30, 2025. Added unit conversion for micron bag dimensions (inches/mm) integrated with units toggle
- June 30, 2025. Implemented dark mode theme with toggle in sidebar
- June 30, 2025. Added optional authentication system for self-hosting security with environment-based configuration
- June 30, 2025. Added comprehensive Settings page with authentication and 2FA management
- June 30, 2025. Integrated custom Rosin Logger logo throughout the application
- June 30, 2025. Removed Docker support due to Node.js compatibility issues, implemented comprehensive manual setup
- June 30, 2025. Created automated installation script for Debian/Ubuntu systems with systemd service integration
- June 30, 2025. Added complete manual setup documentation with Nginx reverse proxy and SSL support
- June 30, 2025. Fixed critical Node.js 18 compatibility issues (import.meta.dirname and server.listen format)
- June 30, 2025. Resolved GitHub ZIP extraction case sensitivity and PostgreSQL authentication problems
- June 30, 2025. Created comprehensive working installation script with all fixes integrated
- June 30, 2025. Successful deployment on Debian/Ubuntu systems with one-liner installation command
- July 1, 2025. Unified analytics dashboard with integrated advanced features replacing separate pages
- July 1, 2025. Applied consistent tooltip styling across all charts for unified user experience
- July 1, 2025. Set metric system as default throughout the application (Celsius, grams, bar)
- July 1, 2025. Fixed temperature display formatting to show proper unit symbols (°C instead of °°C)
- July 1, 2025. Set dark theme as default application theme
- July 1, 2025. Improved settings page layout with properly aligned toggle switches and consistent spacing
- July 1, 2025. Added comprehensive start material filtering to analytics dashboard for yield comparison
- July 1, 2025. Updated Recent Batches line separators to green color matching application theme
- July 1, 2025. Cleaned up file structure for production readiness - removed unused files and components
- July 1, 2025. Replaced logo assets with TestTube icons throughout application for cleaner deployment
- July 1, 2025. Streamlined README.md for production-ready documentation
- July 1, 2025. Restored custom Rosin Logger logo to production version in sidebar and login page
- July 1, 2025. Implemented comprehensive backup and restore functionality with JSON export/import in settings page
- July 1, 2025. Implemented comprehensive curing reminder system with scheduled notifications, dashboard alerts, and batch management
- July 1, 2025. Fixed duplicate micron bag sizes with normalization and automatic cleanup in frequently used suggestions
- July 1, 2025. Enhanced bell icon on dashboard with functional notification dropdown showing overdue curing reminders
- July 1, 2025. Reorganized batch details page layout - moved curing logs section above reminders section for better accessibility
- July 1, 2025. Enhanced backup and restore solution to include curing reminders (previously missing critical data)
- July 1, 2025. Updated backup format to version 1.1 with complete data coverage for all three main tables
- July 1, 2025. Confirmed dark theme and metric system are already set as application defaults
- July 1, 2025. Fixed critical micron bag formatting issue - now stores raw dimensions without units for better reliability
- July 1, 2025. Changed default temperature from 180°F to 90°C for more practical rosin pressing operations
- July 1, 2025. Project prepared for initial GitHub release with cleaned documentation and stable feature set
- July 1, 2025. Added comprehensive multi-strain support for hash made from different cannabis varieties
- July 1, 2025. Enhanced form validation to allow 0 values as N/A indicators for equipment measurements
- July 1, 2025. Fixed installation script with proper fresh/update modes and environment variable handling
- July 1, 2025. CRITICAL FIX: Resolved database clearing bug in installation script --update mode that was destroying existing data
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```